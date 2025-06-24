from django.db import models
from num2words import num2words

class Payment(models.Model):
    PAYMENT_TYPE_CHOICES = [
        ('shares', 'Shares'),
        ('levy', 'Development Levy'),
        ('loan_repayment', 'Loan Repayment'),
    ]

    member = models.ForeignKey('MemberProfile', on_delete=models.CASCADE)
    payment_type = models.CharField(max_length=20, choices=PAYMENT_TYPE_CHOICES)
    loan = models.ForeignKey('Loan', null=True, blank=True, on_delete=models.SET_NULL)
    reference = models.CharField(max_length=100, unique=True)
    source_reference = models.CharField(max_length=100, null=True, blank=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    verified = models.BooleanField(default=False)
    repayment_applied = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    verified_at = models.DateTimeField(null=True, blank=True)
    payoff = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.member.full_name} - {self.payment_type} - {self.amount}"
    
    # def amount_to_words(self):
    #     return num2words(self.amount, to='currency', lang='en', currency='NGN').capitalize()

    def amount_to_words(self):
        naira = int(self.amount)
        kobo = int(round((self.amount - naira) * 100))
        words = f"{num2words(naira)} naira"
        if kobo > 0:
            words += f" and {num2words(kobo)} kobo"
        return words.upper()
