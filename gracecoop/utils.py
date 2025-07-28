# utils.py

import uuid
from gracecoop.models import MemberProfile
from dateutil.relativedelta import relativedelta
from decimal import Decimal,ROUND_HALF_UP
from .models import (LoanRepaymentSchedule, 
                     LoanRepayment, Loan, 
                     MemberProfile, )

from django.utils import timezone
from django.db.models import Sum
import datetime
from django.utils.crypto import get_random_string
from django.db import transaction
from io import BytesIO
from django.template.loader import render_to_string
from weasyprint import HTML
from django.conf import settings
import qrcode
import base64
import os
from PIL import Image
from rest_framework.views import exception_handler
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from django.core.mail import send_mail
import requests
import logging



def create_member_profile_if_not_exists(user):
    # Check if the profile already exists
    try:
        profile = user.memberprofile
    except MemberProfile.DoesNotExist:
        # Create MemberProfile if not exists
        profile = MemberProfile.objects.create(
            user=user,
            full_name=user.username,  # Default full name
            email=user.email,
            phone_number="",  # Default empty values 
            address="",
            status='pending',
        )
        print(f"✅ MemberProfile created for {user.username}")
    
    return profile

def generate_loan_reference(category_abbreviation):
    prefix = category_abbreviation.upper()
    date_str = datetime.datetime.now().strftime('%Y%m%d')
    random_part = get_random_string(length=6, allowed_chars='0123456789')
    return f"LN-{prefix}-{date_str}-{random_part}"


def generate_repayment_schedule(loan):
    """
    Generate repayment schedule where interest is calculated on remaining balance
    at each installment. Creates unified schedule for all disbursements.
    """
    # Clear old schedule
    loan.repayment_schedule.all().delete()
    
    disbursements = loan.disbursements.all()
    if not disbursements.exists():
        return False
    
    # Calculate total disbursed amount
    total_disbursed = disbursements.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
    
    monthly_interest_rate = loan.interest_rate / Decimal('100') / 12
    
    # Use loan duration, not individual disbursement months
    months = loan.duration_months
    
    # Calculate monthly payment using amortization formula on total disbursed amount
    if monthly_interest_rate > 0:
        numerator = monthly_interest_rate * (1 + monthly_interest_rate) ** months
        denominator = (1 + monthly_interest_rate) ** months - 1
        monthly_payment = (total_disbursed * numerator / denominator).quantize(
            Decimal('0.01'), rounding=ROUND_HALF_UP
        )
    else:
        # If no interest, just divide principal equally
        monthly_payment = (total_disbursed / months).quantize(
            Decimal('0.01'), rounding=ROUND_HALF_UP
        )
    
    # Use first disbursement date for schedule start
    first_disbursement = disbursements.order_by('disbursed_at').first()
    first_due = first_disbursement.disbursed_at.date() + relativedelta(months=1)
    
    # Use the most recent disbursement as the primary reference
    primary_disbursement = disbursements.order_by('-disbursed_at').first()
    
    remaining_balance = total_disbursed
    schedule_items = []
    
    for i in range(months):
        # Calculate interest on remaining balance
        interest_payment = (remaining_balance * monthly_interest_rate).quantize(
            Decimal('0.01'), rounding=ROUND_HALF_UP
        )
        
        # Principal payment is the difference
        principal_payment = monthly_payment - interest_payment
        
        # For the last installment, adjust to clear any remaining balance
        if i == months - 1:
            principal_payment = remaining_balance
            monthly_payment = interest_payment + principal_payment
        
        due_date = first_due + relativedelta(months=i)
        
        schedule_items.append(
            LoanRepaymentSchedule(
                loan=loan,
                disbursement=primary_disbursement,
                installment=i + 1,
                due_date=due_date,
                principal=principal_payment,
                interest=interest_payment,
                amount_due=monthly_payment,
                is_paid=False,
            )
        )
        
        # Update remaining balance
        remaining_balance -= principal_payment
    
    LoanRepaymentSchedule.objects.bulk_create(schedule_items)
    print(f"Generated {len(schedule_items)} installments for total disbursed: {total_disbursed}")
    return True

def update_loan_disbursement_status(loan):
    with transaction.atomic():
        total_disbursed = loan.disbursements.aggregate(total=Sum('amount'))['total'] or 0
        loan.disbursed_amount = total_disbursed
        
        if total_disbursed >= loan.amount:
            # Fully disbursed
            loan.status = 'disbursed'
            loan.remaining_disbursement = False
            loan.total_repayment_months = loan.duration_months
        else:
            # Still partial
            loan.status = 'partially_disbursed'
            loan.remaining_disbursement = True
        
        # Set start, repayment, and end dates
        first_disbursement = loan.disbursements.order_by('disbursed_at').first()
        if first_disbursement:
            loan.start_date = first_disbursement.disbursed_at.date()
            loan.repayment_start_date = first_disbursement.disbursed_at.date()
            months = loan.total_repayment_months or loan.duration_months
            if months:
                loan.end_date = loan.start_date + relativedelta(months=months)
        else:
            # fallback
            loan.start_date = timezone.now().date()
        
        loan.has_interest_schedule = True
        loan.save()
        
        # ✅ Regenerate the repayment schedule based on updated disbursements
        regenerate_repayment_schedule(loan)

def regenerate_repayment_schedule(loan):
    """
    Regenerate repayment schedule while preserving paid installments.
    Creates a unified schedule based on total disbursed amount.
    """
    
    # Step 1: Get all disbursements
    disbursements = loan.disbursements.all()
    if not disbursements.exists():
        print("No disbursements found.")
        return
    
    # Step 2: Calculate total disbursed amount
    total_disbursed = disbursements.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
    
    # Step 3: Use the same monthly interest rate calculation as generate_repayment_schedule
    monthly_interest_rate = loan.interest_rate / Decimal('100') / 12
    
    # Step 4: Get all paid installments (across all disbursements)
    paid_installments = LoanRepaymentSchedule.objects.filter(
        loan=loan, 
        is_paid=True
    ).order_by('installment')
    
    # Step 5: Delete all unpaid schedule entries
    LoanRepaymentSchedule.objects.filter(
        loan=loan, 
        is_paid=False
    ).delete()
    
    # Step 6: Calculate remaining principal across all disbursements
    total_paid_principal = paid_installments.aggregate(
        total=Sum('principal')
    )['total'] or Decimal('0.00')
    
    remaining_principal = total_disbursed - total_paid_principal
    
    if remaining_principal <= 0:
        print("No remaining principal to schedule")
        return
    
    # Step 7: Calculate remaining months
    # Use the loan's duration, not individual disbursement months
    total_months = loan.duration_months
    months_remaining = total_months - paid_installments.count()
    months_remaining = max(1, months_remaining)
    
    # Step 8: Calculate monthly payment using the same formula as generate_repayment_schedule
    if monthly_interest_rate > 0:
        numerator = monthly_interest_rate * (1 + monthly_interest_rate) ** months_remaining
        denominator = (1 + monthly_interest_rate) ** months_remaining - 1
        monthly_payment = (remaining_principal * numerator / denominator).quantize(
            Decimal('0.01'), rounding=ROUND_HALF_UP
        )
    else:
        # If no interest, just divide principal equally
        monthly_payment = (remaining_principal / months_remaining).quantize(
            Decimal('0.01'), rounding=ROUND_HALF_UP
        )
    
    # Step 9: Determine the next due date and installment number
    if paid_installments.exists():
        last_paid_installment = paid_installments.last()
        next_due_date = last_paid_installment.due_date + relativedelta(months=1)
        next_installment_number = last_paid_installment.installment + 1
    else:
        # No paid installments, start from first disbursement date
        first_disbursement = disbursements.order_by('disbursed_at').first()
        next_due_date = first_disbursement.disbursed_at.date() + relativedelta(months=1)
        next_installment_number = 1
    
    # Step 10: Generate new unified schedule entries
    remaining_balance = remaining_principal
    schedule_items = []
    
    # For partial disbursements, we need to link to the most recent disbursement
    # or create a logical association
    primary_disbursement = disbursements.order_by('-disbursed_at').first()
    
    for i in range(months_remaining):
        # Calculate interest on remaining balance
        interest_payment = (remaining_balance * monthly_interest_rate).quantize(
            Decimal('0.01'), rounding=ROUND_HALF_UP
        )
        
        # Principal payment is the difference
        principal_payment = monthly_payment - interest_payment
        
        # For the last installment, adjust to clear any remaining balance
        if i == months_remaining - 1:
            principal_payment = remaining_balance
            monthly_payment = interest_payment + principal_payment
        
        due_date = next_due_date + relativedelta(months=i)
        
        schedule_items.append(
            LoanRepaymentSchedule(
                loan=loan,
                disbursement=primary_disbursement,  # Link to primary disbursement
                installment=next_installment_number + i,
                due_date=due_date,
                principal=principal_payment,
                interest=interest_payment,
                amount_due=monthly_payment,
                is_paid=False,
            )
        )
        
        # Update remaining balance
        remaining_balance -= principal_payment
    
    # Step 11: Bulk create the schedule items
    LoanRepaymentSchedule.objects.bulk_create(schedule_items)
    print(f"Regenerated {len(schedule_items)} installments for loan {loan.id}")
    print(f"Total disbursed: {total_disbursed}, Remaining principal: {remaining_principal}")
    
    return True


def apply_loan_repayment(loan, amount, paid_by_user, payoff, source_reference):
    """
    Apply loan repayment correctly by allocating payment to unpaid installments
    in chronological order, properly tracking principal and interest components.
    """
    print(f"➡️ apply_loan_repayment called with amount={amount:.2f}, payoff={payoff}, ref={source_reference}")
    
    try:
        with transaction.atomic():
            # Use select_for_update for proper locking
            loan = Loan.objects.select_for_update().get(pk=loan.pk)
            
            # Check for duplicate payments
            if LoanRepayment.objects.filter(source_reference=source_reference).exists():
                print(f"⏩ Repayment already exists for {source_reference}, skipping.")
                return LoanRepayment.objects.filter(source_reference=source_reference).first()
            
            if amount <= 0:
                raise ValueError("Payment amount must be greater than zero")
            
            # Get unpaid installments in chronological order with locking
            unpaid_installments = LoanRepaymentSchedule.objects.select_for_update().filter(
                loan=loan,
                is_paid=False
            ).order_by('due_date')
            
            if not unpaid_installments.exists():
                print("⚠️ No unpaid installments found.")
                raise ValueError("No unpaid installments found for this loan")
            
            # Calculate outstanding balance for validation
            total_loan_amount = loan.amount
            total_interest = loan.repayment_schedule.aggregate(total=Sum('interest'))['total'] or Decimal('0.00')
            total_paid = loan.repayments.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            outstanding_amount = total_loan_amount + total_interest - total_paid
            
            # Allow overpayment for payoff scenarios, but validate for regular payments
            if not payoff and amount > outstanding_amount:
                raise ValueError(f"Payment amount {amount} exceeds outstanding balance {outstanding_amount}")
            
            remaining_payment = Decimal(str(amount))
            total_interest_paid = Decimal('0.00')
            total_principal_paid = Decimal('0.00')
            installments_affected = []
            first_installment = None
            
            # Process each unpaid installment
            for installment in unpaid_installments:
                if remaining_payment <= 0:
                    break
                    
                # Calculate how much has already been paid on this installment
                already_paid = installment.repayments.aggregate(
                    total=Sum('amount')
                )['total'] or Decimal('0.00')
                
                amount_still_owed = installment.amount_due - already_paid
                
                if amount_still_owed <= 0:
                    # This installment is already fully paid, skip it
                    continue
                    
                # Determine how much to apply to this installment
                payment_for_installment = min(remaining_payment, amount_still_owed)
                
                # Calculate interest and principal components for this payment
                # First pay interest, then principal
                unpaid_interest = installment.interest - (
                    installment.repayments.aggregate(
                        total=Sum('interest_component')
                    )['total'] or Decimal('0.00')
                )
                
                interest_component = min(payment_for_installment, unpaid_interest)
                principal_component = payment_for_installment - interest_component
                
                # Create repayment record for this installment portion
                LoanRepayment.objects.create(
                    loan=loan,
                    amount=payment_for_installment,
                    principal_component=principal_component,
                    interest_component=interest_component,
                    paid_by=paid_by_user,
                    payment_date=timezone.now().date(),
                    scheduled_installment=installment,
                    due_date=installment.due_date,
                    was_late=timezone.now().date() > installment.due_date,
                    source_reference=f"{source_reference}_inst_{installment.installment}" if len(unpaid_installments) > 1 else source_reference
                )
                
                # Update totals
                total_interest_paid += interest_component
                total_principal_paid += principal_component
                remaining_payment -= payment_for_installment
                installments_affected.append(installment)
                
                # Track first installment for reference
                if not first_installment:
                    first_installment = installment
                
                # Check if this installment is now fully paid
                total_paid_on_installment = installment.repayments.aggregate(
                    total=Sum('amount')
                )['total'] or Decimal('0.00')
                
                if total_paid_on_installment >= installment.amount_due:
                    installment.is_paid = True
                    installment.save()
                    print(f"✅ Paid {payment_for_installment:.2f} toward installment #{installment.installment} and marked as paid")
            
            # Handle overpayment if any remains
            if remaining_payment > 0:
                print(f"💰 Overpayment detected: {remaining_payment:.2f}")
                LoanRepayment.objects.create(
                    loan=loan,
                    amount=remaining_payment,
                    principal_component=remaining_payment,  # Treat overpayment as principal
                    interest_component=Decimal('0.00'),
                    paid_by=paid_by_user,
                    payment_date=timezone.now().date(),
                    was_late=False,
                    source_reference=f"{source_reference}_overpay"
                )
                total_principal_paid += remaining_payment
            
            # Return the first repayment record created as the main repayment
            main_repayment = LoanRepayment.objects.filter(
                loan=loan,
                source_reference__startswith=source_reference
            ).first()
            
            print(f"✅ Repayment record created for ref: {source_reference} — total: {amount:.2f}")
            print(f"   Interest paid: {total_interest_paid:.2f}, Principal paid: {total_principal_paid:.2f}")
            
            # Mark loan as PAID if payoff or all installments paid
            if payoff or not LoanRepaymentSchedule.objects.filter(loan=loan, is_paid=False).exists():
                loan.status = 'paid'
                loan.save()
                print(f"🏁 Loan {loan.pk} marked as PAID")
            
            return main_repayment
            
    except Exception as e:
        print(f"❌ Repayment application failed: {e}")
        raise
####################################################################################
def generate_payment_reference(member, payment_type):
    member_id_str = str(member.id).zfill(6)  # Ensures 6-digit format
    unique_suffix = uuid.uuid4().hex[:6].upper()
    return f"GC-{payment_type.upper()}-{member_id_str}-{unique_suffix}"

def generate_payment_receipt(payment):
    base_url = getattr(settings, 'BASE_URL', 'http://localhost:8000')

    # Generate QR code for receipt verification
    verify_url = f"{base_url}/api/members/payment/verify-receipt/{payment.reference}/"
    qr = qrcode.make(verify_url)
    small_qr = qr.resize((100, 100), Image.Resampling.LANCZOS)
    qr_buffer = BytesIO()
    small_qr.save(qr_buffer, format="PNG")
    qr_b64 = base64.b64encode(qr_buffer.getvalue()).decode()

    # Base64-encoding logo so it is *embedded* in the HTML
    logo_path = os.path.join(settings.BASE_DIR, 'gracecoop', 'static', 'images', 'logo.png')
    with open(logo_path, 'rb') as f:
        logo_data = f.read()
    logo_b64 = base64.b64encode(logo_data).decode()
    logo_url = f"data:image/png;base64,{logo_b64}"

    # Determine loan reference if applicable
    loan_reference = getattr(payment, "loan", None)
    loan_reference = loan_reference.reference if loan_reference else None

    # Render the receipt template with context
    context = {
        "coop_name": "Grace Coop",
        "payment": payment,
        "amount_words": payment.amount_to_words(),
        "qr_code": qr_b64,
        "verify_url": verify_url,
        "logo_url": logo_url,
        "loan_reference": loan_reference,
        "payment_source_reference": payment.source_reference or payment.reference,  # fallback
    }

    html_string = render_to_string("receipt_template.html", context)

    # Convert HTML to PDF
    pdf_buffer = BytesIO()
    HTML(string=html_string, base_url=base_url).write_pdf(pdf_buffer)

    return pdf_buffer

def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if isinstance(exc, PermissionDenied):
        return Response({'detail': 'Forbidden: You do not have access to this resource.'}, status=403)

    return response

def send_verification_email(to_email, token):
    subject = "Verify your GraceCoop Account"
    
    verification_link = f"{settings.FRONTEND_URL}/verify-email?token={token}"
    
    message = (
        f"Hello,\n\n"
        f"Thank you for registering with GraceCoop.\n\n"
        f"Please verify your email address by clicking the link below:\n\n"
        f"{verification_link}\n\n"
        f"If you did not create this account, please ignore this email.\n\n"
        f"Regards,\n"
        f"The GraceCoop Team"
    )
    
    send_mail(
        subject,
        message,
        settings.DEFAULT_FROM_EMAIL,
        [to_email],
        fail_silently=False
    )

def send_password_reset_email(to_email, token):
    subject = "GraceCoop Password Reset"
    reset_link = f"{settings.FRONTEND_URL}/reset-password?token={token}"

    message = (
        f"Hello,\n\n"
        f"We received a request to reset your GraceCoop password.\n\n"
        f"You can reset it using the link below:\n\n"
        f"{reset_link}\n\n"
        f"If you did not request a password reset, please ignore this email.\n\n"
        f"Regards,\n"
        f"The GraceCoop Team"
    )

    send_mail(
        subject,
        message,
        settings.DEFAULT_FROM_EMAIL,
        [to_email],
        fail_silently=False
    )




def upload_receipt_to_supabase(file, filename):
    path = f"receipts/{filename}"
    upload_url = f"{settings.SUPABASE_URL}/storage/v1/object/{settings.SUPABASE_BUCKET}/{path}"

    headers = {
        "Authorization": f"Bearer {settings.SUPABASE_SERVICE_KEY}",
        "Content-Type": file.content_type,
    }

    file.seek(0)  # reset pointer to start, just in case
    response = requests.put(
        upload_url,
        headers=headers,
        data=file.read(),
    )

    if not response.ok:
        raise Exception(f"Supabase upload failed: {response.text}")

    public_url = (
        f"{settings.SUPABASE_URL}/storage/v1/object/public/{settings.SUPABASE_BUCKET}/{path}"
    )
    return public_url

logger = logging.getLogger(__name__)
def upload_document_to_supabase(file, filename):
    """Upload document file to Supabase storage"""
    try:
        import requests
        
        # Upload file to Supabase storage
        upload_url = f"{settings.SUPABASE_URL}/storage/v1/object/{settings.SUPABASE_BUCKET}/{filename}"
        
        headers = {
            'Authorization': f'Bearer {settings.SUPABASE_SERVICE_KEY}',
            'apikey': settings.SUPABASE_SERVICE_KEY,
            'Content-Type': file.content_type or 'application/octet-stream'
        }
        
        response = requests.post(upload_url, headers=headers, data=file.read())
        
        if response.status_code in [200, 201]:
            # Return public URL
            public_url = f"{settings.SUPABASE_URL}/storage/v1/object/public/{settings.SUPABASE_BUCKET}/{filename}"
            return public_url
        else:
            logger.error(f"Supabase upload failed: Status {response.status_code}, Response: {response.text}")
            raise Exception(f"Upload failed with status {response.status_code}")
            
    except Exception as e:
        logger.error(f"Error uploading to Supabase: {str(e)}")
        raise
