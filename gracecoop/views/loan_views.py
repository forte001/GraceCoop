
from rest_framework import viewsets, status, generics, filters
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from ..permissions import IsAdminUser
from django.db.models import Sum
from django.utils import timezone
from rest_framework.decorators import action
from rest_framework.response import Response
from decimal import Decimal, InvalidOperation
from ..utils import (generate_repayment_schedule,
                    update_loan_disbursement_status,
                    generate_loan_reference,
                    apply_loan_repayment
                    )
from django_filters.rest_framework import DjangoFilterBackend
from ..filters import RepaymentFilter
from gracecoop.pagination import StandardResultsSetPagination


from gracecoop.models import (
    Loan, 
    LoanCategory, 
    LoanApplication,
    DisbursementLog,
    LoanRepayment,
      )
from ..serializers import (
    LoanSerializer, 
    LoanCategorySerializer,
    LoanApplicationSerializer,
    RepaymentSerializer,
    LoanRepaymentScheduleSerializer
    )
from ..permissions import (
    CanCreateLoanCategory, 
    CanEditLoanCategory, 
    CanDeleteLoanCategory,
    CanApproveLoan, 
    CanDeleteLoan, 
    CanDisburseLoan,
    CanApproveGracePeriod,
    )

class LoanCategoryViewSet(viewsets.ModelViewSet):
    queryset = LoanCategory.objects.all()
    serializer_class = LoanCategorySerializer

    def get_permissions(self):
        if self.action == 'create':
            permission_classes = [IsAdminUser, CanCreateLoanCategory]
        elif self.action in ['update', 'partial_update']:
            permission_classes = [IsAdminUser, CanEditLoanCategory]
        elif self.action == 'destroy':
            permission_classes = [IsAdminUser, CanDeleteLoanCategory]
        elif self.action in ['list', 'retrieve']:
            permission_classes = [IsAuthenticated]
        else:
            permission_classes = [IsAdminUser]
        return [permission() for permission in permission_classes]
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.loan_set.exists() or instance.loanapplication_set.exists():
            return Response(
                {"error": "Cannot delete category with linked loans or applications."},
                status=status.HTTP_400_BAD_REQUEST
            )
        return super().destroy(request, *args, **kwargs)


#####################################################################################
#  ADMIN LOAN VIEWSET
#####################################################################################

class AdminLoanViewSet(viewsets.ModelViewSet):
    queryset = Loan.objects.all()
    serializer_class = LoanSerializer
    permission_classes = [IsAdminUser]

    def get_permissions(self):
        if self.action == 'approve':
            return [IsAdminUser(), CanApproveLoan()]
        elif self.action == 'disburse':
            return [IsAdminUser(), CanDisburseLoan()]
        elif self.action == 'destroy':
            return [IsAdminUser(), CanDeleteLoan()]
        elif self.action == 'approve_grace_period':
            return [IsAdminUser(), CanApproveGracePeriod()]
        return [IsAdminUser()]

    @action(detail=True, methods=['post'], url_path='approve')
    def approve(self, request, pk=None):
        loan = self.get_object()
        if loan.status != 'pending':
            return Response({'error': 'Loan has already been processed.'}, status=400)

        loan.status = 'approved'
        loan.approved_by = request.user
        loan.approved_at = timezone.now()
        loan.save()
        return Response({'status': 'approved'})

    @action(detail=True, methods=['post'], url_path='disburse')
    def disburse(self, request, pk=None):
        loan = self.get_object()
        amount = request.data.get('amount')
        num_disbursements = request.data.get('num_disbursements')
        remaining_flag = request.data.get('remaining_disbursement', False)

        if not amount:
            return Response({'error': 'Amount is required.'}, status=400)

        try:
            amount = Decimal(amount)
        except (ValueError, TypeError, InvalidOperation):
            return Response({'error': 'Invalid amount.'}, status=400)

        if amount <= 0:
            return Response({'error': 'Amount must be positive.'}, status=400)

        total_disbursed = loan.disbursements.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        if total_disbursed + amount > loan.amount:
            return Response({'error': 'Disbursement exceeds approved loan amount.'}, status=400)

        if not loan.num_disbursements and num_disbursements:
            try:
                loan.num_disbursements = int(num_disbursements)
            except ValueError:
                return Response({'error': 'Invalid number of disbursements.'}, status=400)

        loan.remaining_disbursement = bool(remaining_flag)

        DisbursementLog.objects.create(
            loan=loan,
            amount=amount,
            repayment_months=loan.duration_months,
            disbursed_by=request.user
        )

        if not loan.start_date:
            loan.start_date = timezone.now().date()

        update_loan_disbursement_status(loan)

        return Response({'message': f'{amount} disbursed successfully.'})

    @action(detail=True, methods=['post'], url_path='apply-grace-period')
    def apply_grace_period(self, request, pk=None):
        loan = self.get_object()

        if loan.status not in ['disbursed', 'partially_disbursed']:
            return Response({'error': 'Cannot apply grace period to loans not in disbursed state.'}, status=400)

        if loan.grace_applied:
            return Response({'error': 'Grace period has already been applied to this loan.'}, status=400)

        if not loan.category.grace_period_months or loan.category.grace_period_months <= 0:
            return Response({"error": "This loan category does not have a grace period defined."}, status=400)

        loan.total_repayment_months += loan.category.grace_period_months
        loan.grace_applied = True
        loan.save()

        return Response({'message': f'{loan.category.grace_period_months} months grace period applied.'})

    @action(detail=True, methods=['get'], url_path='summary')
    def summary(self, request, pk=None):
        loan = self.get_object()
        total_disbursed = loan.disbursements.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        total_paid = loan.repayments.aggregate(total=Sum('amount'))['total'] or 0
        remaining_balance = loan.amount - total_disbursed

        member_name = loan.member.full_name if loan.member and loan.member.user else ''

        summary_data = {
            'loan_id': loan.id,
            'member_name': member_name,
            'loan_amount': loan.amount,
            'total_disbursed': total_disbursed,
            'disbursed_at': loan.disbursed_at,
            'remaining_balance': remaining_balance,
            'status': loan.status,
            'interest_rate': loan.interest_rate,
            'grace_period_months': loan.category.grace_period_months,
            'grace_applied': loan.grace_applied,
            'total_repayment_months': loan.total_repayment_months,
            'start_date': loan.start_date,
            'end_date': loan.end_date,
            'reference': loan.reference,
            'total_paid': total_paid
        }

        return Response(summary_data)

    @action(detail=True, methods=['get'], url_path='repayment-schedule')
    def repayment_schedule(self, request, pk=None):
        loan = self.get_object()

        if not loan.repayment_schedule.exists():
            generate_repayment_schedule(loan)

        schedule = loan.repayment_schedule.prefetch_related('repayments').order_by('due_date')
        if not schedule.exists():
            return Response({'message': 'No repayment schedule found.'}, status=404)

        serializer = LoanRepaymentScheduleSerializer(schedule, many=True)
        return Response(serializer.data)



#####################################################################################
#  MEMBER LOAN VIEWSET
#####################################################################################

class MemberLoanViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = LoanSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Loan.objects.filter(member__user=self.request.user)

    @action(detail=True, methods=['get'], url_path='summary')
    def summary(self, request, pk=None):
        loan = self.get_object()
        serializer = self.get_serializer(loan)
        return Response(serializer.data)

    @action(detail=True, methods=['get'], url_path='repayment-schedule')
    def repayment_schedule(self, request, pk=None):
        loan = self.get_object()

        if not loan.repayment_schedule.exists():
            generate_repayment_schedule(loan)

        schedule = loan.repayment_schedule.prefetch_related('repayments').order_by('due_date')
        if not schedule.exists():
            return Response({'message': 'No repayment schedule found.'}, status=404)

        serializer = LoanRepaymentScheduleSerializer(schedule, many=True)
        return Response(serializer.data)

    
    @action(detail=True, methods=['post'], url_path='repay')
    def repay(self, request, pk=None):
        loan = self.get_object()
        serializer = RepaymentSerializer(data=request.data, context={'loan': loan})
        serializer.is_valid(raise_exception=True)

        repayment = apply_loan_repayment(loan, serializer.validated_data['amount'], request.user)

        return Response({
            'message': 'Repayment successful.',
            'repayment': {
                'id': repayment.id,
                'amount': repayment.amount,
                'interest_component': repayment.interest_component,
                'principal_component': repayment.principal_component,
                'paid_at': repayment.payment_date
            }
        })



    @action(detail=True, methods=['post'], url_path='payoff')
    def payoff(self, request, pk=None):
        loan = self.get_object()

        if loan.status not in ['disbursed', 'partially_disbursed']:
            return Response({'error': 'Only disbursed loans can be paid off.'}, status=400)

        total_loan_amount = loan.amount
        total_interest = loan.repayment_schedule.aggregate(total=Sum('interest'))['total'] or Decimal('0.00')
        total_paid = loan.repayments.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

        outstanding_amount = total_loan_amount + total_interest - total_paid

        if outstanding_amount <= 0:
            return Response({'message': 'Loan is already fully paid.'})

        return Response({
            'message': 'Payoff amount calculated.',
            'payoff_amount': float(outstanding_amount),
        })




    

    #################################################################
    # LOAN APPLICATION VIEWSETS
    #################################################################

class BaseLoanApplicationViewSet(viewsets.ModelViewSet):
    queryset = LoanApplication.objects.none()  # overridden in child
    serializer_class = LoanApplicationSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        category = serializer.validated_data.get('category')
        if category is None:
            raise serializer.ValidationError("Category is required.")
        serializer.save(
            applicant=self.request.user,
            interest_rate=category.interest_rate,
            loan_period_months=category.loan_period_months
        )

    @action(detail=True, methods=['post'], url_path='approve')
    def approve_application(self, request, pk=None):
        application = self.get_object()

        if application.status != 'pending':
            return Response({'detail': 'Application already processed.'}, status=status.HTTP_400_BAD_REQUEST)

        if not application.category:
            return Response({'detail': 'Loan category is required.'}, status=status.HTTP_400_BAD_REQUEST)

        reference = generate_loan_reference(application.category.abbreviation)

        loan = Loan.objects.create(
            member=application.applicant.memberprofile,
            amount=application.amount,
            category=application.category,
            interest_rate=application.category.interest_rate,
            duration_months=application.category.loan_period_months,
            status='approved',
            approved_by=request.user,
            approved_at=timezone.now(),
            reference=reference,
        )

        application.status = 'approved'
        application.approved_by = request.user
        application.approval_date = timezone.now()
        application.save()

        return Response({'detail': 'Application approved and loan created.', 'loan_id': loan.id})
    
class AdminLoanApplicationViewSet(BaseLoanApplicationViewSet):
    permission_classes = [IsAdminUser]
    def get_queryset(self):
        return LoanApplication.objects.all()    
        
class MemberLoanApplicationViewSet(BaseLoanApplicationViewSet):
    def get_queryset(self):
        return LoanApplication.objects.filter(applicant=self.request.user)
    

### Loan repayment list view

class BaseRepaymentListView(generics.ListAPIView):
    serializer_class = RepaymentSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    ordering_fields = [
        'payment_date', 'recorded_at', 'amount',
        'principal_component', 'interest_component',
        'was_late', 'due_date'
    ]
    ordering = ['-payment_date']

    def get_queryset(self):
        return LoanRepayment.objects.select_related(
            'loan', 'paid_by', 'loan__member__user', 'scheduled_installment'
        )



    
class AdminRepaymentListView(BaseRepaymentListView):
    permission_classes = [IsAuthenticated, IsAdminUser]
    filterset_class = RepaymentFilter
    pagination_class = StandardResultsSetPagination


    
class MemberRepaymentListView(BaseRepaymentListView):
    filterset_class = RepaymentFilter

    def get_queryset(self):
        # Restrict to repayments belonging to the logged-in user
        return super().get_queryset().filter(loan__member__user=self.request.user)


