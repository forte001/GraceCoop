from django.utils import timezone
from django.db import models
from .member import MemberProfile
import uuid
from django.conf import settings
from django.utils import timezone
from decimal import Decimal

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
    reference = models.CharField(max_length=30, unique=True, null=True, blank=True)
    member = models.ForeignKey(MemberProfile, on_delete=models.CASCADE, related_name='loans')
    category = models.ForeignKey(LoanCategory, on_delete=models.CASCADE)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
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

    disbursed_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
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
    amount = models.DecimalField(max_digits=10, decimal_places=2)
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
    category = models.ForeignKey(LoanCategory, on_delete=models.PROTECT)
    interest_rate = models.DecimalField(max_digits=5, decimal_places=2, editable=False, default=0.0)
    loan_period_months = models.PositiveIntegerField(editable=False, default=0)

    amount = models.DecimalField(max_digits=10, decimal_places=2)
    repayment_months = models.IntegerField()
    status = models.CharField(
        max_length=20,
        choices=[('pending', 'Pending'), ('approved', 'Approved'), ('rejected', 'Rejected')],
        default='pending'
    )
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
    

class LoanRepayment(models.Model):
    loan = models.ForeignKey('Loan', on_delete=models.CASCADE, related_name='repayments')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    principal_component = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
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
    principal = models.DecimalField(max_digits=10, decimal_places=2)
    interest = models.DecimalField(max_digits=10, decimal_places=2)
    amount_due = models.DecimalField(max_digits=10, decimal_places=2)
    is_paid = models.BooleanField(default=False)

    class Meta:
        ordering = ['due_date']

    def __str__(self):
        return f"Installment {self.installment} for Loan #{self.loan.id} due {self.due_date}"

