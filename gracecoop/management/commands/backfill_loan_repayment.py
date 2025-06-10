from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db.models import Sum
from decimal import Decimal

from gracecoop.models import LoanRepaymentSchedule, LoanRepayment

class Command(BaseCommand):
    help = 'Backfill LoanRepayment records for schedules marked as paid but missing repayment entries, and capture surplus.'

    def handle(self, *args, **kwargs):
        count_created = 0
        count_skipped = 0
        surplus_count = 0

        paid_schedules = LoanRepaymentSchedule.objects.filter(is_paid=True)

        for schedule in paid_schedules:
            loan = schedule.loan

            # Check if repayment already exists
            if LoanRepayment.objects.filter(scheduled_installment=schedule).exists():
                self.stdout.write(f"⏭ Already has repayment, skipping schedule {schedule.id}")
                count_skipped += 1
                continue

            try:
                pay_amount = schedule.amount_due
                principal = min(pay_amount, schedule.principal)
                interest = max(Decimal('0.00'), pay_amount - principal)

                repayment = LoanRepayment.objects.create(
                    loan=loan,
                    scheduled_installment=schedule,
                    amount=pay_amount,
                    principal_component=principal,
                    interest_component=interest,
                    paid_by=loan.member.user if loan.member else None,
                    payment_date=schedule.due_date or timezone.now().date(),
                    due_date=schedule.due_date,
                )
                count_created += 1
                self.stdout.write(
                    self.style.SUCCESS(f"✅ Created LoanRepayment {repayment.id} for schedule {schedule.id}")
                )
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f"❌ Failed for schedule {schedule.id}: {str(e)}")
                )

        # Check for surplus payments across loans
        loans_with_paid_schedules = set(s.loan for s in paid_schedules)
        for loan in loans_with_paid_schedules:
            total_paid_on_schedules = LoanRepaymentSchedule.objects.filter(
                loan=loan, is_paid=True
            ).aggregate(total=Sum('amount_due'))['total'] or Decimal('0.00')

            total_recorded_in_repayments = LoanRepayment.objects.filter(
                loan=loan, scheduled_installment__isnull=False
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

            surplus = total_paid_on_schedules - total_recorded_in_repayments
            if surplus > 0:
                try:
                    surplus_repayment = LoanRepayment.objects.create(
                        loan=loan,
                        amount=surplus,
                        principal_component=surplus,
                        interest_component=Decimal('0.00'),
                        paid_by=loan.member.user if loan.member else None,
                        payment_date=timezone.now().date(),
                        due_date=None,
                        scheduled_installment=None,
                    )
                    surplus_count += 1
                    self.stdout.write(
                        self.style.WARNING(f"⚠️  Surplus repayment recorded (ID {surplus_repayment.id}) for loan {loan.id}: {surplus}")
                    )
                except Exception as e:
                    self.stdout.write(
                        self.style.ERROR(f"❌ Failed to record surplus for loan {loan.id}: {str(e)}")
                    )

        self.stdout.write(
            self.style.SUCCESS(
                f"\n🎉 Backfill completed: {count_created} repayments created, "
                f"{count_skipped} skipped, {surplus_count} surplus entries added."
            )
        )
