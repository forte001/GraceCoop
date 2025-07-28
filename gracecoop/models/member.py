
from decimal import Decimal
from django.db import models
from django.conf import settings
from datetime import datetime
from django.db.models import Sum
from django.utils.text import capfirst
import uuid
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
import os


class MemberProfile(models.Model):
    APPROVAL_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]

    MEMBERSHIP_STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('archived', 'Archived'),
    ]
    TITLE_CHOICES =[
        ('Mr.', 'Mr.'), ('Mrs.', 'Mrs.'), ('Miss.', 'Miss.'), ('Pst.', 'Pst.'), ('Rev.', 'Rev.'),
        ('Dr.', 'Dr.'), ('Prof.', 'Prof.'), ('Alh.', 'Alh.')
    ]
    GENDER =[('Male', 'Male'), ('Female', 'Female')]

    class Meta:
        permissions = [
            ("can_view_reports", "Can view and generate reports")
        ]
    
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='memberprofile')
    member_id = models.CharField(max_length=20, unique=True, blank=True, null=True)
    full_name = models.CharField(max_length=255, blank=True)
    email = models.EmailField()
    phone_number = models.CharField(max_length=20, blank=True)
    address = models.TextField(blank=True)
    joined_on = models.DateField(auto_now_add=True)
    is_email_verified = models.BooleanField(default=False)
    email_verification_token = models.UUIDField(default=uuid.uuid4, unique=True)
    password_reset_token = models.UUIDField(null=True, blank=True)
    password_reset_expiry = models.DateTimeField(null=True, blank=True)

     # Approval and membership statuses
    status = models.CharField(max_length=10, choices=APPROVAL_STATUS_CHOICES, default='pending')
    membership_status = models.CharField(max_length=10, choices=MEMBERSHIP_STATUS_CHOICES, default='inactive')
    title = models.CharField(max_length=10,choices=TITLE_CHOICES, blank=True)
    gender=models.CharField(max_length=10, choices=GENDER, blank=True)
    next_of_kin = models.CharField(max_length=50, blank=True)
    next_of_kin_relationship = models.CharField(max_length=50, blank=True)
    next_of_kin_phone = models.CharField(max_length=20, blank=True)
    next_of_kin_address = models.TextField(blank=True)

    has_paid_shares = models.BooleanField(default=False)
    has_paid_levy = models.BooleanField(default=False)

    applied_config = models.ForeignKey(
        'CooperativeConfig',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='applied_members'
    )
    
    @property
    def total_shares(self):
        return self.contributions.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

    def __str__(self):
        return self.full_name or f"Member {self.id}"
    
    
    def save(self, *args, **kwargs):
        if self.status == 'approved' and not self.member_id:
            year = datetime.now().year
            last_member = MemberProfile.objects.filter(member_id__startswith=f"GC-{year}").order_by('member_id').last()
            next_serial = 1
            if last_member and last_member.member_id:
                try:
                    last_serial = int(last_member.member_id.split('-')[-1])
                    next_serial = last_serial + 1
                except (IndexError, ValueError):
                    next_serial = 1
            self.member_id = f"GC-{year}-{next_serial:05d}"

        if self.full_name and self.user:
            parts = self.full_name.strip().split()
            if len(parts) == 1:
                self.user.first_name = capfirst(parts[0])
                self.user.last_name = ''
            elif len(parts) >= 2:
                self.user.first_name = capfirst(parts[0])
                self.user.last_name = capfirst(" ".join(parts[1:]))
            self.user.save()
        
        super().save(*args, **kwargs)