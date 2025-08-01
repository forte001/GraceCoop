from rest_framework import serializers
from gracecoop.models import (
    User, 
    MemberProfile, 
    Loan, 
    LoanCategory,
    LoanApplication,
    DisbursementLog,
    LoanRepayment,
    LoanRepaymentSchedule,
    Payment, 
    Contribution,
    Levy,
    CooperativeConfig,
    Announcement,
    Expense,
    LoanGuarantor,
    MemberDocument,
    DocumentRequest)
from datetime import datetime, timedelta
from django.utils import timezone
from .utils import create_member_profile_if_not_exists, generate_payment_reference, upload_document_to_supabase
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth.models import Permission, Group
import pyotp
from decimal import Decimal
from django.db.models import Sum
from django.conf import settings
import uuid
import logging




# =======================
# USER REGISTRATION & LOGIN
# =======================
class UserRegistrationSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(write_only=True, required=False)
    phone_number = serializers.CharField(write_only=True, required=False)
    address = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'full_name', 'phone_number', 'address']
        extra_kwargs = {
            'password': {'write_only': True, 'min_length': 8},
        }
    
    def validate_email(self, value):
        """
        Ensure email is unique across User table
        """
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def create(self, validated_data):
        # Extract optional profile fields (won’t raise KeyError if not present)
        full_name = validated_data.pop('full_name', '')
        phone_number = validated_data.pop('phone_number', '')
        address = validated_data.pop('address', '')

        # Create the user
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            role='member'
        )

        # Create an empty but valid profile (can be updated later)
        MemberProfile.objects.get_or_create(
            user=user,
            defaults={
                'full_name': full_name or user.username,
                'email': user.email or '',
                'phone_number': phone_number,
                'address': address,
                'status': 'pending',
                'membership_status': 'inactive',
            }
        )

        return user


### Membership approval serializer
class PendingMemberSerializer(serializers.ModelSerializer):
    has_completed_payments = serializers.SerializerMethodField()

    class Meta:
        model = MemberProfile
        fields = [
            'id',
            'full_name',
            'email',
            'phone_number',
            'status',
            'has_paid_shares',
            'has_paid_levy',
            'has_completed_payments',
        ]

    def get_has_completed_payments(self, obj):
        return obj.has_paid_shares and obj.has_paid_levy



class UserLoginSerializer(serializers.Serializer):
    login_id = serializers.CharField(required=True)  # Can be username or member_id
    password = serializers.CharField(write_only=True, required=True)

    def validate(self, attrs):
        login_id = attrs.get('login_id')
        password = attrs.get('password')

        user = None
        profile = None

        # 🔍 Attempt login via username
        try:
            user = User.objects.get(username=login_id)
            if not user.check_password(password):
                raise serializers.ValidationError("Invalid password.")
        except User.DoesNotExist:
            # 🔍 Attempt login via approved member ID
            try:
                profile = MemberProfile.objects.get(member_id=login_id, status='approved')
                user = profile.user
                if not user.check_password(password):
                    raise serializers.ValidationError("Invalid password.")
            except MemberProfile.DoesNotExist:
                raise serializers.ValidationError("Invalid credentials or member not approved.")

        # ✅ Ensure profile exists (or create it)
        if not profile:
            try:
                profile = create_member_profile_if_not_exists(user)
            except Exception as e:
                raise serializers.ValidationError(f"Profile creation failed: {str(e)}")

        attrs['user'] = user
        attrs['profile'] = profile
        return attrs
    
class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'role']

class MemberProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = MemberProfile
        fields = [
            'id', 'title', 'user', 'full_name', 'email', 'phone_number',
            'address', 'joined_on', 'status', 'membership_status', 'member_id',
            'has_paid_shares', 'has_paid_levy', 'next_of_kin','next_of_kin_relationship',
            'next_of_kin_phone', 'next_of_kin_address'
        ]
        read_only_fields = [
            'id', 'user', 'email', 'joined_on', 'status',
            'member_id', 'has_paid_shares', 'has_paid_levy',
        ]

# =======================
# ADMIN LOGIN
# =======================
class AdminLoginSerializer(serializers.Serializer):
    login_id = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        login_id = attrs.get("login_id")
        password = attrs.get("password")

        try:
            user = User.objects.get(username=login_id)
        except User.DoesNotExist:
            raise serializers.ValidationError("Invalid credentials or not an admin.")

        if not user.check_password(password):
            raise serializers.ValidationError("Invalid credentials.")

        if not user.is_staff:
            user_group_names = user.groups.values_list('name', flat=True)
            if not any(name.lower() in ['admin', 'staff'] for name in user_group_names):
                raise serializers.ValidationError("User does not have admin access.")


        attrs["user"] = user
        return attrs
    
############################################################
### New serializer for new 2FA setup logic
############################################################
class TwoFASetupSerializer(serializers.Serializer):
    totp_uri = serializers.SerializerMethodField()

    def get_totp_uri(self, obj):
        user = self.context["request"].user

        # Generate or retrieve the user's OTP secret if not already set
        if not user.otp_secret:
            user.otp_secret = user.generate_otp_secret()  # Assuming generate_otp_secret() is a method that creates a secret
            user.save()

        # Create the TOTP object using the OTP secret
        totp = pyotp.TOTP(user.otp_secret)

        # Generate the provisioning URI for the QR code
        uri = totp.provisioning_uri(name=user.email, issuer_name="GraceCoop Admin")

        return uri



class TwoFASetupVerifySerializer(serializers.Serializer):
    otp = serializers.CharField()

    def validate(self, attrs):
        otp = attrs.get('otp')
        user = self.context['request'].user

        if not user.otp_secret:
            raise serializers.ValidationError("2FA is not initialized for this user.")

        # Verify OTP against the user's secret
        totp = pyotp.TOTP(user.otp_secret)
        if not totp.verify(otp):
            raise serializers.ValidationError("Invalid OTP code.")

        # Mark the user as having 2FA enabled
        user.is_2fa_enabled = True
        user.save()

        return attrs

class TwoFAVerifyLoginSerializer(serializers.Serializer):
    user_id = serializers.IntegerField()
    otp = serializers.CharField()

    def validate(self, attrs):
        user_id = attrs.get("user_id")
        otp = attrs.get("otp")

        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            raise serializers.ValidationError("User not found.")

        # Ensure the user has 2FA enabled
        if not user.is_2fa_enabled or not user.otp_secret:
            raise serializers.ValidationError("2FA is not enabled for this user.")

        # Verify the OTP
        totp = pyotp.TOTP(user.otp_secret)
        if not totp.verify(otp):
            raise serializers.ValidationError("Invalid OTP.")

        attrs["user"] = user
        return attrs
 
class Toggle2FASerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["is_2fa_enabled"]
        read_only_fields = ["is_2fa_enabled"]

class Verify2FASerializer(serializers.Serializer):
    user_id = serializers.IntegerField()
    otp = serializers.CharField()

    def validate(self, attrs):
        user_id = attrs["user_id"]
        otp = attrs["otp"]

        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            raise serializers.ValidationError("User not found.")

        if not user.is_2fa_enabled or not user.otp_secret:
            raise serializers.ValidationError("2FA not set up.")

        totp = pyotp.TOTP(user.otp_secret)
        if not totp.verify(otp):
            raise serializers.ValidationError("Invalid or expired OTP.")

        attrs["user"] = user
        return attrs

#############################################################
class RecentPaymentSerializer(serializers.ModelSerializer):
    status = serializers.SerializerMethodField()
    paid_date = serializers.DateTimeField(source="created_at")

    class Meta:
        model = Payment
        fields = ['id', 'amount', 'payment_type', 'status', 'paid_date', 'reference']

    def get_status(self, obj):
        return "complete" if obj.verified else "pending"
    
### Admin Dashboard stats serializer
class AdminDashboardStatsSerializer(serializers.Serializer):
    total_members = serializers.IntegerField()
    pending_members = serializers.IntegerField()
    total_payments = serializers.DecimalField(max_digits=12, decimal_places=2)
    recent_payments = RecentPaymentSerializer(many=True)
    period = serializers.IntegerField()


## Serializer for listing pending approvals
class PendingApprovalSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = MemberProfile
        fields = [
            'id', 'user', 'full_name', 'email', 'phone_number',
            'has_paid_shares', 'has_paid_levy',
            'membership_status', 'member_id'
        ]
        
### Admin Token pair serializer
class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)

        # Add custom claims
        token['is_admin'] = user.is_staff  # or user.is_superuser

        return token
    
### Serializer for approving members
class MemberApprovalSerializer(serializers.ModelSerializer):
    class Meta:
        model = MemberProfile
        fields = [
            'id', 'status', 'membership_status',
            'has_paid_shares', 'has_paid_levy', 'member_id'
        ]

    def validate_status(self, value):
        if value != 'approved':
            raise serializers.ValidationError("Only 'approved' status is allowed via this endpoint.")
        return value

    def update(self, instance, validated_data):
        if not instance.has_paid_shares or not instance.has_paid_levy:
            raise serializers.ValidationError(
                "Shares and development levy must be paid before approval."
            )

        # Assign member ID if not already assigned
        if not instance.member_id:
            year = datetime.now().year
            last_member = MemberProfile.objects.filter(
                member_id__startswith=f"GC-{year}"
            ).order_by('-id').first()

            next_serial = 1
            if last_member and last_member.member_id:
                try:
                    last_serial = int(last_member.member_id.split('-')[-1])
                    next_serial = last_serial + 1
                except (IndexError, ValueError):
                    pass

            instance.member_id = f"GC-{year}-{next_serial:05d}"

        instance.status = validated_data.get('status', instance.status)
        instance.membership_status = validated_data.get('membership_status', 'active')

        config = instance.applied_config or CooperativeConfig.objects.filter(status='active').first()
        if config:
            instance.applied_config = config  # Ensure config is attached

            Contribution.objects.create(
                member=instance,
                amount=config.entry_shares_amount
            )
            instance.has_paid_shares = True

            Levy.objects.create(
                member=instance,
                amount=config.development_levy_amount
            )

        instance.save()
        return instance
    
class AdminMemberProfileEditSerializer(serializers.ModelSerializer):
    class Meta:
        model = MemberProfile
        fields = ['full_name', 'phone_number', 'address', 'membership_status']

class CooperativeConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = CooperativeConfig
        fields = '__all__'

    def validate(self, data):
        status = data.get('status', self.instance.status if self.instance else None)
        if status == 'active':
            qs = CooperativeConfig.objects.filter(status='active')
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError("Only one active configuration is allowed.")
        return data

# =======================
# LOAN
# =======================
class LoanCategorySerializer(serializers.ModelSerializer):
    is_used = serializers.SerializerMethodField()

    class Meta:
        model = LoanCategory
        fields = '__all__'
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']

    def get_is_used(self, obj):
        has_loans = obj.loan_set.exists()
        has_applications = obj.loanapplication_set.exists()
        return has_loans or has_applications
    
    def update(self, instance, validated_data):
        if self.get_is_used(instance):
            # allow only description and status to be changed
            allowed_fields = ['description', 'status']
            for field in list(validated_data.keys()):
                if field not in allowed_fields:
                    validated_data.pop(field)
        return super().update(instance, validated_data)    

    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)
    
class LoanGuarantorSerializer(serializers.ModelSerializer):
    # Guarantor details
    guarantor_name = serializers.CharField(source='guarantor.full_name', read_only=True)
    guarantor_id = serializers.CharField(source='guarantor.member_id', read_only=True)
    guarantor_phone = serializers.CharField(source='guarantor.phone_number', read_only=True)
    
    # Application details 
    applicant = serializers.CharField(source='application.applicant.get_full_name', read_only=True)
    applicant_member_id = serializers.SerializerMethodField()
    amount = serializers.DecimalField(source='application.amount', max_digits=10, decimal_places=2, read_only=True)
    application_id = serializers.IntegerField(source='application.id', read_only=True)
    submitted_on = serializers.DateTimeField(source='application.application_date', read_only=True)
    loan_category = serializers.CharField(source='application.category.name', read_only=True)
    repayment_months = serializers.IntegerField(source='application.repayment_months', read_only=True)
    interest_rate = serializers.DecimalField(source='application.interest_rate', max_digits=5, decimal_places=2, read_only=True)
    
    # Status fields
    status = serializers.CharField(source='consent_status', read_only=True)
    responded_on = serializers.DateTimeField(source='response_date', read_only=True)
    
    # Enhanced time-based fields
    days_pending = serializers.SerializerMethodField()
    is_long_pending = serializers.SerializerMethodField()
    can_be_replaced = serializers.SerializerMethodField()
    
    class Meta:
        model = LoanGuarantor
        fields = [
            'id', 'guarantor', 'guarantor_name', 'guarantor_id', 'guarantor_phone',
            'created_at', 'consent_status', 'response_date', 'rejection_reason',
            'applicant', 'applicant_member_id', 'amount', 'application_id', 
            'submitted_on', 'loan_category', 'repayment_months', 'interest_rate',
            'status', 'responded_on',
            # Enhanced time-based fields
            'days_pending', 'is_long_pending', 'can_be_replaced'
        ]
        read_only_fields = [
            'created_at', 'response_date', 'days_pending', 'is_long_pending', 
            'can_be_replaced', 'status', 'responded_on'
        ]
    def get_applicant_member_id(self, obj):
        """Get the applicant's member ID, handling cases where memberprofile might not exist"""
        applicant = obj.application.applicant
        
        if hasattr(applicant, 'memberprofile'):
            try:
                member_profile = applicant.memberprofile
                return member_profile.member_id
            except Exception as e:
                print(f"DEBUG: Exception getting memberprofile: {e}")
                return None
        else:
            print("DEBUG: Applicant has no memberprofile attribute")
            return None
    def get_days_pending(self, obj):
        """Get the number of days this guarantor has been pending"""
        return obj.days_pending
    
    def get_is_long_pending(self, obj):
        """Check if this guarantor has been pending for more than 7 days"""
        return obj.is_long_pending
    
    def get_can_be_replaced(self, obj):
        """Check if this guarantor can be replaced"""
        return obj.can_be_replaced
    
    def validate_consent_status(self, value):
        """Validate consent status changes"""
        if self.instance and self.instance.consent_status != 'pending' and value == 'pending':
            raise serializers.ValidationError("Cannot change status back to pending once decided.")
        return value
    
    def validate(self, data):
        """Cross-field validation"""
        consent_status = data.get('consent_status')
        rejection_reason = data.get('rejection_reason')
        
        # If rejecting, ensure rejection reason is provided
        if consent_status == 'rejected' and not rejection_reason:
            raise serializers.ValidationError({
                'rejection_reason': 'Rejection reason is required when rejecting a guarantor request.'
            })
        
        # If approving, clear any rejection reason
        if consent_status == 'approved':
            data['rejection_reason'] = None
        
        return data
    


class DisbursementLogSerializer(serializers.ModelSerializer):
    loan_reference = serializers.CharField(source='loan.reference', read_only=True)
    disbursed_by_name = serializers.SerializerMethodField()
    requested_by_name = serializers.SerializerMethodField()
    receipt_url = serializers.SerializerMethodField()
    receipt = serializers.FileField(write_only=True, required=False)


    class Meta:
        model = DisbursementLog
        fields = [
            'id',
            'amount',
            'repayment_months',
            'disbursed_by_name',
            'loan_reference',
            'disbursed_at',
            'requested_by_name',
            'receipt_url',
            'receipt'
        ]

    def get_disbursed_by_name(self, obj):
        user = obj.disbursed_by
        if not user:
            return "N/A"
        full_name = f"{user.first_name} {user.last_name}".strip()
        return full_name if full_name else user.username
    
    def get_requested_by_name(self, obj):
        member_user = getattr(obj.loan.member, "user", None)
        if member_user:
            full_name = f"{member_user.first_name} {member_user.last_name}".strip()
            return full_name if full_name else member_user.username
        return "N/A"
  
    def get_receipt_url(self, obj):
        request = self.context.get('request')
        if obj.receipt_url:
            return obj.receipt_url
        elif obj.receipt and request:
            return request.build_absolute_uri(obj.receipt.url)
        return None


class LoanSerializer(serializers.ModelSerializer):
    disbursements = DisbursementLogSerializer(many=True, read_only=True)
    disbursements_remaining = serializers.SerializerMethodField()
    applicant_name = serializers.SerializerMethodField()
    category_name = serializers.CharField(source='category.name', read_only=True)
    approval_date = serializers.DateTimeField(source='approved_at', read_only=True)
    total_paid = serializers.SerializerMethodField()
    grace_period_months = serializers.SerializerMethodField()
    guarantors = serializers.SerializerMethodField()

    class Meta:
        model = Loan
        fields = [
            'id', 'member', 'applicant_name', 'category', 'category_name', 'amount',
            'interest_rate', 'duration_months', 'status', 'repayment_start_date',
            'start_date', 'end_date', 'first_due_date', 'approved_by',
            'approval_date', 'approved_at', 'disbursed_by', 'disbursed_at',
            'total_repayment_months', 'grace_period_months', 'grace_applied',
            'reference', 'disbursements', 'disbursements_remaining', 'total_paid',
            'guarantors'
        ]
        read_only_fields = [
            'interest_rate', 'duration_months', 'start_date', 'end_date',
            'first_due_date', 'approved_by', 'approved_at', 'disbursed_by',
            'disbursed_at', 'total_repayment_months', 'grace_period_months',
            'grace_applied', 'reference', 'total_paid'
        ]

    def get_guarantors(self, obj):
        # Get guarantors from the loan's guarantors relationship
        guarantors = obj.guarantors.all()
        return LoanGuarantorSerializer(guarantors, many=True).data

    def get_applicant_name(self, obj):
        return obj.member.user.get_full_name() if obj.member and obj.member.user else ''

    def get_disbursements_remaining(self, obj):
        disbursed = obj.disbursements.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        return float(obj.amount - disbursed)

    def get_total_paid(self, obj):
        total_paid = LoanRepayment.objects.filter(loan=obj).aggregate(total=Sum('amount'))['total']
        return float(total_paid or 0.00)

    def get_grace_period_months(self, obj):
        return obj.category.grace_period_months if obj.category else None

class LoanCategorySummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = LoanCategory
        fields = ['id', 'name', 'interest_rate']
   
class LoanApplicationSerializer(serializers.ModelSerializer):
    applicant_name = serializers.CharField(source='applicant.get_full_name', read_only=True)
    category = LoanCategorySummarySerializer(read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=LoanCategory.objects.all(), write_only=True, source='category'
    )
    guarantors = LoanGuarantorSerializer(many=True, required=False)
    guarantor_summary = serializers.SerializerMethodField()

    class Meta:
        model = LoanApplication
        fields = [
            'id', 'applicant_name', 'category', 'category_id', 'amount', 'interest_rate',
            'repayment_months', 'status', 'application_date', 'approved_by', 'approval_date',
            'guarantors', 'guarantor_summary', 'rejection_reason'
        ]
        read_only_fields = ['applicant_name', 'status', 'application_date', 'approved_by', 'approval_date']

    def get_guarantor_summary(self, obj):
        """Return summary of guarantor statuses"""
        total_guarantors = obj.guarantors.count()
        approved_guarantors = obj.guarantors.filter(consent_status='approved').count()
        rejected_guarantors = obj.guarantors.filter(consent_status='rejected').count()
        pending_guarantors = obj.guarantors.filter(consent_status='pending').count()
        
        # Time-based logic for long-pending guarantors
        cutoff_date = timezone.now() - timedelta(days=7)  # 7 days timeout
        long_pending_guarantors = obj.guarantors.filter(
            consent_status='pending',
            created_at__lt=cutoff_date
        ).count()
        
        return {
            'total': total_guarantors,
            'approved': approved_guarantors,
            'rejected': rejected_guarantors,
            'pending': pending_guarantors,
            'long_pending': long_pending_guarantors,
            'all_approved': approved_guarantors == total_guarantors and total_guarantors >= 2,
            'has_rejections': rejected_guarantors > 0,
            'can_replace_some': (rejected_guarantors + long_pending_guarantors) > 0 and obj.status in ['pending', 'rejected']
        }

    def validate_category(self, category):
        if category.status in ['inactive', 'archived']:
            raise serializers.ValidationError("This loan category is not available for applications.")
        return category

    def validate_guarantors_data(self, guarantors_data, user):
        """Centralized guarantor validation method"""
        if len(guarantors_data) < 2:
            raise serializers.ValidationError("You must provide at least two guarantors.")

        valid_guarantors = []
        for entry in guarantors_data:
            member_id = entry.get('guarantor')
            try:
                guarantor = MemberProfile.objects.get(id=member_id)
            except MemberProfile.DoesNotExist:
                raise serializers.ValidationError(f"Guarantor with ID {member_id} does not exist.")
            
            if guarantor.user == user:
                raise serializers.ValidationError("You cannot be your own guarantor.")
            
            if guarantor.status != 'approved':
                raise serializers.ValidationError(f"{guarantor.full_name} is not an approved member.")
            
            valid_guarantors.append(guarantor)
        
        # Check for duplicate guarantors
        guarantor_ids = [g.id for g in valid_guarantors]
        if len(guarantor_ids) != len(set(guarantor_ids)):
            raise serializers.ValidationError("Duplicate guarantors are not allowed.")
        
        return valid_guarantors

    def validate(self, data):
        user = self.context['request'].user
        requested_amount = data.get('amount')

        # Check for active loans
        # active_loans = Loan.objects.filter(
        #     member=user.memberprofile,
        #     status__in=['approved', 'disbursed', 'partially_disbursed']
        # )
        # if active_loans.exists():
        #     raise serializers.ValidationError("You cannot apply for a new loan while an active loan exists.")

        # Cap loan amount to 3x contributions
        total_contributions = (
            user.memberprofile.contributions.aggregate(total=Sum('amount'))['total'] or 0
        )
        max_loan_amount = total_contributions * 3

        if requested_amount > max_loan_amount:
            raise serializers.ValidationError(
                f"Requested amount exceeds allowed limit. "
                f"Maximum allowed is 3× contributions (₦{max_loan_amount:,.2f})."
            )

        # Validate guarantors using centralized method
        guarantors_raw = self.initial_data.get('guarantors', [])
        self.validate_guarantors_data(guarantors_raw, user)

        return data

    def create(self, validated_data):
        guarantors_data = self.initial_data.get('guarantors', [])
        category = validated_data.get('category')
        user = self.context['request'].user

        # Remove conflicting fields to avoid TypeError
        for field in ['applicant', 'interest_rate', 'loan_period_months', 'guarantors']:
            validated_data.pop(field, None)

        application = LoanApplication.objects.create(
            applicant=user,
            interest_rate=category.interest_rate,
            loan_period_months=category.loan_period_months,
            **validated_data
        )

        # Save guarantors explicitly
        for entry in guarantors_data:
            LoanGuarantor.objects.create(
                application=application,
                guarantor_id=entry['guarantor'],
                consent_status='pending'
            )

        return application

    def update(self, instance, validated_data):
        guarantors_data = self.initial_data.get('guarantors', None)
        user = self.context['request'].user

        # 🚫 Prevent accidental reverse side assignment
        validated_data.pop('guarantors', None)

        # Only allow updates for pending applications
        if instance.status not in ['pending', 'rejected']:
            raise serializers.ValidationError("Only pending or rejected applications can be updated.")

        # Validate guarantors if they're being updated
        if guarantors_data is not None:
            self.validate_guarantors_data(guarantors_data, user)

        # Safe update
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Update guarantors if provided
        if guarantors_data is not None and instance.status in ['pending', 'rejected']:
            # Clear and re-add guarantors
            instance.guarantors.all().delete()
            for entry in guarantors_data:
                LoanGuarantor.objects.create(
                    application=instance,
                    guarantor_id=entry['guarantor'],
                    consent_status='pending'
                )

        return instance


class GuarantorOptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = MemberProfile
        fields = ['id', 'full_name', 'member_id']
    
                
    
class RepaymentSerializer(serializers.ModelSerializer):
    loan_reference = serializers.SerializerMethodField()
    paid_by_name = serializers.SerializerMethodField()
    member_name = serializers.SerializerMethodField()
    due_date = serializers.SerializerMethodField()

    class Meta:
        model = LoanRepayment
        fields = [
            'id', 'loan', 'amount', 'principal_component', 'interest_component',
            'paid_by_name', 'payment_date', 'recorded_at', 'was_late',
            'member_name', 'loan_reference', 'due_date', 'source_reference'
        ]
        read_only_fields = [
            'id', 'loan', 'recorded_at', 'paid_by', 'was_late',
            'principal_component', 'interest_component'
        ]

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Repayment amount must be greater than zero.")
        return value

    def create(self, validated_data):
        request = self.context.get('request')
        loan = self.context.get('loan')
        if request and request.user:
            validated_data['paid_by'] = request.user
        validated_data['loan'] = loan
        validated_data['payment_date'] = timezone.now()
        return super().create(validated_data)

    def get_loan_reference(self, obj):
        return obj.loan.reference if obj.loan else None

    def get_paid_by_name(self, obj):
        if obj.paid_by:
            if hasattr(obj.paid_by, 'memberprofile') and obj.paid_by.memberprofile.full_name:
                return obj.paid_by.memberprofile.full_name  
            return obj.paid_by.get_full_name() or obj.paid_by.username  # fallback if no profile
        return None


    def get_member_name(self, obj):
        if obj.loan and obj.loan.member:
            return obj.loan.member.full_name
        return None
    def get_due_date(self, obj):
        if obj.scheduled_installment and obj.scheduled_installment.due_date:
            return obj.scheduled_installment.due_date
        if obj.due_date:
            return obj.due_date
        return None


class LoanRepaymentScheduleSerializer(serializers.ModelSerializer):
    amount_paid = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()
    total_paid = serializers.SerializerMethodField()
    remaining_balance = serializers.SerializerMethodField()

    class Meta:
        model = LoanRepaymentSchedule
        fields = [
            'installment',
            'disbursement',
            'due_date',
            'principal',
            'interest',
            'amount_due',
            'is_paid',
            'amount_paid',
            'status',
            'total_paid',
            'remaining_balance',
        ]

    def get_amount_paid(self, obj):
        """Amount paid specifically for this installment."""
        return obj.repayments.aggregate(total=Sum('amount'))['total'] or 0

    def get_total_paid(self, obj):
        """Total amount paid so far on the entire loan."""
        return obj.loan.repayments.aggregate(total=Sum('amount'))['total'] or 0

    def get_remaining_balance(self, obj):
        """Calculate remaining principal balance after this installment."""
        # Get all installments up to and including this one
        installments_to_date = obj.loan.repayment_schedule.filter(
            installment__lte=obj.installment,
            disbursement=obj.disbursement
        ).order_by('installment')
        
        # Calculate remaining balance
        original_amount = obj.disbursement.amount
        total_principal_scheduled = installments_to_date.aggregate(
            total=Sum('principal')
        )['total'] or Decimal('0.00')
        
        return original_amount - total_principal_scheduled

    def get_status(self, obj):
        amount_paid = self.get_amount_paid(obj)
        if amount_paid >= obj.amount_due:
            return 'paid'
        elif amount_paid > 0:
            return 'partial'
        return 'unpaid'     


# =======================
# PAYMENTS
# =======================
class LoanPaymentInitiateSerializer(serializers.Serializer):
    loan_reference = serializers.CharField()
    custom_amount = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, allow_null=True)
    payoff = serializers.BooleanField(required=False, default=False)

    def validate(self, data):
        try:
            loan = Loan.objects.get(reference=data['loan_reference'])
        except Loan.DoesNotExist:
            raise serializers.ValidationError({'loan_reference': 'Invalid loan reference.'})

        data['loan'] = loan

        # Validation: if not payoff, custom_amount is required
        if not data.get('payoff') and 'custom_amount' not in data:
            raise serializers.ValidationError({'custom_amount': 'This field is required unless it is a payoff.'})

        return data


class LoanPaymentVerifySerializer(serializers.Serializer):
    reference = serializers.CharField()


class ContributionPaymentInitiateSerializer(serializers.Serializer):
    custom_amount = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal('0.01'))

    def validate(self, attrs):
        member = self.context['request'].user.memberprofile

        if not member.status =='approved':
            raise serializers.ValidationError("Only approved members can make contributions.")

        return {
            'member': member,
            'amount': attrs['custom_amount']
        }
    
class LevyPaymentInitiateSerializer(serializers.Serializer):
    custom_amount = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal('0.01'))

    def validate(self, attrs):
        member = self.context['request'].user.memberprofile

        if not member.status=='approved':
            raise serializers.ValidationError("Only approved members can pay development levy.")

        return {
            'member': member,
            'amount': attrs['custom_amount']
        }

class EntryPaymentInitiateSerializer(serializers.ModelSerializer):
    payment_type = serializers.ChoiceField(choices=[('shares', 'Shares'), ('levy', 'Development Levy')])

    class Meta:
        model = Payment
        fields = ['payment_type']

    def create(self, validated_data):
        user = self.context['request'].user
        member = MemberProfile.objects.get(user=user)

        config = member.applied_config or CooperativeConfig.objects.filter(status='active').first()
        if not config:
            raise serializers.ValidationError("No active cooperative configuration found.")

        payment_type = validated_data['payment_type']
        if payment_type == 'shares':
            amount = config.entry_shares_amount
        elif payment_type == 'levy':
            amount = config.development_levy_amount
        else:
            raise serializers.ValidationError("Unsupported payment type.")
        
        existing_payment = Payment.objects.filter(
            member=member,
            payment_type=payment_type,
            verified=False,
        ).first()

        if existing_payment:
            return existing_payment

        reference = generate_payment_reference(member, payment_type)

        payment = Payment.objects.create(
            member=member,
            payment_type=payment_type,
            amount=amount,
            reference=reference,
            source_reference=reference,  # Set same as reference
            verified=False
        )
        return payment


# =======================
# CONTRIBUTION
# =======================
class ContributionSerializer(serializers.ModelSerializer):
    member_name = serializers.CharField(source='member.user.get_full_name', read_only=True)
    class Meta:
        model = Contribution
        fields = ['id', 'member', 'member_name', 'amount', 'date', 'source_reference']
        read_only_fields = ['member', 'date']

    def validate_amount(self, value):
        config = CooperativeConfig.objects.filter(status='active').first()
        if not config:
            raise serializers.ValidationError("Active cooperative configuration not found.")

        if value < config.min_monthly_shares or value > config.max_monthly_shares:
            raise serializers.ValidationError(
                f"Contribution amount must be between {config.min_monthly_shares} and {config.max_monthly_shares}."
            )
        return value

    def validate(self, attrs):
        request = self.context['request']
        member = request.user.memberprofile
        config = CooperativeConfig.objects.filter(status='active').first()

        # Enforce monthly contribution limit
        if config and getattr(config, 'enforce_monthly_shares', False):
            today = timezone.now().date()
            exists = Contribution.objects.filter(
                member=member,
                created_at__month=today.month,
                created_at__year=today.year
            ).exists()
            if exists:
                raise serializers.ValidationError("You have already contributed this month.")
        return attrs



# =======================
# LEVY
# =======================
class LevySerializer(serializers.ModelSerializer):
    member_name = serializers.CharField(source='member.user.get_full_name', read_only=True)
    class Meta:
        model = Levy
        fields = ['id', 'member', 'member_name', 'amount', 'date', 'source_reference']
        read_only_fields = ['member', 'date']

    def validate_amount(self, value):
        config = CooperativeConfig.objects.filter(status='active').first()
        if not config:
            raise serializers.ValidationError("Active cooperative configuration not found.")

        if value < config.min_monthly_levy or value > config.max_monthly_levy:
            raise serializers.ValidationError(
                f"Development levy must be between {config.min_monthly_levy} and {config.max_monthly_levy}."
            )
        return value

    def validate(self, attrs):
        request = self.context['request']
        member = request.user.memberprofile
        config = CooperativeConfig.objects.filter(status='active').first()

        # Enforce monthly levy restriction
        if config and getattr(config, 'enforce_monthly_levy', False):
            today = timezone.now().date()
            exists = Levy.objects.filter(
                member=member,
                created_at__month=today.month,
                created_at__year=today.year
            ).exists()
            if exists:
                raise serializers.ValidationError("You have already paid this month's levy.")
        return attrs

class PaymentSerializer(serializers.ModelSerializer):
    member_name = serializers.CharField(source='member.full_name', read_only=True)
    loan_reference = serializers.CharField(source='loan.reference', read_only=True)

    class Meta:
        model = Payment
        fields = [
            'id',
            'member',
            'member_name',
            'payment_type',
            'loan',
            'loan_reference',
            'reference',
            'source_reference',
            'amount',
            'verified',
            'repayment_applied',
            'created_at',
            'verified_at',
            'payoff',
        ]

class PaymentRecheckSerializer(serializers.Serializer):
    payment_id = serializers.IntegerField()
    
    def validate_payment_id(self, value):
        if value <= 0:
            raise serializers.ValidationError("Invalid payment ID.")
        return value
# =======================
# USER PERMISSIONS
# =======================
class UserPermissionsSerializer(serializers.Serializer):
    custom_permissions = serializers.DictField(child=serializers.BooleanField())
    groups = serializers.ListField(child=serializers.CharField())
    all_permissions = serializers.ListField(child=serializers.CharField())

class AdminUserSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(source='memberprofile.full_name', read_only=True)
    member_id = serializers.CharField(source='memberprofile.member_id', read_only=True)
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'role', 'user_permissions', 'full_name', 'member_id']

class PermissionSerializer(serializers.ModelSerializer):
    app_label = serializers.CharField(source='content_type.app_label')

    class Meta:
        model = Permission
        fields = ['id', 'name', 'codename', 'app_label']

class UserPermissionUpdateSerializer(serializers.Serializer):
    permissions = serializers.ListField(
        child=serializers.IntegerField(),
        allow_empty=True
    )

### Group Permission serializer
class GroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = Group
        fields = ['id', 'name']

class UserGroupListSerializer(serializers.Serializer):
    groups = GroupSerializer(many=True)

class UserGroupUpdateSerializer(serializers.Serializer):
    group_ids = serializers.ListField(
        child=serializers.IntegerField(),
        allow_empty=True
    )

    def validate_group_ids(self, value):
        invalid_ids = [gid for gid in value if not Group.objects.filter(id=gid).exists()]
        if invalid_ids:
            raise serializers.ValidationError(f"Invalid group IDs: {invalid_ids}")
        return value
 ####
 # Announcement
class AnnouncementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Announcement
        fields = ['id', 'title', 'message', 'is_active', 'created_at']

#################################################
## EXPENSE SERIALIZER
#################################################
class ExpenseSerializer(serializers.ModelSerializer):
    recorded_by_name = serializers.SerializerMethodField()
    receipt_url = serializers.SerializerMethodField()
    receipt = serializers.FileField(write_only=True, required=False)

    class Meta:
        model = Expense
        fields = [
            'id', 'title', 'vendor_name', 'category', 'amount', 'date_incurred',
            'narration', 'recorded_by_name', 'created_at',
            'receipt_url', 'receipt'
        ]
        read_only_fields = ['recorded_by', 'recorded_by_name', 'created_at']
    
    def validate_amount(self, value):
        """Ensure amount is positive"""
        if value <= 0:
            raise serializers.ValidationError("Amount must be greater than 0")
        return value
    
    def validate_date_incurred(self, value):
        """Ensure date is not in the future"""
        from datetime import date
        if value > date.today():
            raise serializers.ValidationError("Date incurred cannot be in the future")
        return value
    
    def validate_receipt(self, value):
        """Validate receipt file if provided"""
        if value:
            # Check file size (max 10MB)
            max_size = 10 * 1024 * 1024  # 10MB
            if value.size > max_size:
                raise serializers.ValidationError("Receipt file size cannot exceed 10MB")
            
            # Check file type
            allowed_types = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
            if hasattr(value, 'content_type') and value.content_type not in allowed_types:
                raise serializers.ValidationError(
                    "Receipt file must be PDF, JPEG, PNG, or JPG format"
                )
        
        return value
    
    def get_recorded_by_name(self, obj):
        user = obj.recorded_by
        if not user:
            return "N/A"
        full_name = f"{user.first_name} {user.last_name}".strip()
        return full_name if full_name else user.username
    
    def get_receipt_url(self, obj):
        request = self.context.get('request')
        if obj.receipt_url:
            return obj.receipt_url
        elif obj.receipt and request:
            return request.build_absolute_uri(obj.receipt.url)
        return None
    
#################################################
## REPORTS SERIALIZER
#################################################
class MemberBalanceReportSerializer(serializers.Serializer):
    """Serializer for individual member balance data in reports"""
    member_id = serializers.CharField()
    full_name = serializers.CharField()
    email = serializers.EmailField()
    phone_number = serializers.CharField()
    membership_status = serializers.CharField()
    approval_status = serializers.CharField()
    joined_on = serializers.DateField()
    contributions_balance = serializers.DecimalField(max_digits=10, decimal_places=2)
    levies_balance = serializers.DecimalField(max_digits=10, decimal_places=2)
    total_assets = serializers.DecimalField(max_digits=12, decimal_places=2)
    loans_disbursed = serializers.DecimalField(max_digits=12, decimal_places=2)
    loan_repayments = serializers.DecimalField(max_digits=12, decimal_places=2)
    outstanding_loans = serializers.DecimalField(max_digits=12, decimal_places=2)
    active_loans_count = serializers.IntegerField()
    net_position = serializers.DecimalField(max_digits=12, decimal_places=2)


class ReportSummarySerializer(serializers.Serializer):
    """Serializer for report summary data"""
    report_date = serializers.DateField()
    total_members = serializers.IntegerField()
    total_contributions = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_levies = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_assets = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_loans_disbursed = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_loan_repayments = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_outstanding_loans = serializers.DecimalField(max_digits=12, decimal_places=2)
    net_cooperative_position = serializers.DecimalField(max_digits=12, decimal_places=2)
    members_with_outstanding_loans = serializers.IntegerField()
    average_contributions = serializers.DecimalField(max_digits=12, decimal_places=2)
    average_outstanding_loans = serializers.DecimalField(max_digits=12, decimal_places=2)


class ReportParametersSerializer(serializers.Serializer):
    """Serializer for report parameters"""
    as_of_date = serializers.DateField(required=False)
    member_status = serializers.ChoiceField(
        choices=['active', 'inactive', 'archived'],
        required=False
    )
    approval_status = serializers.ChoiceField(
        choices=['approved', 'pending', 'rejected'],
        required=False
    )
    include_inactive = serializers.BooleanField(default=False)


class MemberLedgerSerializer(serializers.Serializer):
    """Serializer for member ledger data"""
    member_id = serializers.CharField()
    full_name = serializers.CharField()
    email = serializers.EmailField()
    phone_number = serializers.CharField()
    membership_status = serializers.CharField()
    year = serializers.IntegerField()
    monthly_breakdown = serializers.DictField()
    member_balance = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_loan_repayments = serializers.DecimalField(max_digits=12, decimal_places=2)
    outstanding_loan_balance = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_levy_paid = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_shares = serializers.DecimalField(max_digits=12, decimal_places=2)
    grand_total = serializers.DecimalField(max_digits=12, decimal_places=2)
    
class MemberSearchSerializer(serializers.Serializer):
    """Serializer for member search parameters"""
    search = serializers.CharField(required=True, help_text="Member name or member ID")
    year = serializers.IntegerField(required=False, help_text="Year for ledger (default: current year)")


#################################################
## DOCUMENT OPERATIONs SERIALIZERS
#################################################
logger = logging.getLogger(__name__)
class MemberDocumentSerializer(serializers.ModelSerializer):
    document_type_display = serializers.CharField(source='get_document_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    document_owner = serializers.CharField(source='member.full_name', read_only=True)
    reviewer_name = serializers.CharField(source='reviewed_by.get_full_name', read_only=True)
    file_size_mb = serializers.ReadOnlyField()
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = MemberDocument
        fields = [
            'id', 'document_type', 'document_type_display', 'document_file',
            'file_url', 'status', 'status_display', 'rejection_reason',
            'uploaded_at', 'document_owner', 'reviewed_at', 'reviewer_name', 'notes',
            'file_size_mb', 'is_required', 'original_filename'
        ]
        read_only_fields = [
            'status', 'reviewed_at', 'reviewed_by', 'rejection_reason', 'original_filename'
        ]

    def get_file_url(self, obj):
        request = self.context.get('request')
        if settings.DEBUG and obj.document_file:
            return request.build_absolute_uri(obj.document_file.url) if request else obj.document_file.url
        elif obj.document_url:
            return obj.document_url
        return None


class DocumentUploadSerializer(serializers.ModelSerializer):
    class Meta:
        model = MemberDocument
        fields = ['document_type', 'document_file', 'notes']

    def create(self, validated_data):
        request = self.context.get('request')

        try:
            member = request.user.memberprofile
        except AttributeError:
            raise serializers.ValidationError("User must have a member profile to upload documents")

        document_file = validated_data.get('document_file')
        if not document_file:
            raise serializers.ValidationError("Document file is required")

        document_type = validated_data.get('document_type', 'misc')
        validated_data['member'] = member
        validated_data['original_filename'] = document_file.name

        try:
            if settings.DEBUG:
                # Store using FileField locally
                validated_data['file_size'] = document_file.size
                instance = MemberDocument.objects.create(**validated_data)
            else:
                # Handle Supabase storage
                try:
                    member_identifier = getattr(member, 'member_id', f"user_{member.user.id}")
                    ext = document_file.name.split('.')[-1]
                    unique_filename = f"documents/{member_identifier}/{document_type}/doc_{uuid.uuid4()}.{ext}"

                    public_url = upload_document_to_supabase(document_file, unique_filename)

                    # Assign file size BEFORE popping the file out
                    validated_data['file_size'] = document_file.size
                    validated_data['original_filename'] = document_file.name

                    # Remove local file, add URL and original name
                    validated_data.pop('document_file', None)
                    validated_data['document_url'] = public_url
                

                    instance = MemberDocument.objects.create(**validated_data)

                except Exception as e:
                    logger.error(f"Supabase upload error: {str(e)}")
                    raise serializers.ValidationError({
                        'error': 'Failed to upload document to cloud storage.',
                        'details': str(e)
                    })

        except Exception as e:
            logger.error(f"Error creating MemberDocument: {str(e)}")
            raise serializers.ValidationError({'error': str(e)})

        return instance
    
class DocumentReviewSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=['approve', 'reject'])
    reason = serializers.CharField(required=False, allow_blank=True)
    notes = serializers.CharField(required=False, allow_blank=True)
    
    def validate(self, data):
        if data['action'] == 'reject' and not data.get('reason'):
            raise serializers.ValidationError("Reason is required when rejecting a document.")
        return data

class DocumentRequestSerializer(serializers.ModelSerializer):
    document_type_display = serializers.CharField(source='get_document_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    document_owner = serializers.CharField(source='member.full_name', read_only=True)
    requester_name = serializers.CharField(source='requested_by.get_full_name', read_only=True)
    is_overdue = serializers.ReadOnlyField()
    is_self_request = serializers.SerializerMethodField()
    requested_from_id = serializers.SerializerMethodField()
    
    class Meta:
        model = DocumentRequest
        fields = [
            'id', 'document_type', 'document_type_display', 'status', 
            'status_display', 'message', 'requested_at', 'deadline',
            'fulfilled_at', 'requester_name','document_owner', 'is_overdue','is_self_request',
            'requested_from_id'
        ]
        read_only_fields = ['status', 'fulfilled_at']
    
    def get_is_self_request(self, obj):
        request = self.context.get("request")
        return request and obj.requested_by == request.user
    
    def get_requested_from_id(self, obj):
        return obj.member.user.id if obj.member and obj.member.user else None

class CreateDocumentRequestSerializer(serializers.ModelSerializer):
    deadline = serializers.DateTimeField(required=False, allow_null=True)
    
    class Meta:
        model = DocumentRequest
        fields = ['member', 'document_type', 'message', 'deadline']
    
    def to_internal_value(self, data):
        # Convert empty string to None for deadline
        if 'deadline' in data and data['deadline'] == '':
            data = data.copy()  # Make a copy to avoid mutating the original
            data['deadline'] = None
        return super().to_internal_value(data)
        
    def create(self, validated_data):
        request = self.context.get('request')
        validated_data['requested_by'] = request.user
        return super().create(validated_data)
