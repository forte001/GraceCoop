
from rest_framework import viewsets, status, generics, filters
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework import serializers
from ..permissions import IsAdminUser
from django.db.models import Sum
from django.utils import timezone
from rest_framework.decorators import action
from rest_framework.response import Response
from decimal import Decimal, InvalidOperation
from ..utils import (generate_repayment_schedule,
                     regenerate_repayment_schedule,
                    update_loan_disbursement_status,
                    generate_loan_reference,
                    apply_loan_repayment,
                    upload_receipt_to_supabase
                    )
from django_filters.rest_framework import DjangoFilterBackend
from ..filters import (RepaymentFilter, LoanFilter, 
                       LoanApplicationFilter, 
                       DisbursementLogFilter,
                       MemberFilter)
from rest_framework.filters import SearchFilter, OrderingFilter
from gracecoop.pagination import StandardResultsSetPagination
from django.conf import settings
from dateutil.relativedelta import relativedelta
import traceback
import uuid



from gracecoop.models import (
    Loan, 
    LoanCategory, 
    LoanApplication,
    DisbursementLog,
    LoanRepayment,
    MemberProfile, 
    LoanGuarantor  )
from ..serializers import (
    LoanSerializer, 
    LoanCategorySerializer,
    LoanApplicationSerializer,
    RepaymentSerializer,
    LoanRepaymentScheduleSerializer,
    DisbursementLogSerializer,
    GuarantorOptionSerializer
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
# LOAN VIEWSET
#####################################################################################

class BaseLoanViewSet(viewsets.ModelViewSet):
    """Base viewset with common loan functionality"""
    serializer_class = LoanSerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend]
    filterset_class = LoanFilter
    
    def get_queryset(self):
        """Base queryset with optimized database queries"""
        return Loan.objects.select_related(
            'member__user', 'category', 'approved_by', 'disbursed_by'
        ).prefetch_related(
            'disbursements', 'guarantors__guarantor'
        ).all()
    
    @action(detail=True, methods=['get'], url_path='summary')
    def summary(self, request, pk=None):
        """Get loan summary with financial details"""
        loan = self.get_object()
        total_disbursed = loan.disbursements.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        total_paid = loan.repayments.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
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
        """Get loan repayment schedule"""
        loan = self.get_object()
        
        if not loan.repayment_schedule.exists():
            generate_repayment_schedule(loan)
        
        schedule = loan.repayment_schedule.prefetch_related('repayments').order_by('due_date')
        if not schedule.exists():
            return Response({'message': 'No repayment schedule found.'}, status=404)
        
        serializer = LoanRepaymentScheduleSerializer(schedule, many=True)
        return Response(serializer.data)


class AdminLoanViewSet(BaseLoanViewSet):
    """Admin-specific loan management viewset"""
    permission_classes = [IsAdminUser]
    
    def get_permissions(self):
        """Dynamic permission assignment based on action"""
        permission_map = {
            'approve': [IsAdminUser(), CanApproveLoan()],
            'disburse': [IsAdminUser(), CanDisburseLoan()],
            'destroy': [IsAdminUser(), CanDeleteLoan()],
            'approve_grace_period': [IsAdminUser(), CanApproveGracePeriod()],
        }
        return permission_map.get(self.action, [IsAdminUser()])
    
    
    @action(detail=True, methods=['post'], url_path='disburse')
    def disburse(self, request, pk=None):
        """Disburse loan funds with receipt handling"""
        try:
            loan = self.get_object()
            
            # Validate input data
            validation_result = self._validate_disbursement_data(request, loan)
            if validation_result['error']:
                return Response({'error': validation_result['error']}, status=400)
            
            amount = validation_result['amount']
            receipt_file = validation_result['receipt_file']
            
            # Handle optional disbursement settings
            self._handle_disbursement_settings(request, loan)
            
            # Create disbursement log
            disbursement_result = self._create_disbursement_log(loan, amount, receipt_file, request.user)
            if disbursement_result['error']:
                return Response(disbursement_result['error'], status=500)
            
            # Update loan status
            update_loan_disbursement_status(loan)
            
            return Response({'message': f'{amount} disbursed successfully.'})
            
        except Exception as e:
            traceback_str = traceback.format_exc()
            print(traceback_str)
            return Response({
                'error': f'Unexpected error: {str(e)}',
                'hint': 'See server logs for full traceback'
            }, status=500)
    
    def _validate_disbursement_data(self, request, loan):
        """Validate disbursement request data"""
        result = {'error': None, 'amount': None, 'receipt_file': None}
        
        # Check receipt file
        receipt_file = request.FILES.get('receipt')
        if not receipt_file:
            result['error'] = 'Receipt file is required.'
            return result
        
        # Check amount
        amount_str = request.data.get('amount')
        if not amount_str:
            result['error'] = 'Amount is required.'
            return result
        
        try:
            amount = Decimal(amount_str)
        except (ValueError, TypeError, InvalidOperation):
            result['error'] = 'Invalid amount.'
            return result
        
        if amount <= 0:
            result['error'] = 'Amount must be positive.'
            return result
        
        # Check disbursement limit
        total_disbursed = loan.disbursements.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        if total_disbursed + amount > loan.amount:
            result['error'] = 'Disbursement exceeds approved loan amount.'
            return result
        
        result['amount'] = amount
        result['receipt_file'] = receipt_file
        return result
    
    def _handle_disbursement_settings(self, request, loan):
        """Handle optional disbursement settings"""
        num_disbursements = request.data.get('num_disbursements')
        if not loan.num_disbursements and num_disbursements:
            try:
                loan.num_disbursements = int(num_disbursements)
            except ValueError:
                pass  # Ignore invalid values
        
        remaining_flag = request.data.get('remaining_disbursement', False)
        loan.remaining_disbursement = bool(remaining_flag)
    
    def _create_disbursement_log(self, loan, amount, receipt_file, user):
        """Create disbursement log with file handling"""
        result = {'error': None}
        
        try:
            if settings.DEBUG:
                # Store using FileField locally
                DisbursementLog.objects.create(
                    loan=loan,
                    amount=amount,
                    repayment_months=loan.duration_months,
                    disbursed_by=user,
                    requested_by=loan.member,
                    receipt=receipt_file
                )
            else:
                # Handle Supabase storage
                try:
                    file_ext = receipt_file.name.split(".")[-1]
                    unique_name = f"receipt_{loan.reference}_{uuid.uuid4()}.{file_ext}"
                    public_url = upload_receipt_to_supabase(receipt_file, unique_name)
                    
                    DisbursementLog.objects.create(
                        loan=loan,
                        amount=amount,
                        repayment_months=loan.duration_months,
                        disbursed_by=user,
                        requested_by=loan.member,
                        receipt_url=public_url
                    )
                except Exception as e:
                    result['error'] = {
                        'error': str(e),
                        'hint': 'Check server logs for full stacktrace'
                    }
                    
        except Exception as e:
            result['error'] = {
                'error': f'Error saving DisbursementLog: {str(e)}',
                'hint': 'See server logs for details'
            }
        
        return result
    
    @action(detail=True, methods=['post'], url_path='apply-grace-period')
    def apply_grace_period(self, request, pk=None):
        """Apply grace period to a loan"""
        loan = self.get_object()
        
        # Validate loan state
        if loan.status not in ['disbursed', 'partially_disbursed']:
            return Response({
                'error': 'Cannot apply grace period to loans not in disbursed state.'
            }, status=400)
        
        if loan.grace_applied:
            return Response({
                'error': 'Grace period has already been applied to this loan.'
            }, status=400)
        
        # Check if grace period is available
        if not loan.category.grace_period_months or loan.category.grace_period_months <= 0:
            return Response({
                "error": "This loan category does not have a grace period defined."
            }, status=400)
        
        grace_months = loan.category.grace_period_months
        
        # Apply grace period
        loan.total_repayment_months += grace_months
        
        # Update interest rate if grace rate is defined
        if loan.category.grace_interest_rate:
            loan.interest_rate = loan.category.grace_interest_rate
        
        loan.grace_applied = True
        loan.status = 'grace_applied'
        
        # Extend the end date
        if loan.end_date:
            loan.end_date += relativedelta(months=grace_months)
        else:
            loan.end_date = timezone.now().date() + relativedelta(months=loan.total_repayment_months)
        
        loan.save()
        
        # Regenerate repayment schedule if loan is overdue
        if loan.end_date < timezone.now().date() and loan.status != 'paid_off':
            regenerate_repayment_schedule(loan)
        
        return Response({
            "message": f"Grace period of {grace_months} months applied with interest rate {loan.interest_rate}%."
        })


class MemberLoanViewSet(BaseLoanViewSet, viewsets.ReadOnlyModelViewSet):
    """Member-specific loan viewing and repayment viewset"""
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Filter loans to only show current user's loans"""
        return super().get_queryset().filter(member__user=self.request.user)
    
    @action(detail=True, methods=['post'], url_path='repay')
    def repay(self, request, pk=None):
        """Make a loan repayment with proper allocation logic"""
        loan = self.get_object()
        serializer = RepaymentSerializer(data=request.data, context={'loan': loan})
        serializer.is_valid(raise_exception=True)
        
        try:
            repayment = apply_loan_repayment(
                loan, 
                serializer.validated_data['amount'], 
                request.user
            )
            
            # Get updated loan status
            loan.refresh_from_db()
            
            return Response({
                'message': 'Repayment successful.',
                'repayment': {
                    'id': repayment.id,
                    'amount': repayment.amount,
                    'interest_component': repayment.interest_component,
                    'principal_component': repayment.principal_component,
                    'paid_at': repayment.payment_date
                },
                'loan_status': loan.status,
                'remaining_installments': loan.repayment_schedule.filter(is_paid=False).count()
            })
        except ValueError as e:
            return Response(
                {'error': str(e)}, 
                status=400
            )
    
    @action(detail=True, methods=['post'], url_path='payoff')
    def payoff(self, request, pk=None):
        """Calculate and optionally process loan payoff"""
        loan = self.get_object()
        
        if loan.status not in ['disbursed', 'partially_disbursed']:
            return Response({
                'error': 'Only disbursed loans can be paid off.'
            }, status=400)
        
        # Calculate payoff amount
        total_loan_amount = loan.amount
        total_interest = loan.repayment_schedule.aggregate(total=Sum('interest'))['total'] or Decimal('0.00')
        total_paid = loan.repayments.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        outstanding_amount = total_loan_amount + total_interest - total_paid
        
        if outstanding_amount <= 0:
            return Response({'message': 'Loan is already fully paid.'})
        
        # Check if this is a calculation request or actual payoff
        action_type = request.data.get('action', 'calculate')
        
        if action_type == 'calculate':
            # Get unpaid installments for detailed breakdown
            unpaid_installments = loan.repayment_schedule.filter(is_paid=False).order_by('due_date')
            installments_breakdown = []
            
            for installment in unpaid_installments:
                already_paid = installment.repayments.aggregate(
                    total=Sum('amount')
                )['total'] or Decimal('0.00')
                
                installments_breakdown.append({
                    'installment_number': installment.installment_number,
                    'due_date': installment.due_date,
                    'amount_due': float(installment.amount_due),
                    'already_paid': float(already_paid),
                    'remaining': float(installment.amount_due - already_paid)
                })
            
            return Response({
                'message': 'Payoff amount calculated.',
                'payoff_amount': float(outstanding_amount),
                'breakdown': {
                    'total_loan_amount': float(total_loan_amount),
                    'total_interest': float(total_interest),
                    'total_paid': float(total_paid),
                    'outstanding_amount': float(outstanding_amount)
                },
                'unpaid_installments': installments_breakdown
            })
        
        elif action_type == 'process':
            # Process the actual payoff
            payment_amount = request.data.get('amount')
            source_reference = request.data.get('source_reference')
            
            if not payment_amount:
                return Response({
                    'error': 'Payment amount is required for payoff processing.'
                }, status=400)
            
            if not source_reference:
                return Response({
                    'error': 'Source reference is required for payoff processing.'
                }, status=400)
            
            payment_amount = Decimal(str(payment_amount))
            
            # Validate payment amount (should be at least the outstanding amount)
            if payment_amount < outstanding_amount:
                return Response({
                    'error': f'Payment amount {payment_amount} is less than outstanding balance {outstanding_amount}.'
                }, status=400)
            
            try:
                # Process the payoff with payoff=True flag
                repayment = apply_loan_repayment(
                    loan=loan,
                    amount=payment_amount,
                    paid_by_user=request.user,
                    payoff=True,
                    source_reference=source_reference
                )
                
                # Refresh loan status
                loan.refresh_from_db()
                
                return Response({
                    'message': 'Loan payoff processed successfully.',
                    'repayment_id': repayment.id,
                    'loan_status': loan.status,
                    'amount_paid': float(payment_amount),
                    'overpayment': float(max(0, payment_amount - outstanding_amount))
                })
                
            except Exception as e:
                return Response({
                    'error': f'Payoff processing failed: {str(e)}'
                }, status=500)
        
        else:
            return Response({
                'error': 'Invalid action. Use "calculate" or "process".'
            }, status=400) 





    #################################################################
    # LOAN APPLICATION VIEWSETS
    #################################################################

class BaseLoanApplicationViewSet(viewsets.ModelViewSet):
    queryset = LoanApplication.objects.none()  # overridden in child
    serializer_class = LoanApplicationSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = LoanApplicationFilter 
    search_fields = ['applicant__username']
    ordering_fields = ['approval_date', 'application_date', 'amount']

    def perform_create(self, serializer):
        category = serializer.validated_data.get('category')
        if category is None:
            raise serializers.ValidationError("Category is required.")
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

        # ✅ Validate guarantors before approval
        guarantor_count = application.guarantors.count()
        if guarantor_count < 2:
            return Response({
                'detail': f'Application must have at least 2 guarantors. Current count: {guarantor_count}'
            }, status=status.HTTP_400_BAD_REQUEST)

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
            application=application  # Link the application
        )
        
        # Update existing guarantors to link to the loan
        for guarantor in application.guarantors.all():
            guarantor.loan = loan
            guarantor.save()

        application.status = 'approved'
        application.approved_by = request.user
        application.approval_date = timezone.now()
        application.save()

        return Response({'detail': 'Application approved and loan created.', 'loan_id': loan.id})

    
class AdminLoanApplicationViewSet(BaseLoanApplicationViewSet):
    permission_classes = [IsAdminUser]
    def get_queryset(self):
        return LoanApplication.objects.all()    
    

    def list(self, request, *args, **kwargs):
        print("💡 Incoming query params:", request.query_params)
        return super().list(request, *args, **kwargs)
        
class MemberLoanApplicationViewSet(BaseLoanApplicationViewSet):
    def get_queryset(self):
        return LoanApplication.objects.filter(applicant=self.request.user)
    
    @action(detail=True, methods=['get'], url_path='details')
    def loan_application_details(self, request, pk=None):
        application = self.get_object()

        if application.applicant != request.user:
            return Response({'error': 'You are not authorized to view this application.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = self.get_serializer(application)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'], url_path='resubmit')
    def resubmit_application(self, request, pk=None):
        application = self.get_object()

        if application.status not in ['rejected', 'pending']:
            return Response({
                'error': 'Only pending and rejected applications can be resubmitted.'
            }, status=status.HTTP_400_BAD_REQUEST)

        # ✅ Consistent guarantor validation
        guarantor_count = application.guarantors.count()
        if guarantor_count < 2:
            return Response({
                'error': f'At least 2 guarantors are required before resubmission. Current count: {guarantor_count}'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Validate that guarantors are still approved members
        for guarantor_relation in application.guarantors.all():
            if guarantor_relation.guarantor.status != 'approved':
                return Response({
                    'error': f'Guarantor {guarantor_relation.guarantor.full_name} is no longer an approved member.'
                }, status=status.HTTP_400_BAD_REQUEST)

        application.status = 'pending'
        application.rejection_reason = None
        application.save()

        return Response({'message': 'Application resubmitted successfully.'}, status=status.HTTP_200_OK)
    

class GuarantorCandidatesView(generics.ListAPIView):
    """
    Members use this endpoint to fetch approved members they can select as guarantors.
    """
    serializer_class = GuarantorOptionSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend]
    filterset_class = MemberFilter

    def get_queryset(self):
        # Exclude self from results
        return MemberProfile.objects.filter(
            status='approved'
        ).exclude(user=self.request.user)
    
### Loan repayment list view
class BaseRepaymentListView(generics.ListAPIView):
    serializer_class = RepaymentSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination
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
    


    
class MemberRepaymentListView(BaseRepaymentListView):
    filterset_class = RepaymentFilter

    def get_queryset(self):
        # Restrict to repayments belonging to the logged-in user
        return super().get_queryset().filter(loan__member__user=self.request.user)


### Disbursement Log view
class DisbursementLogAdminListView(generics.ListAPIView):
    serializer_class = DisbursementLogSerializer
    permission_classes = [IsAdminUser]
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_class = DisbursementLogFilter
    ordering_fields = ['disbursed_at', 'amount', 'repayment_months']
    ordering = ['-disbursed_at']

    def get_queryset(self):
        return DisbursementLog.objects.select_related('loan', 'disbursed_by')