
from django.db import models
from django.core.exceptions import ValidationError


class CooperativeConfig(models.Model):
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('archived', 'Archived'),
    ]
    class Meta:
        ordering =['-effective_date']

    entry_shares_amount  = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    development_levy_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    # New fields for monthly limits
    min_contribution_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    max_contribution_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    min_monthly_levy = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    max_monthly_levy = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    enforce_monthly_levy = models.BooleanField(default=False)

    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='active')
    effective_date = models.DateField(auto_now_add=True)
    description = models.TextField(blank=True)
    last_updated = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Config from {self.effective_date} (Status: {self.status})"

    class Meta:
        verbose_name = "Cooperative Configuration"
        verbose_name_plural = "Cooperative Configuration"

    def clean(self):
        if self.status == 'active':
            exists = CooperativeConfig.objects.exclude(pk=self.pk).filter(status='active').exists()
            if exists:
                raise ValidationError("Only one active configuration is allowed.")

    def save(self, *args, **kwargs):
        self.full_clean()  # ensures `clean()` is called
        super().save(*args, **kwargs)
