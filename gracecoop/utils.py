# utils.py

import uuid
from gracecoop.models import MemberProfile
from datetime import timedelta
from dateutil.relativedelta import relativedelta
from decimal import Decimal,ROUND_HALF_UP
from .models import LoanRepaymentSchedule, LoanRepayment, Loan
from django.utils import timezone
from django.db.models import Sum
import datetime
from django.utils.crypto import get_random_string
from django.db import transaction
from io import BytesIO
from django.template.loader import render_to_string
from weasyprint import HTML, CSS
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
    # Clear old schedule
    loan.repayment_schedule.all().delete()

    disbursements = loan.disbursements.all()
    if not disbursements.exists():
        return False  # No disbursements

    monthly_interest_rate = loan.interest_rate / Decimal('100') / 12  # Annual to monthly

    schedule_items = []

    for disb in disbursements:
        principal = disb.amount
        months = disb.repayment_months

        monthly_principal = (principal / months).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        remaining_principal = principal

        first_due = disb.disbursed_at.date() + relativedelta(months=1)

        for i in range(months):
            interest = (remaining_principal * monthly_interest_rate).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            total_due = (monthly_principal + interest).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            due_date = first_due + relativedelta(months=i)

            schedule_items.append(
                LoanRepaymentSchedule(
                    loan=loan,
                    disbursement=disb,
                    installment=i + 1,
                    due_date=due_date,
                    principal=monthly_principal,
                    interest=interest,
                    amount_due=total_due,
                    is_paid=False,
                )
            )

            remaining_principal -= monthly_principal

    LoanRepaymentSchedule.objects.bulk_create(schedule_items)
    return True


def update_loan_disbursement_status(loan):
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

    if not loan.start_date:
        loan.start_date = timezone.now().date()

    loan.has_interest_schedule = True  # ✅  Allow interest on partial disbursement
    loan.save()

    # ✅ Regenerate the repayment schedule based on updated disbursements
    regenerate_repayment_schedule(loan)



def regenerate_repayment_schedule(loan):
    # Step 1: Get all disbursements
    disbursements = loan.disbursements.all()
    if not disbursements.exists():
        print("No disbursements found.")
        return

    # Step 2: Identify fully paid installments
    paid_installments = LoanRepaymentSchedule.objects.filter(loan=loan, is_paid=True)

    # Step 3: Delete all unpaid schedule entries
    LoanRepaymentSchedule.objects.filter(loan=loan, is_paid=False).delete()

    # Step 4: Calculate principal remaining per disbursement
    total_paid_principal = paid_installments.aggregate(total=Sum('principal'))['total'] or Decimal('0.00')
    total_disbursed = disbursements.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

    principal_remaining = total_disbursed - total_paid_principal

    if principal_remaining <= 0:
        print("Nothing left to schedule.")
        return

    # Step 5: Define remaining months
    months_remaining = loan.duration_months - paid_installments.count()
    months_remaining = max(1, months_remaining)

    # Step 6: Calculate EMI over remaining principal
    monthly_rate = loan.interest_rate / Decimal('100')  # Convert annual to monthly

    if monthly_rate > 0:
        emi = (principal_remaining * monthly_rate * (1 + monthly_rate)**months_remaining) / \
              ((1 + monthly_rate)**months_remaining - 1)
    else:
        emi = principal_remaining / months_remaining

    # Step 7: Get latest disbursement (for tagging)
    latest_disbursement = disbursements.order_by('-disbursed_at').first()

    # Step 8: Generate new repayment schedule
    start_date = loan.start_date or timezone.now().date()
    next_due_date = start_date + relativedelta(months=paid_installments.count() + 1)

    balance = principal_remaining

    for i in range(months_remaining):
        interest = (balance * monthly_rate).quantize(Decimal('0.01'))
        principal = (emi - interest).quantize(Decimal('0.01'))
        amount_due = (principal + interest).quantize(Decimal('0.01'))

        LoanRepaymentSchedule.objects.create(
            loan=loan,
            disbursement=latest_disbursement,
            installment=paid_installments.count() + i + 1,
            due_date=next_due_date,
            principal=principal,
            interest=interest,
            amount_due=amount_due,
            is_paid=False,
        )

        balance -= principal
        next_due_date += relativedelta(months=1)

    print(f"Regenerated repayment schedule for loan {loan.id}.")



def apply_loan_repayment(loan, amount, paid_by_user, payoff, source_reference):
    print(f"➡️ apply_loan_repayment called with amount={amount:.2f}, payoff={payoff}, ref={source_reference}")

    try:
        with transaction.atomic():
            loan = Loan.objects.select_for_update().get(pk=loan.pk)

            if LoanRepayment.objects.filter(source_reference=source_reference).exists():
                print(f"⏩ Repayment already exists for {source_reference}, skipping.")
                return

            # Calculate outstanding balance fresh
            total_loan_amount = loan.amount
            total_interest = loan.repayment_schedule.aggregate(total=Sum('interest'))['total'] or Decimal('0.00')
            total_paid = loan.repayments.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            outstanding_amount = total_loan_amount + total_interest - total_paid

            if amount > outstanding_amount:
                raise ValueError(f"Payment amount {amount} exceeds outstanding balance {outstanding_amount}")

            installments = LoanRepaymentSchedule.objects.select_for_update().filter(
                loan=loan,
                is_paid=False
            ).order_by('due_date')

            if not installments.exists():
                print("⚠️ No unpaid installments found.")
                return

            remaining_amount = Decimal(amount)
            total_applied = Decimal("0.00")
            first_installment = None

            for installment in installments:
                if remaining_amount <= 0:
                    break

                installment_due = installment.amount_due
                pay_amount = min(remaining_amount, installment_due)

                remaining_amount -= pay_amount
                total_applied += pay_amount

                installment.is_paid = True
                installment.save()

                print(f"✅ Paid {pay_amount:.2f} toward installment #{installment.pk} and marked as paid")

                if not first_installment:
                    first_installment = installment

            was_late = timezone.now().date() > first_installment.due_date if first_installment else False

            # Record full payment amount from gateway, not just applied amount
            LoanRepayment.objects.create(
                loan=loan,
                amount=Decimal(amount),  # Full amount paid recorded here
                principal_component=Decimal("0.00"), 
                interest_component=Decimal("0.00"),
                paid_by=paid_by_user,
                payment_date=timezone.now().date(),
                was_late=was_late,
                due_date=first_installment.due_date if first_installment else None,
                scheduled_installment=first_installment,
                source_reference=source_reference
            )

            print(f"✅ Repayment record created for ref: {source_reference} — total: {amount:.2f}")

            # Mark loan as PAID if payoff or all installments paid
            if payoff or not LoanRepaymentSchedule.objects.filter(loan=loan, is_paid=False).exists():
                loan.status = 'paid'
                loan.save()
                print(f"🏁 Loan {loan.pk} marked as PAID")

    except Exception as e:
        print(f"❌ Repayment application failed: {e}")
        raise

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


