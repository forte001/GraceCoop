from django.db import models
from django.conf import settings

class Expense(models.Model):
    CATEGORY_CHOICES = [
       ('GENERAL', 'General'),
       ('UTILITY', 'Utility'),
       ('PURCHASES', 'Purchases'),
    ]

    title = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    date_incurred = models.DateField()
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    vendor_name = models.CharField(max_length=255)
    narration = models.TextField(blank=True)
    receipt = models.FileField(upload_to='expenses/receipts/', null=True, blank=True)
    receipt_url = models.URLField(blank=True, null=True)

    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='recorded_expenses'
    )

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} - NGN {self.amount}"
