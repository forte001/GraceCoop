from django.db import models
from gracecoop.models import MemberProfile

class Levy(models.Model):
    member = models.ForeignKey(MemberProfile, on_delete=models.CASCADE, related_name='levies')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    date = models.DateTimeField(auto_now_add=True)
    source_reference = models.CharField(max_length=100, null=True, blank=True)

    def __str__(self):
        return f"Levy of {self.amount} for {self.member.full_name}"
