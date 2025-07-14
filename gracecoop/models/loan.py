from django.db import models
from .member import MemberProfile
import uuid
from django.conf import settings
from decimal import Decimal
from django.utils import timezone

class LoanCategory(models.Model):
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('archived', 'Archived'),
    ]

    id = models.BigAutoField(primary_key=True)  # Keep current ID
    uuid = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    name = models.CharField(max_length=100, unique=True)
    abbreviation = models.CharField(max_length=10, help_text="Short code for reference generation (e.g., BIZ, EDU, AGR)", unique=True, blank=True, null=True)
    description = models.TextField(blank=True)
    interest_rate = models.DecimalField(max_digits=5, decimal_places=2, help_text="Interest rate as a percentage (e.g., 5.5%)")
    loan_period_months = models.PositiveIntegerField(help_text="Number of months loan is repayable from disbursement date")
    grace_period_months = models.PositiveIntegerField(help_text="Number of months after loan period expiry for grace")
    grace_interest_rate = models.DecimalField(max_digits=5,decimal_places=2,help_text="Interest rate as a percentage during grace period (e.g. 8.5%)",null=True,blank=True,)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='active')
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='loan_categories_created')
    created_at = models.DateTimeField(auto_now_add=True,)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']
        permissions = [
            ("can_create_loan_category", "Can create loan category"),
            ("can_edit_loan_category", "Can edit loan category"),
            ("can_delete_loan_category", "Can delete loan category"),
        ]

    def __str__(self):
        return self.name
    

class Loan(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('disbursed', 'Disbursed'),
        ('partially_disbursed', 'Partially Disbursed'),
        ('paid', 'Paid'),
        ('grace_applied', 'Grace Period Applied'),
    ]

    class Meta:
        ordering = ['-approved_at']
        permissions = [
            ("can_approve_loan", "Can Approve Loan"),
            ("can_delete_loan", "Can Delete Loan"),
            ("can_disburse_loan", "Can Disburse Loan"),
            ("can_approve_grace_period", "Can Approve Grace Period")
    ]
    application = models.OneToOneField(
        'LoanApplication',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_loan'
    )
    reference = models.CharField(max_length=30, unique=True, null=True, blank=True)
    member = models.ForeignKey(MemberProfile, on_delete=models.CASCADE, related_name='loans')
    category = models.ForeignKey(LoanCategory, on_delete=models.CASCADE)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    interest_rate = models.DecimalField(max_digits=5, decimal_places=2, editable=False)
    duration_months = models.PositiveIntegerField(editable=False)
    has_interest_schedule = models.BooleanField(default=False)

    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    first_due_date = models.DateField(null=True, blank=True)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    repayment_start_date = models.DateField(null=True, blank=True)
    total_repayment_months = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Total number of months the loan will be repaid over"
    )

    disbursed_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    disbursed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='disbursed_loans')
    disbursed_at = models.DateTimeField(null=True, blank=True)

    approved_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_loans')
    approved_at = models.DateTimeField(null=True, blank=True)

    num_disbursements = models.PositiveIntegerField(null=True, blank=True, help_text="Expected number of disbursements")
    remaining_disbursement = models.BooleanField(default=False, help_text="Is there more disbursement to be made?")

    grace_applied = models.BooleanField(default=False)
    

    def get_next_scheduled_payment(self):
        return self.repayment_schedule.filter(is_paid=False).order_by('due_date').first()


    def __str__(self):
        return f"Loan of {self.amount} for {self.member}"
    
class DisbursementLog(models.Model):
    loan = models.ForeignKey(Loan, on_delete=models.CASCADE, related_name='disbursements')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    repayment_months = models.PositiveIntegerField(default=1, help_text="Number of months to repay this disbursement")
    disbursed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    disbursed_at = models.DateTimeField(auto_now_add=True)
    receipt = models.FileField(upload_to='disbursement_receipts/', null=True, blank=True)  # allow blank for existing records
    receipt_url = models.URLField(blank=True, null=True)
    requested_by = models.ForeignKey(MemberProfile, on_delete=models.SET_NULL, null=True, blank=True)

    def __str__(self):
        return f"{self.amount} over {self.repayment_months} months on {self.disbursed_at.date()} disbursed to {self.requested_by}"


class LoanApplication(models.Model):
    class Meta:
        ordering = ['-application_date']

    applicant = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    category = models.ForeignKey('LoanCategory', on_delete=models.PROTECT)
    interest_rate = models.DecimalField(max_digits=5, decimal_places=2, editable=False, default=0.0)
    loan_period_months = models.PositiveIntegerField(editable=False, default=0)

    amount = models.DecimalField(max_digits=10, decimal_places=2)
    repayment_months = models.IntegerField()
    status = models.CharField(
        max_length=20,
        choices=[('pending', 'Pending'), ('approved', 'Approved'), ('rejected', 'Rejected')],
        default='pending'
    )
    rejection_reason = models.TextField(blank=True, null=True)
    application_date = models.DateTimeField(auto_now_add=True)
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approvals'
    )
    approval_date = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Loan Application by {self.applicant.username} for {self.amount}"
    
    def has_required_guarantors(self):
        return self.guarantors.count() >= 2
    
    def has_all_guarantors_approved(self):
        """Check if all guarantors have approved their participation"""
        guarantors = self.guarantors.all()
        if guarantors.count() < 2:
            return False
        return all(g.consent_status == 'approved' for g in guarantors)
    
    def get_guarantor_approval_summary(self):
        """Get a summary of guarantor approval status with enhanced time-based logic"""
        guarantors = self.guarantors.all()
        total = guarantors.count()
        approved = guarantors.filter(consent_status='approved').count()
        rejected = guarantors.filter(consent_status='rejected').count()
        pending = guarantors.filter(consent_status='pending').count()
        
        # Time-based logic for long-pending guarantors
        cutoff_date = timezone.now() - timezone.timedelta(days=7)
        long_pending = guarantors.filter(
            consent_status='pending',
            created_at__lt=cutoff_date
        ).count()
        
        return {
            'total': total,
            'approved': approved,
            'rejected': rejected,
            'pending': pending,
            'long_pending': long_pending,
            'all_approved': approved >= 2 and pending == 0 and rejected == 0,
            'has_rejections': rejected > 0,
            'can_replace_some': (rejected + long_pending) > 0 and self.status in ['pending', 'rejected']
        }
    
    def can_be_processed(self):
        """Check if the application can be processed (all guarantors approved)"""
        return (
            self.status == 'pending' and 
            self.has_all_guarantors_approved() and 
            self.guarantors.count() >= 2
        )

    def get_replaceable_guarantors(self):
        """Get guarantors that can be replaced (rejected or long pending)"""
        cutoff_date = timezone.now() - timezone.timedelta(days=7)
        return self.guarantors.filter(
            models.Q(consent_status='rejected') |
            models.Q(consent_status='pending', created_at__lt=cutoff_date)
        )

    def can_be_resubmitted(self):
        """Check if application can be resubmitted"""
        return self.status in ['pending', 'rejected']
        
    

class LoanGuarantor(models.Model):
    CONSENT_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]
    
    application = models.ForeignKey(
        'LoanApplication', on_delete=models.CASCADE, related_name='guarantors'
    )
    guarantor = models.ForeignKey(
        'MemberProfile', on_delete=models.CASCADE, related_name='guaranteeing_applications'
    )
    loan = models.ForeignKey(
        'Loan', on_delete=models.CASCADE, null=True, blank=True, related_name='guarantors'
    )
    
    # Time tracking fields
    created_at = models.DateTimeField(auto_now_add=True)  # When guarantor was added
    consent_status = models.CharField(
        max_length=10, choices=CONSENT_STATUS_CHOICES, default='pending'
    )
    response_date = models.DateTimeField(null=True, blank=True)  # When status changed from pending
    rejection_reason = models.TextField(blank=True, null=True)  # Reason for rejection

    class Meta:
        unique_together = ('application', 'guarantor')
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.guarantor.full_name} guarantees application #{self.application.id}"

    def save(self, *args, **kwargs):
        """Auto-set response_date when status changes from pending"""
        if self.pk:
            try:
                old_instance = LoanGuarantor.objects.get(pk=self.pk)
                if old_instance.consent_status == 'pending' and self.consent_status != 'pending':
                    self.response_date = timezone.now()
            except LoanGuarantor.DoesNotExist:
                pass
        super().save(*args, **kwargs)

    @property
    def days_pending(self):
        """Calculate days since guarantor was added (if still pending)"""
        if self.consent_status == 'pending':
            return (timezone.now() - self.created_at).days
        return None

    @property
    def is_long_pending(self):
        """Check if guarantor has been pending for more than 7 days"""
        return self.consent_status == 'pending' and self.days_pending and self.days_pending > 7

    @property
    def can_be_replaced(self):
        """Check if this guarantor can be replaced (rejected or long pending)"""
        return self.consent_status == 'rejected' or self.is_long_pending

    

class LoanRepayment(models.Model):
    loan = models.ForeignKey('Loan', on_delete=models.CASCADE, related_name='repayments')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    principal_component = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    interest_component = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    paid_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    payment_date = models.DateField(null=True, blank=True)
    recorded_at = models.DateTimeField(auto_now_add=True)
    was_late = models.BooleanField(default=False)
    due_date = models.DateField(null=True, blank=True)
    scheduled_installment = models.ForeignKey(
        'LoanRepaymentSchedule',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='repayments'
    )
    source_reference = models.CharField(max_length=100, blank=True, null=True, unique=True)

    class Meta:
        ordering = ['-payment_date']

    def __str__(self):
        return f"Repayment of {self.amount} on {self.payment_date} for Loan #{self.loan.id}"
    

class LoanRepaymentSchedule(models.Model):
    loan = models.ForeignKey('Loan', on_delete=models.CASCADE, related_name='repayment_schedule')
    disbursement = models.ForeignKey(DisbursementLog, on_delete=models.CASCADE)
    installment = models.PositiveIntegerField()
    due_date = models.DateField()
    principal = models.DecimalField(max_digits=12, decimal_places=2)
    interest = models.DecimalField(max_digits=10, decimal_places=2)
    amount_due = models.DecimalField(max_digits=10, decimal_places=2)
    is_paid = models.BooleanField(default=False)

    class Meta:
        ordering = ['due_date']

    def __str__(self):
        return f"Installment {self.installment} for Loan #{self.loan.id} due {self.due_date}"

