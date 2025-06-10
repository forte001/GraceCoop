from django.db import models
from .member import MemberProfile

class Contribution(models.Model):
    member = models.ForeignKey(MemberProfile, on_delete=models.CASCADE, related_name='contributions')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    date = models.DateTimeField(auto_now_add=True)
    source_reference = models.CharField(max_length=100, null=True, blank=True)
    
    def __str__(self):
        return f"Contribution of {self.amount} from {self.member.full_name}"