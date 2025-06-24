import uuid
from django.core.management.base import BaseCommand
from gracecoop.models import LoanRepayment

def generate_source_reference(loan):
    return f"{loan.reference}-RP-{uuid.uuid4().hex[:6].upper()}"

class Command(BaseCommand):
    help = 'Assign source_reference to loan repayments that are missing it'

    def handle(self, *args, **options):
        repayments = LoanRepayment.objects.filter(source_reference__isnull=True)
        total = repayments.count()

        if not total:
            self.stdout.write(self.style.SUCCESS('No missing source_reference found.'))
            return

        updated = 0
        for repayment in repayments:
            if repayment.loan and repayment.loan.reference:
                repayment.source_reference = generate_source_reference(repayment.loan)
                repayment.save()
                updated += 1

        self.stdout.write(self.style.SUCCESS(f'Successfully updated {updated} repayment(s) with source_reference.'))
