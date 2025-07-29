from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import FileExtensionValidator
from django.utils import timezone
import os
import logging
from django.conf import settings
import time


logger = logging.getLogger(__name__)

def validate_document_file(value):
    """Validate uploaded documents"""
    # Check file size (max 5MB)
    if value.size > 5 * 1024 * 1024:
        raise ValidationError('File size cannot exceed 5MB.')


def document_upload_path(instance, filename):
    """Generate upload path for documents - Supabase optimized"""
    member = getattr(instance, 'member', None)

    # Fallback early if no member assigned yet
    if not member:
        return f'documents/unassigned/{filename}'

    # Use member_id if available (approved members), otherwise use user.id
    if hasattr(member, 'member_id') and member.member_id:
        member_identifier = member.member_id
    elif hasattr(member, 'user') and member.user:
        # For pending members
        member_identifier = f"pending_user_{member.user.id}"
    else:
        member_identifier = f"profile_{member.pk}" if member.pk else "unassigned"
    
    doc_type = getattr(instance, 'document_type', 'misc') or 'misc'
    
    # Generate timestamp to avoid filename conflicts
    timestamp = int(time.time())
    name, ext = os.path.splitext(filename)
    unique_filename = f"{name}_{timestamp}{ext}"
    
    return f'documents/{member_identifier}/{doc_type}/{unique_filename}'

class MemberDocument(models.Model):
    """Simplified model for member documents"""
    
    DOCUMENT_TYPES = [
        ('national_id', 'National ID Card'),
        ('drivers_license', 'Driver\'s License'),
        ('passport', 'International Passport'),
        ('utility_bill', 'Utility Bill'),
        ('bank_statement', 'Bank Statement'),
        ('employment_letter', 'Employment Letter'),
        ('salary_slip', 'Salary Slip'),
        ('other', 'Other'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pending Review'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]
    
    # Basic fields
    member = models.ForeignKey(
        'MemberProfile',  
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='documents'
    )
    
    document_type = models.CharField(
        max_length=20,
        choices=DOCUMENT_TYPES
    )
    
    # For local development
    document_file = models.FileField(
        upload_to=document_upload_path,
        validators=[
            validate_document_file,
            FileExtensionValidator(allowed_extensions=['pdf', 'jpg', 'jpeg', 'png'])
        ],
        null=True,
        blank=True
    )
    
    # For production (Supabase)
    document_url = models.URLField(max_length=500, null=True, blank=True)
    original_filename = models.CharField(max_length=255, null=True, blank=True)
    file_size = models.PositiveIntegerField(null=True, blank=True)  # Store file size in bytes
    
    # Status and review
    status = models.CharField(
        max_length=10,
        choices=STATUS_CHOICES,
        default='pending'
    )
    
    rejection_reason = models.TextField(blank=True)
    
    # Timestamps
    uploaded_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_documents'
    )
    
    # Optional fields
    notes = models.TextField(blank=True)
    is_required = models.BooleanField(default=False)  # Set by admin when requesting
    
    class Meta:
        # Allow multiple documents of same type (for resubmissions)
        ordering = ['-uploaded_at']
        
    def __str__(self):
        return f"{self.member} - {self.get_document_type_display()}"
    
    def approve(self, reviewed_by, notes=""):
        """Approve the document"""
        self.status = 'approved'
        self.reviewed_by = reviewed_by
        self.reviewed_at = timezone.now()
        self.rejection_reason = ""
        self.notes = notes
        self.save()
        
        # Mark any requests for this document type as fulfilled
        DocumentRequest.objects.filter(
            member=self.member,
            document_type=self.document_type,
            status='pending'
        ).update(status='fulfilled', fulfilled_at=timezone.now())
    
    def reject(self, reviewed_by, reason, notes=""):
        """Reject the document"""
        self.status = 'rejected'
        self.reviewed_by = reviewed_by
        self.reviewed_at = timezone.now()
        self.rejection_reason = reason
        self.notes = notes
        self.save()
    
    @property
    def file_size_mb(self):
        try:
            if self.file_size:
                return round(self.file_size / (1024 * 1024), 2)
            elif self.document_file:
                return round(self.document_file.size / (1024 * 1024), 2)
            return None
        except Exception:
            return None

    
    @property
    def file_url(self):
        """Get file URL (works for both local and production)"""
        if settings.DEBUG and self.document_file:
            return self.document_file.url
        elif self.document_url:
            return self.document_url
        return None

class DocumentRequest(models.Model):
    """Model for admin to request documents from members"""
    
    REQUEST_STATUS = [
        ('pending', 'Pending'),
        ('fulfilled', 'Fulfilled'),
        ('cancelled', 'Cancelled'),
    ]
    
    member = models.ForeignKey(
        'MemberProfile',
        on_delete=models.CASCADE,
        related_name='document_requests'
    )
    
    document_type = models.CharField(
        max_length=20,
        choices=MemberDocument.DOCUMENT_TYPES
    )
    
    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='sent_document_requests'
    )
    
    status = models.CharField(
        max_length=10,
        choices=REQUEST_STATUS,
        default='pending'
    )
    
    message = models.TextField(
        help_text="Message to member explaining why document is needed"
    )
    
    # Timestamps
    requested_at = models.DateTimeField(auto_now_add=True)
    deadline = models.DateTimeField(null=True, blank=True)
    fulfilled_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-requested_at']
        # Prevent duplicate active requests
        unique_together = ['member', 'document_type', 'status']
    
    def __str__(self):
        return f"Request: {self.member} - {self.get_document_type_display()}"
    
    def cancel(self):
        """Cancel the request"""
        self.status = 'cancelled'
        self.save()
    
    @property
    def is_overdue(self):
        """Check if request is overdue"""
        if self.deadline and self.status == 'pending':
            return timezone.now() > self.deadline
        return False