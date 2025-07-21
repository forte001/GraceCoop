from rest_framework import viewsets, generics, status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework_simplejwt.tokens import RefreshToken, AccessToken
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.db.models import Sum
from django.db.models.functions import TruncMonth
from collections import OrderedDict
from calendar import month_name
from decimal import Decimal
from ..models import (MemberProfile, 
                      CooperativeConfig,
                      Levy,
                      LoanRepayment,
                      LoanRepaymentSchedule,
                      Contribution, User,
                      Payment,
                      Loan
                      )
from ..serializers import (
    UserSerializer,
    MemberProfileSerializer,
    UserRegistrationSerializer,
    UserLoginSerializer,
    TwoFASetupVerifySerializer,
    TwoFASetupSerializer,
    CooperativeConfigSerializer,
    MemberLedgerSerializer,
)
from datetime import datetime
from gracecoop.utils import send_verification_email, send_password_reset_email
import uuid
from django.utils import timezone
from django.core.mail import send_mail

# =======================
# USER REGISTRATION & LOGIN
# =======================

class UserRegistrationView(APIView):
    permission_classes = [AllowAny]
    def post(self, request):
        serializer = UserRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            profile = user.memberprofile

            # send verification email using the token from the MemberProfile
            send_verification_email(profile.email, profile.email_verification_token)

            return Response(
                {"message": "Registration successful! Please verify your email."},
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    
class VerifyEmailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        token = request.query_params.get("token")
        if not token:
            return Response({"error": "Token missing"}, status=400)

        try:
            profile = MemberProfile.objects.get(email_verification_token=token)
        except MemberProfile.DoesNotExist:
            print(f"Profile not found for token {token}")
            return Response({"error": "Invalid token"}, status=400)

        if not profile.is_email_verified:
            profile.is_email_verified = True
            profile.email_verification_token = uuid.uuid4()  # rotate
            profile.save()
            print(f"Profile verified: {profile}")
            return Response({"message": "Email verified successfully!"})
        else:
            print(f"Profile already verified: {profile}")
            return Response({"message": "Email already verified!"})



########################################################
### User Login View with 2FA implementation
########################################################
@method_decorator(csrf_exempt, name='dispatch')
class UserLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        # Deserialize the incoming request
        serializer = UserLoginSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.validated_data['user']
            profile = serializer.validated_data['profile']

            # Check if 2FA is enabled for the user
            if user.is_2fa_enabled:
                # Generate a temporary token for 2FA
                temp_token = AccessToken.for_user(user)

                # Respond with temp_token and user ID for further OTP verification
                return Response({
                    "require_2fa": True,
                    "user_id": user.id,
                    "temp_token": str(temp_token),
                    "is_2fa_setup_complete": user.is_2fa_enabled
                }, status=status.HTTP_200_OK)

            # If 2FA is not required, issue the normal access and refresh tokens
            refresh = RefreshToken.for_user(user)
            return Response({
                "message": "Login successful!",
                "user": {
                    "username": user.username,
                    "email": user.email,
                },
                "profile": {
                    "member_id": profile.member_id,
                    "full_name": profile.full_name,
                    "status": profile.status,
                },
                "access": str(refresh.access_token),
                "refresh": str(refresh),
            }, status=status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email")
        if not email:
            return Response({"error": "Email is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            profile = MemberProfile.objects.get(email=email)
            profile.password_reset_token = uuid.uuid4()
            profile.password_reset_expiry = timezone.now() + timezone.timedelta(hours=1)
            profile.save()

            send_password_reset_email(profile.email, profile.password_reset_token)

            return Response(
                {"message": "If an account with that email exists, a reset link has been sent."}
            )
        except MemberProfile.DoesNotExist:
            # Always respond with success-like message to avoid email enumeration
            return Response(
                {"message": "If an account with that email exists, a reset link has been sent."}
            )
    
class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        token = request.data.get("token")
        new_password = request.data.get("new_password")

        if not token or not new_password:
            return Response({"error": "Token and new password are required."}, status=400)

        try:
            profile = MemberProfile.objects.get(password_reset_token=token)
        except MemberProfile.DoesNotExist:
            return Response({"error": "Invalid token."}, status=400)

        if profile.password_reset_expiry < timezone.now():
            return Response({"error": "Token expired."}, status=400)

        user = profile.user
        user.set_password(new_password)
        user.save()

        # clear the token
        profile.password_reset_token = None
        profile.password_reset_expiry = None
        profile.save()

        return Response({"message": "Password has been reset successfully."})
    

    
class Member2FASetupView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Use the serializer with an empty object to trigger get_totp_uri
        serializer = TwoFASetupSerializer({}, context={'request': request})
        return Response(serializer.data)

    def post(self, request):
        # No additional logic needed for POST during initial setup
        return Response({"detail": "2FA setup initiated."})
    
class Member2FAVerifyView(APIView):

    permission_classes = [IsAuthenticated]

    def post(self, request):
        # Validate the OTP for 2FA setup
        serializer = TwoFASetupVerifySerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            return Response({"detail": "2FA setup completed successfully."}, status=status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)



class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)
    

# =======================
# MEMBER VIEWS
# =======================

class MemberViewSet(viewsets.ModelViewSet):
    queryset = MemberProfile.objects.all()
    serializer_class = MemberProfileSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=["get"], url_path="my-profile")
    def my_profile(self, request):
        user = request.user
        try:
            profile, created = MemberProfile.objects.get_or_create(
                user=user,
                defaults={
                    "full_name": user.username,
                    "email": user.email,
                }
            )
            serializer = self.get_serializer(profile)
            return Response(serializer.data)
        except Exception as e:
            print("❌ Error in my-profile:", e)
            return Response(
                {"error": "Unable to retrieve or create your profile."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
    # Generate Member ledger report
    @action(detail=False, methods=["get"], url_path="my-ledger")
    def my_ledger(self, request):
        """
        Generate ledger for the authenticated member.
        """

        # Get the authenticated member
        try:
            member = MemberProfile.objects.select_related("user").get(user=request.user)
        except MemberProfile.DoesNotExist:
            return Response(
                {"error": "Member profile not found"}, 
                status=404
            )

        # Get year parameter
        year = request.query_params.get("year", datetime.now().year)
        try:
            year = int(year)
        except (ValueError, TypeError):
            return Response(
                {"error": "Invalid year parameter"}, 
                status=400
            )

        # Initialize monthly data structure
        current_month = datetime.now().month
        current_year = datetime.now().year

        monthly_data = OrderedDict()
        for month_num in range(1, 13):
            month_label = month_name[month_num]
            if year < current_year or (year == current_year and month_num <= current_month):
                monthly_data[month_label] = {
                    "shares": Decimal("0.00"),
                    "levy": Decimal("0.00"),
                    "loan_repayment": Decimal("0.00"),
                    "total": Decimal("0.00")
                }
            else:
                monthly_data[month_label] = {
                    "shares": "-",
                    "levy": "-",
                    "loan_repayment": "-",
                    "total": "-"
                }

        # Get member's payments for the specified year
        member_payments = (
            Payment.objects.filter(
                member=member,
                verified=True,
                created_at__year=year
            )
            .annotate(month=TruncMonth("created_at"))
            .values("month", "payment_type")
            .order_by("month")
            .annotate(total=Sum("amount"))
        )

        # Initialize totals
        total_loan_repayments = Decimal("0.00")
        total_levy_paid = Decimal("0.00")
        total_shares = Decimal("0.00")

        # Process payments and populate monthly data
        for record in member_payments:
            month_str = record["month"].strftime("%B")
            ptype = record["payment_type"]
            amt = record["total"]

            if isinstance(monthly_data[month_str][ptype], Decimal):
                monthly_data[month_str][ptype] += amt
                monthly_data[month_str]["total"] += amt

                if ptype == "loan_repayment":
                    total_loan_repayments += amt
                elif ptype == "levy":
                    total_levy_paid += amt
                elif ptype == "shares":
                    total_shares += amt

        # Get outstanding loan balance
        active_loans = Loan.objects.filter(
            member=member,
            status__in=["approved", "disbursed", "partially_disbursed", "grace_applied"]
        )
        total_disbursed = active_loans.aggregate(total=Sum("disbursed_amount"))["total"] or Decimal("0.00")
        total_repaid = LoanRepayment.objects.filter(
            loan__in=active_loans
        ).aggregate(total=Sum("amount"))["total"] or Decimal("0.00")
        outstanding_loan_balance = total_disbursed - total_repaid

        # Calculate member balance (assets - liabilities)
        member_balance = total_shares - outstanding_loan_balance
        grand_total = member_balance

        # Prepare response data
        ledger_data = {
            "member_id": member.member_id,
            "full_name": member.full_name,
            "email": member.email,
            "phone_number": member.phone_number,
            "membership_status": member.membership_status,
            "year": year,
            "monthly_breakdown": monthly_data,
            "total_shares": total_shares,
            "total_levy_paid": total_levy_paid,
            "total_loan_repayments": total_loan_repayments,
            "outstanding_loan_balance": outstanding_loan_balance,
            "member_balance": member_balance,
            "grand_total": grand_total
        }

        # Serialize the data
        serializer = MemberLedgerSerializer(ledger_data)
        return Response(serializer.data)



# =======================
# MEMBER-SELF PROFILE VIEW
# =======================

class MyMemberProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = MemberProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        user = self.request.user
        profile, created = MemberProfile.objects.get_or_create(
            user=user,
            defaults={
                "full_name": user.username,
                "email": user.email,
                "phone_number": getattr(user, 'phone_number', ''),
                "address": getattr(user, 'address', ''),
                "status": "pending",
            }
        )
        return profile
    
class ActiveCooperativeConfigView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, *args, **kwargs):
        active_config = CooperativeConfig.objects.filter(status='active').order_by('-effective_date').first()
        if active_config:
            serializer = CooperativeConfigSerializer(active_config)
            return Response(serializer.data)
        return Response({"detail": "No active cooperative config found."}, status=404)
        

class MemberDashboardSummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        member = request.user.memberprofile

        # Get recent loan repayments
        loan_repayments = LoanRepayment.objects.filter(
            loan__member=member
        ).order_by("-payment_date")[:3]

        # Get recent contributions
        contributions = Contribution.objects.filter(
            member=member
        ).order_by("-date")[:3]

        # Get recent levies
        levies = Levy.objects.filter(
            member=member
        ).order_by("-date")[:3]

        # unify recent payments
        recent_payments = []

        for repay in loan_repayments:
            recent_payments.append({
                "amount": repay.amount,
                "payment_type": "loan",
                "paid_date": repay.payment_date,
                "status": "complete" if repay.amount > 0 else "pending",
                "next_due_date": None
            })

        for contrib in contributions:
            recent_payments.append({
                "amount": contrib.amount,
                "payment_type": "contribution",
                "paid_date": contrib.date,
                "status": "complete",
                "next_due_date": None
            })

        for levy in levies:
            recent_payments.append({
                "amount": levy.amount,
                "payment_type": "levy",
                "paid_date": levy.date,
                "status": "complete",
                "next_due_date": None
            })

        # next scheduled loan installment
        next_installment = LoanRepaymentSchedule.objects.filter(
            loan__member=member,
            is_paid=False
        ).order_by("due_date").first()

        upcoming = None
        if next_installment:
            upcoming = {
                "amount_due": next_installment.amount_due,
                "due_date": next_installment.due_date,
                "status": "unpaid"
            }

        # sort by paid_date descending
        recent_payments = [
            p for p in recent_payments if p["paid_date"] is not None
        ]

        recent_payments.sort(
            key=lambda x: (
                x["paid_date"].date() if isinstance(x["paid_date"], datetime) else x["paid_date"]
            ),
            reverse=True
        )


        return Response({
            "recent_payments": recent_payments,
            "upcoming_loan_payment": upcoming
        })