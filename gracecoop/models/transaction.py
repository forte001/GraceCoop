from django.db import models
from .member import MemberProfile
from .loan import Loan


class Transaction(models.Model):
    TRANSACTION_TYPES = [
        ('disbursement', 'Loan Disbursement'),
        ('repayment', 'Loan Repayment'),
        ('contribution', 'Member Contribution'),
    ]
    
    transaction_type = models.CharField(max_length=15, choices=TRANSACTION_TYPES)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    date = models.DateTimeField(auto_now_add=True)
    loan = models.ForeignKey(Loan, on_delete=models.CASCADE, null=True, blank=True)
    member = models.ForeignKey(MemberProfile, on_delete=models.CASCADE)
    
    def __str__(self):
        return f"{self.transaction_type} of {self.amount} for {self.member.full_name}"
