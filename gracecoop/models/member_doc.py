# from django.db import models
# from django.conf import settings
# from django.core.exceptions import ValidationError
# from django.core.validators import FileExtensionValidator
# from django.utils import timezone
# from datetime import timedelta
# import os


# def validate_id_document(value):
#     """Validate uploaded ID documents"""
#     # Check file size (max 5MB)
#     if value.size > 5 * 1024 * 1024:
#         raise ValidationError('File size cannot exceed 5MB.')
    
#     # Check file extension
#     valid_extensions = ['.pdf', '.jpg', '.jpeg', '.png']
#     ext = os.path.splitext(value.name)[1].lower()
#     if ext not in valid_extensions:
#         raise ValidationError('Only PDF, JPG, JPEG, and PNG files are allowed.')


# def id_document_upload_path(instance, filename):
#     """Generate upload path for ID documents"""
#     # Create path: member_documents/user_id/id_documents/document_type/filename
#     return f'member_documents/{instance.member.user.id}/id_documents/{instance.document_type}/{filename}'


# class MemberIDDocument(models.Model):
#     """Model for storing member ID documents"""
    
#     DOCUMENT_TYPE_CHOICES = [
#         ('national_id', 'National ID Card'),
#         ('voters_card', 'Voters Card'),
#         ('drivers_license', 'Driver\'s License'),
#         ('passport', 'International Passport'),
#         ('nin_slip', 'NIN Slip'),
#         ('birth_certificate', 'Birth Certificate'),
#         ('certificate_of_origin', 'Certificate of Origin'),
#     ]
    
#     VERIFICATION_STATUS_CHOICES = [
#         ('pending', 'Pending Review'),
#         ('verified', 'Verified'),
#         ('rejected', 'Rejected'),
#         ('expired', 'Expired'),
#     ]
    
#     PRIORITY_CHOICES = [
#         ('primary', 'Primary Document'),
#         ('secondary', 'Secondary Document'),
#         ('supporting', 'Supporting Document'),
#     ]
    
#     # Relationships
#     member = models.ForeignKey(
#         'MemberProfile',
#         on_delete=models.CASCADE,
#         related_name='id_documents',
#         help_text="Member who owns this document"
#     )
    
#     # Document Details
#     document_type = models.CharField(
#         max_length=25,
#         choices=DOCUMENT_TYPE_CHOICES,
#         help_text="Type of ID document"
#     )
    
#     document_number = models.CharField(
#         max_length=50,
#         help_text="Document number/ID"
#     )
    
#     document_file = models.FileField(
#         upload_to=id_document_upload_path,
#         validators=[
#             validate_id_document,
#             FileExtensionValidator(allowed_extensions=['pdf', 'jpg', 'jpeg', 'png'])
#         ],
#         help_text="Upload clear image/PDF of the document"
#     )
    
#     # Document Priority/Category
#     priority = models.CharField(
#         max_length=15,
#         choices=PRIORITY_CHOICES,
#         default='primary',
#         help_text="Document priority level"
#     )
    
#     # Verification Details
#     verification_status = models.CharField(
#         max_length=15,
#         choices=VERIFICATION_STATUS_CHOICES,
#         default='pending',
#         help_text="Current verification status"
#     )
    
#     # Timestamps
#     uploaded_at = models.DateTimeField(
#         auto_now_add=True,
#         help_text="When document was uploaded"
#     )
    
#     verified_at = models.DateTimeField(
#         null=True,
#         blank=True,
#         help_text="When document was verified"
#     )
    
#     expires_at = models.DateField(
#         null=True,
#         blank=True,
#         help_text="Document expiration date (if applicable)"
#     )
    
#     # Verification Details
#     verified_by = models.ForeignKey(
#         settings.AUTH_USER_MODEL,
#         on_delete=models.SET_NULL,
#         null=True,
#         blank=True,
#         related_name='verified_id_documents',
#         help_text="Admin who verified this document"
#     )
    
#     rejection_reason = models.TextField(
#         blank=True,
#         help_text="Reason for rejection (if applicable)"
#     )
    
#     # Additional fields
#     notes = models.TextField(
#         blank=True,
#         help_text="Additional notes about the document"
#     )
    
#     is_active = models.BooleanField(
#         default=True,
#         help_text="Whether this document is currently active"
#     )
    
#     class Meta:
#         unique_together = ['member', 'document_type', 'document_number']
#         ordering = ['-uploaded_at']
#         verbose_name = "Member ID Document"
#         verbose_name_plural = "Member ID Documents"
        
#         indexes = [
#             models.Index(fields=['member', 'verification_status']),
#             models.Index(fields=['document_type', 'verification_status']),
#             models.Index(fields=['uploaded_at']),
#         ]
    
#     def __str__(self):
#         return f"{self.member.full_name} - {self.get_document_type_display()}"
    
#     def save(self, *args, **kwargs):
#         is_new = self.pk is None
#         old_instance = None
        
#         # Get old instance for comparison if updating
#         if not is_new:
#             old_instance = MemberIDDocument.objects.get(pk=self.pk)
        
#         # Check for expiration
#         if self.expires_at and self.expires_at < timezone.now().date():
#             self.verification_status = 'expired'
#             self.is_active = False
        
#         super().save(*args, **kwargs)
        
#         # Create history record for new uploads
#         if is_new:
#             IDDocumentHistory.objects.create(
#                 id_document=self,
#                 member=self.member,
#                 action='uploaded',
#                 performed_by=getattr(self, '_uploaded_by', None),
#                 notes=f"Document uploaded: {self.get_document_type_display()}"
#             )
        
#         # Create history record for status changes
#         elif old_instance and old_instance.verification_status != self.verification_status:
#             IDDocumentHistory.objects.create(
#                 id_document=self,
#                 member=self.member,
#                 action=self.verification_status,
#                 performed_by=getattr(self, '_status_changed_by', None),
#                 notes=f"Status changed from {old_instance.verification_status} to {self.verification_status}",
#                 field_changes={
#                     'verification_status': {
#                         'old': old_instance.verification_status,
#                         'new': self.verification_status
#                     }
#                 }
#             )
    
#     def verify_document(self, verified_by_user, approved=True, rejection_reason="", notes=""):
#         """Method to verify or reject the document"""
#         self._status_changed_by = verified_by_user
        
#         if approved:
#             self.verification_status = 'verified'
#             self.verified_at = timezone.now()
#             self.verified_by = verified_by_user
#             self.rejection_reason = ""
#             action = 'verified'
#             history_notes = f"Document verified by {verified_by_user.get_full_name()}"
#         else:
#             self.verification_status = 'rejected'
#             self.verified_at = None
#             self.verified_by = None
#             self.rejection_reason = rejection_reason
#             action = 'rejected'
#             history_notes = f"Document rejected by {verified_by_user.get_full_name()}: {rejection_reason}"
        
#         if notes:
#             self.notes = notes
        
#         self.save()
        
#         # Create detailed history record
#         IDDocumentHistory.objects.create(
#             id_document=self,
#             member=self.member,
#             action=action,
#             performed_by=verified_by_user,
#             notes=history_notes,
#             metadata={
#                 'rejection_reason': rejection_reason if not approved else '',
#                 'verification_notes': notes
#             }
#         )
        
#         # Mark any related document requests as fulfilled if verified
#         if approved:
#             pending_requests = MemberDocumentRequest.objects.filter(
#                 member=self.member,
#                 document_type=self.document_type,
#                 status='pending'
#             )
#             for request in pending_requests:
#                 request.mark_as_fulfilled(self)
        
#         return self
    
#     def resubmit_document(self, new_file, performed_by=None):
#         """Handle document resubmission"""
#         self._status_changed_by = performed_by
        
#         # Store old file info for history
#         old_file_name = self.document_file.name if self.document_file else None
        
#         # Update document
#         self.document_file = new_file
#         self.verification_status = 'pending'
#         self.verified_at = None
#         self.verified_by = None
#         self.rejection_reason = ""
        
#         self.save()
        
#         # Create history record
#         IDDocumentHistory.objects.create(
#             id_document=self,
#             member=self.member,
#             action='resubmitted',
#             performed_by=performed_by,
#             notes=f"Document resubmitted. Previous file: {old_file_name}",
#             metadata={
#                 'old_file': old_file_name,
#                 'new_file': new_file.name
#             }
#         )
    
#     def deactivate_document(self, performed_by=None, reason=""):
#         """Deactivate the document"""
#         self.is_active = False
#         self.save()
        
#         IDDocumentHistory.objects.create(
#             id_document=self,
#             member=self.member,
#             action='deactivated',
#             performed_by=performed_by,
#             notes=f"Document deactivated. Reason: {reason}",
#             metadata={'deactivation_reason': reason}
#         )
    
#     @property
#     def is_expired(self):
#         """Check if document has expired"""
#         if self.expires_at:
#             return self.expires_at < timezone.now().date()
#         return False
    
#     @property
#     def file_size_mb(self):
#         """Get file size in MB"""
#         if self.document_file:
#             return round(self.document_file.size / (1024 * 1024), 2)
#         return 0
    
#     @property
#     def file_extension(self):
#         """Get file extension"""
#         if self.document_file:
#             return os.path.splitext(self.document_file.name)[1].lower()
#         return ''


# class IDDocumentHistory(models.Model):
#     """Model for tracking ID document history and audit trail"""
    
#     ACTION_CHOICES = [
#         ('uploaded', 'Uploaded'),
#         ('verified', 'Verified'),
#         ('rejected', 'Rejected'),
#         ('resubmitted', 'Resubmitted'),
#         ('expired', 'Expired'),
#         ('deactivated', 'Deactivated'),
#         ('cancelled', 'Cancelled'),
#         ('requested', 'Requested'),
#         ('modified', 'Modified'),
#     ]
    
#     # Main relationships
#     id_document = models.ForeignKey(
#         MemberIDDocument,
#         on_delete=models.CASCADE,
#         related_name='history',
#         null=True,
#         blank=True,
#         help_text="The document this history entry relates to"
#     )
    
#     # For cases where we need to track member-level actions without specific document
#     member = models.ForeignKey(
#         'MemberProfile',
#         on_delete=models.CASCADE,
#         related_name='id_document_history',
#         help_text="Member this history entry relates to"
#     )
    
#     # Action details
#     action = models.CharField(
#         max_length=20,
#         choices=ACTION_CHOICES,
#         help_text="Action performed on the document"
#     )
    
#     performed_by = models.ForeignKey(
#         settings.AUTH_USER_MODEL,
#         on_delete=models.SET_NULL,
#         null=True,
#         blank=True,
#         related_name='performed_id_document_actions',
#         help_text="User who performed this action"
#     )
    
#     # Timestamps
#     timestamp = models.DateTimeField(
#         auto_now_add=True,
#         help_text="When this action was performed"
#     )
    
#     # Additional details
#     notes = models.TextField(
#         blank=True,
#         help_text="Additional notes about this action"
#     )
    
#     # For tracking field changes
#     field_changes = models.JSONField(
#         default=dict,
#         blank=True,
#         help_text="JSON field to track what fields were changed"
#     )
    
#     # IP address for audit trail
#     ip_address = models.GenericIPAddressField(
#         null=True,
#         blank=True,
#         help_text="IP address of the user who performed this action"
#     )
    
#     # Additional metadata
#     metadata = models.JSONField(
#         default=dict,
#         blank=True,
#         help_text="Additional metadata about the action"
#     )
    
#     class Meta:
#         ordering = ['-timestamp']
#         verbose_name = "ID Document History"
#         verbose_name_plural = "ID Document History"
        
#         indexes = [
#             models.Index(fields=['id_document', 'action']),
#             models.Index(fields=['member', 'action']),
#             models.Index(fields=['performed_by', 'timestamp']),
#             models.Index(fields=['action', 'timestamp']),
#         ]
    
#     def __str__(self):
#         if self.id_document:
#             return f"{self.id_document} - {self.get_action_display()}"
#         elif self.member:
#             return f"{self.member.full_name} - {self.get_action_display()}"
#         else:
#             return f"System Action - {self.get_action_display()}"
    
#     def save(self, *args, **kwargs):
#         # If id_document is set, auto-set member
#         if self.id_document and not self.member:
#             self.member = self.id_document.member
        
#         # Ensure member is set
#         if not self.member:
#             raise ValidationError("Member must be specified")
        
#         super().save(*args, **kwargs)
    
#     @property
#     def action_display(self):
#         """Get human-readable action display"""
#         return self.get_action_display()
    
#     @property
#     def performed_by_name(self):
#         """Get name of person who performed the action"""
#         if self.performed_by:
#             return self.performed_by.get_full_name() or self.performed_by.username
#         return "System"
    
#     @property
#     def document_type_display(self):
#         """Get document type display if document exists"""
#         if self.id_document:
#             return self.id_document.get_document_type_display()
#         return "N/A"
    
#     def get_changes_summary(self):
#         """Get a summary of field changes"""
#         if not self.field_changes:
#             return "No field changes recorded"
        
#         changes = []
#         for field, change_data in self.field_changes.items():
#             if isinstance(change_data, dict) and 'old' in change_data and 'new' in change_data:
#                 changes.append(f"{field}: '{change_data['old']}' → '{change_data['new']}'")
#             else:
#                 changes.append(f"{field}: {change_data}")
        
#         return "; ".join(changes) if changes else "No changes"


# class MemberDocumentRequest(models.Model):
#     """Model for tracking document requests sent to members"""
    
#     REQUEST_STATUS_CHOICES = [
#         ('pending', 'Pending'),
#         ('fulfilled', 'Fulfilled'),
#         ('overdue', 'Overdue'),
#         ('cancelled', 'Cancelled'),
#     ]
    
#     URGENCY_CHOICES = [
#         ('low', 'Low'),
#         ('medium', 'Medium'),
#         ('high', 'High'),
#         ('urgent', 'Urgent'),
#     ]
    
#     member = models.ForeignKey(
#         'MemberProfile',
#         on_delete=models.CASCADE,
#         related_name='document_requests',
#         help_text="Member from whom document is requested"
#     )
    
#     document_type = models.CharField(
#         max_length=25,
#         choices=MemberIDDocument.DOCUMENT_TYPE_CHOICES,
#         help_text="Type of document requested"
#     )
    
#     requested_by = models.ForeignKey(
#         settings.AUTH_USER_MODEL,
#         on_delete=models.SET_NULL,
#         null=True,
#         blank=True,
#         related_name='sent_document_requests',
#         help_text="Admin who requested the document"
#     )
    
#     priority = models.CharField(
#         max_length=15,
#         choices=MemberIDDocument.PRIORITY_CHOICES,
#         default='primary',
#         help_text="Document priority level"
#     )
    
#     urgency = models.CharField(
#         max_length=10,
#         choices=URGENCY_CHOICES,
#         default='medium',
#         help_text="Urgency of the request"
#     )
    
#     status = models.CharField(
#         max_length=15,
#         choices=REQUEST_STATUS_CHOICES,
#         default='pending',
#         help_text="Current status of the request"
#     )
    
#     # Timestamps
#     requested_at = models.DateTimeField(
#         auto_now_add=True,
#         help_text="When the request was made"
#     )
    
#     deadline = models.DateTimeField(
#         null=True,
#         blank=True,
#         help_text="Deadline for document submission"
#     )
    
#     fulfilled_at = models.DateTimeField(
#         null=True,
#         blank=True,
#         help_text="When the request was fulfilled"
#     )
    
#     # Fulfillment details
#     fulfilled_by_document = models.ForeignKey(
#         MemberIDDocument,
#         on_delete=models.SET_NULL,
#         null=True,
#         blank=True,
#         related_name='fulfilled_requests',
#         help_text="Document that fulfilled this request"
#     )
    
#     # Additional details
#     notes = models.TextField(
#         blank=True,
#         help_text="Additional notes or instructions for the member"
#     )
    
#     internal_notes = models.TextField(
#         blank=True,
#         help_text="Internal notes not visible to member"
#     )
    
#     # Reminder settings
#     reminder_sent = models.BooleanField(
#         default=False,
#         help_text="Whether reminder has been sent"
#     )
    
#     reminder_sent_at = models.DateTimeField(
#         null=True,
#         blank=True,
#         help_text="When reminder was sent"
#     )
    
#     class Meta:
#         ordering = ['-requested_at']
#         verbose_name = "Member Document Request"
#         verbose_name_plural = "Member Document Requests"
        
#         indexes = [
#             models.Index(fields=['status', 'deadline']),
#             models.Index(fields=['member', 'status']),
#             models.Index(fields=['document_type', 'status']),
#             models.Index(fields=['urgency', 'status']),
#         ]
    
#     def __str__(self):
#         return f"Request: {self.member.full_name} - {self.get_document_type_display()}"
    
#     def save(self, *args, **kwargs):
#         is_new = self.pk is None
#         old_status = None
        
#         # Get old status for comparison
#         if not is_new:
#             old_instance = MemberDocumentRequest.objects.get(pk=self.pk)
#             old_status = old_instance.status
        
#         # Check if deadline has passed
#         if self.deadline and self.deadline < timezone.now() and self.status == 'pending':
#             self.status = 'overdue'
        
#         super().save(*args, **kwargs)
        
#         # Create history record for new requests
#         if is_new:
#             IDDocumentHistory.objects.create(
#                 id_document=None,
#                 member=self.member,
#                 action='requested',
#                 performed_by=self.requested_by,
#                 notes=f"Document requested: {self.get_document_type_display()}",
#                 metadata={
#                     'request_id': self.pk,
#                     'deadline': self.deadline.isoformat() if self.deadline else None,
#                     'urgency': self.urgency,
#                     'priority': self.priority
#                 }
#             )
        
#         # Create history record for status changes
#         elif old_status and old_status != self.status:
#             IDDocumentHistory.objects.create(
#                 id_document=self.fulfilled_by_document,
#                 member=self.member,
#                 action=self.status,
#                 performed_by=getattr(self, '_status_changed_by', None),
#                 notes=f"Document request {self.status}: {self.get_document_type_display()}",
#                 metadata={
#                     'request_id': self.pk,
#                     'old_status': old_status,
#                     'new_status': self.status
#                 }
#             )
    
#     def mark_as_fulfilled(self, document, fulfilled_by=None):
#         """Mark request as fulfilled by a specific document"""
#         self._status_changed_by = fulfilled_by
#         self.status = 'fulfilled'
#         self.fulfilled_at = timezone.now()
#         self.fulfilled_by_document = document
#         self.save()
        
#         # Create history record
#         IDDocumentHistory.objects.create(
#             id_document=document,
#             member=self.member,
#             action='fulfilled',
#             performed_by=fulfilled_by,
#             notes=f"Document request fulfilled: {self.get_document_type_display()}",
#             metadata={
#                 'request_id': self.pk,
#                 'fulfilled_by_document_id': document.pk
#             }
#         )
    
#     def cancel_request(self, cancelled_by=None, reason=""):
#         """Cancel the document request"""
#         self._status_changed_by = cancelled_by
#         self.status = 'cancelled'
#         self.save()
        
#         # Create history record
#         IDDocumentHistory.objects.create(
#             id_document=None,
#             member=self.member,
#             action='cancelled',
#             performed_by=cancelled_by,
#             notes=f"Document request cancelled: {self.get_document_type_display()}. Reason: {reason}",
#             metadata={
#                 'request_id': self.pk,
#                 'cancellation_reason': reason
#             }
#         )
    
#     def send_reminder(self, sent_by=None):
#         """Mark reminder as sent"""
#         self.reminder_sent = True
#         self.reminder_sent_at = timezone.now()
#         self.save()
        
#         # Create history record
#         IDDocumentHistory.objects.create(
#             id_document=None,
#             member=self.member,
#             action='reminder_sent',
#             performed_by=sent_by,
#             notes=f"Reminder sent for document request: {self.get_document_type_display()}",
#             metadata={
#                 'request_id': self.pk,
#                 'reminder_sent_at': self.reminder_sent_at.isoformat()
#             }
#         )
    
#     @property
#     def is_overdue(self):
#         """Check if request is overdue"""
#         if self.deadline and self.status == 'pending':
#             return self.deadline < timezone.now()
#         return False
    
#     @property
#     def days_remaining(self):
#         """Get days remaining until deadline"""
#         if self.deadline and self.status == 'pending':
#             remaining = self.deadline - timezone.now()
#             return remaining.days
#         return None
    
#     @property
#     def days_overdue(self):
#         """Get days overdue if applicable"""
#         if self.deadline and self.status in ['pending', 'overdue']:
#             overdue = timezone.now() - self.deadline
#             return overdue.days if overdue.days > 0 else 0
#         return 0
    
#     def get_status_color(self):
#         """Get color code for status display"""
#         status_colors = {
#             'pending': 'warning',
#             'fulfilled': 'success',
#             'overdue': 'danger',
#             'cancelled': 'secondary',
#         }
#         return status_colors.get(self.status, 'primary')
    
#     def get_urgency_color(self):
#         """Get color code for urgency display"""
#         urgency_colors = {
#             'low': 'success',
#             'medium': 'warning',
#             'high': 'danger',
#             'urgent': 'danger',
#         }
#         return urgency_colors.get(self.urgency, 'primary')