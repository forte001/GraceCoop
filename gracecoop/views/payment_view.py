
import uuid
from django.shortcuts import get_object_or_404, render
import requests
from django.conf import settings
from rest_framework import status, views,serializers, viewsets
from rest_framework.response import Response
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
import json, hmac, hashlib
from django.http import HttpResponse, JsonResponse
from django.utils import timezone
from gracecoop.models import Payment, Contribution, Levy
from ..serializers import (LoanPaymentInitiateSerializer, 
                           LoanPaymentVerifySerializer, 
                           ContributionPaymentInitiateSerializer,
                           LevyPaymentInitiateSerializer,
                           EntryPaymentInitiateSerializer,
                           PaymentSerializer,
                           PaymentRecheckSerializer)
from django.db import transaction
from rest_framework.permissions import AllowAny, IsAuthenticated
from ..utils import apply_loan_repayment, generate_payment_reference, generate_payment_receipt
from decimal import Decimal
from django.db.models import Sum
from django_filters.rest_framework import DjangoFilterBackend
from ..filters import PaymentFilter
from ..permissions import IsAdminUser
from gracecoop.pagination import StandardResultsSetPagination
from rest_framework.filters import SearchFilter, OrderingFilter
import logging


####################################################
### LOAN PAYMENT VIEWS
####################################################
class LoanPaymentInitiateView(views.APIView):
    
    
    permission_classes = [IsAuthenticated]
    def post(self, request):
        serializer = LoanPaymentInitiateSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)

        loan = serializer.validated_data['loan']
        member = loan.member
        payoff = serializer.validated_data.get('payoff', False)

        if payoff:
            total_loan_amount = loan.amount
            total_interest = loan.repayment_schedule.aggregate(total=Sum('interest'))['total'] or Decimal('0.00')
            total_paid = loan.repayments.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

            amount = total_loan_amount + total_interest - total_paid

            if amount <= 0:
                return Response({'error': 'Loan is already fully paid.'}, status=status.HTTP_400_BAD_REQUEST)

            # Ignore any custom_amount if payoff is True
        else:
            amount = serializer.validated_data.get('custom_amount')
            if amount is None or amount <= 0:
                return Response({'error': 'Invalid custom payment amount.'}, status=status.HTTP_400_BAD_REQUEST)

        reference = f"{loan.reference}-{uuid.uuid4().hex[:6].upper()}"

        Payment.objects.create(
            member=member,
            payment_type='loan_repayment',
            loan=loan,
            reference=reference,
            amount=amount,
            payoff=payoff
        )

        return Response({
            'reference': reference,
            'amount': float(amount),  # send exact amount for frontend to use
            'email': member.email,
            'public_key': settings.PAYSTACK_PUBLIC_KEY,
        })


class LoanPaymentVerifyView(views.APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        serializer = LoanPaymentVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        reference = serializer.validated_data['reference']

        try:
            payment = Payment.objects.select_related('member', 'loan').get(reference=reference)
        except Payment.DoesNotExist:
            return Response({'error': 'Payment not found.'}, status=404)

        if not payment.loan:
            return Response({'error': 'Associated loan not found for this payment.'}, status=400)

        print(f"🔍 Checking payment verification status for ref: {reference}")

        url = f"https://api.paystack.co/transaction/verify/{reference}"
        headers = {"Authorization": f"Bearer {settings.PAYSTACK_SECRET_KEY}"}
        res = requests.get(url, headers=headers)
        result = res.json()

        if not result.get('data') or result['data'].get('status') != 'success':
            return Response({'error': 'Payment verification failed.'}, status=400)

        with transaction.atomic():
            if not payment.verified:
                print(f"🔄 Marking payment verified for ref: {reference}")
                payment.verified = True
                payment.verified_at = timezone.now()
                payment.source_reference = result['data']['reference']
                payment.save()
            else:
                print(f"⏩ Payment already verified for ref: {reference}")

            # Apply loan repayment if not already applied
            # This serves as a fallback in case webhook doesn't process
            if payment.payment_type == 'loan_repayment' and not payment.repayment_applied:
                loan = payment.loan
                try:
                    print(f"🔄 Applying loan repayment in verify view for ref: {reference}")
                    apply_loan_repayment(
                        loan=loan,
                        amount=payment.amount,
                        paid_by_user=payment.member.user,
                        payoff=payment.payoff,
                        source_reference=payment.source_reference  # Use the Paystack reference
                    )
                    payment.repayment_applied = True
                    payment.save()
                    print(f"✅ Loan repayment applied successfully in verify view for ref: {reference}")
                except Exception as e:
                    print(f"❌ Repayment application failed in verify view: {e}")
                    return Response({'error': 'Payment verified but repayment application failed.'}, status=500)
            else:
                print(f"⏩ Loan repayment already applied for ref: {reference}")

        return Response({'message': '✅ Loan payment verified successfully.'}, status=200)

#####################################
### CONTRIBUTION PAYMENT VIEWS
#####################################
class ContributionPaymentInitiateView(views.APIView):
    

    def post(self, request):
        serializer = ContributionPaymentInitiateSerializer(data=request.data, context={'request': request})
        print("Raw incoming data:", request.data)
        serializer.is_valid(raise_exception=True)

        member = serializer.validated_data['member']
        amount = serializer.validated_data['amount']

        reference = generate_payment_reference(member, 'shares')

        Payment.objects.create(
            member=member,
            amount=amount,
            payment_type='shares',
            reference=reference
        )

        return Response({
            'reference': reference,
            'amount': float(amount),
            'email': member.email,
            'public_key': settings.PAYSTACK_PUBLIC_KEY,
        })
    
class ContributionPaymentVerifyView(views.APIView):
    

    def post(self, request):
        serializer = serializers.Serializer(data=request.data)
        serializer.fields['reference'] = serializers.CharField()
        serializer.is_valid(raise_exception=True)

        reference = serializer.validated_data['reference']

        try:
            payment = Payment.objects.select_related('member').get(reference=reference)
        except Payment.DoesNotExist:
            return Response({'error': 'Payment not found.'}, status=404)

        if payment.payment_type != 'shares':
            return Response({'error': 'Invalid payment type for this endpoint.'}, status=400)

        url = f"https://api.paystack.co/transaction/verify/{reference}"
        headers = {"Authorization": f"Bearer {settings.PAYSTACK_SECRET_KEY}"}
        res = requests.get(url, headers=headers)
        result = res.json()

        if not result.get('data') or result['data'].get('status') != 'success':
            return Response({'error': 'Payment verification failed.'}, status=400)

        with transaction.atomic():
            if not payment.verified:
                payment.verified = True
                payment.verified_at = timezone.now()
                payment.source_reference = result['data']['reference']
                payment.save()

                Contribution.objects.create(
                    member=payment.member,
                    amount=payment.amount,
                    date=timezone.now(),
                    source_reference=payment.source_reference,
                )

        return Response({'message': '✅ Contribution payment verified successfully.'}, status=200)




#####################################
### LEVY PAYMENT VIEW
#####################################
class LevyPaymentInitiateView(views.APIView):
    

    def post(self, request):
        serializer = LevyPaymentInitiateSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)

        member = serializer.validated_data['member']
        amount = serializer.validated_data['amount']

        reference = generate_payment_reference(member, 'levy')

        Payment.objects.create(
            member=member,
            amount=amount,
            payment_type='levy',
            reference=reference
        )

        return Response({
            'reference': reference,
            'amount': float(amount),
            'email': member.email,
            'public_key': settings.PAYSTACK_PUBLIC_KEY,
        })
    
class LevyPaymentVerifyView(views.APIView):
    

    def post(self, request):
        serializer = serializers.Serializer(data=request.data)
        serializer.fields['reference'] = serializers.CharField()
        serializer.is_valid(raise_exception=True)

        reference = serializer.validated_data['reference']

        try:
            payment = Payment.objects.select_related('member').get(reference=reference)
        except Payment.DoesNotExist:
            return Response({'error': 'Payment not found.'}, status=404)

        if payment.payment_type != 'levy':
            return Response({'error': 'Invalid payment type for this endpoint.'}, status=400)

        url = f"https://api.paystack.co/transaction/verify/{reference}"
        headers = {"Authorization": f"Bearer {settings.PAYSTACK_SECRET_KEY}"}
        res = requests.get(url, headers=headers)
        result = res.json()

        if not result.get('data') or result['data'].get('status') != 'success':
            return Response({'error': 'Payment verification failed.'}, status=400)

        with transaction.atomic():
            if not payment.verified:
                payment.verified = True
                payment.verified_at = timezone.now()
                payment.source_reference = result['data']['reference']
                payment.save()

                Levy.objects.create(
                    member=payment.member,
                    amount=payment.amount,
                    date=timezone.now(),
                    source_reference=payment.source_reference,
                )

        return Response({'message': '✅ Levy payment verified successfully.'}, status=200)
    

####################################################
## ENTRY PAYMENTS
####################################################
class EntryPaymentInitiateView(views.APIView):


    def post(self, request):
        serializer = EntryPaymentInitiateSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = request.user
        payment = serializer.save()

        return Response({
            'message': 'Payment initiated successfully.',
            'reference': payment.reference,
            'amount': float(payment.amount),
            'payment_type': payment.payment_type,
            'email': user.email,
            'public_key': settings.PAYSTACK_PUBLIC_KEY,
        }, status=status.HTTP_201_CREATED)

    

class EntryPaymentVerifyView(views.APIView):
    def post(self, request, reference):
        payment = get_object_or_404(Payment, reference=reference)

        if not payment.verified:
            return Response({'error': 'Payment not verified yet by Paystack.'}, status=status.HTTP_400_BAD_REQUEST)

        member = payment.member
        if not member:
            return Response({'error': 'Payment not linked to a member.'}, status=status.HTTP_400_BAD_REQUEST)

        if payment.payment_type not in ['shares', 'levy']:
            return Response({'error': 'Invalid payment type for this endpoint.'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            if payment.payment_type == 'shares' and not member.has_paid_shares:
                Contribution.objects.get_or_create(
                    member=member,
                    amount=payment.amount,
                    source_reference=payment.reference,
                    reference=payment.reference,
                    defaults={'date': timezone.now()}
                )
                member.has_paid_shares = True
                member.save()

            elif payment.payment_type == 'levy' and not member.has_paid_levy:
                Levy.objects.get_or_create(
                    member=member,
                    amount=payment.amount,
                    source_reference=payment.reference,
                    reference=payment.reference,
                    defaults={'date': timezone.now()}
                )
                member.has_paid_levy = True
                member.save()

        return Response({'message': f"✅ {payment.payment_type.capitalize()} payment verified successfully."})

    
######################################
### WEBHOOK
######################################

@method_decorator(csrf_exempt, name='dispatch')
class PaystackWebhookView(views.APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        signature = request.META.get('HTTP_X_PAYSTACK_SIGNATURE', '')
        payload = request.body

        computed_signature = hmac.new(
            settings.PAYSTACK_SECRET_KEY.encode('utf-8'),
            msg=payload,
            digestmod=hashlib.sha512
        ).hexdigest()

        if signature != computed_signature:
            return JsonResponse({'error': 'Invalid signature'}, status=400)

        try:
            data = json.loads(payload)
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON payload'}, status=400)

        event = data.get('event')
        if event != 'charge.success':
            print(f"🔕 Ignored event: {event}")
            return JsonResponse({'status': 'ignored'}, status=200)

        ref = data['data'].get('reference')
        if not ref:
            return JsonResponse({'error': 'Missing payment reference'}, status=400)

        try:
            payment = Payment.objects.select_related('member', 'loan').get(reference=ref)
        except Payment.DoesNotExist:
            print(f"❌ Webhook: payment not found for ref: {ref}")
            return JsonResponse({'error': 'Payment not found'}, status=404)

        with transaction.atomic():
            if not payment.verified:
                payment.verified = True
                payment.verified_at = timezone.now()
                payment.source_reference = ref  # source_reference = reference internally for entry payments
                payment.save()
                print(f"✅ Payment verified: {ref}")
            else:
                print(f"⏩ Payment already verified for ref: {ref}")

            member = payment.member
            payment_type = payment.payment_type

            if payment_type in ['shares', 'contribution']:
                Contribution.objects.get_or_create(
                    member=member,
                    amount=payment.amount,
                    source_reference=payment.reference,
                    defaults={'date': timezone.now()}
                )
                if not member.has_paid_shares:
                    member.has_paid_shares = True
                    member.save()
                    print(f"🆕 Shares entry payment flagged for member {member.id}")
                    print(f"🔁 Contribution (shares) recorded for member {member.id} (ref: {ref})")

            elif payment_type == 'levy':
                Levy.objects.get_or_create(
                    member=member,
                    amount=payment.amount,
                    source_reference=payment.reference,
                    defaults={'date': timezone.now()}
                )
                if not member.has_paid_levy:
                    member.has_paid_levy = True
                    member.save()
                    print(f"🆕 Levy entry payment flagged for member {member.id}")
                    print(f"🔁 Levy recorded for member {member.id} (ref: {ref})")

            elif payment_type == 'loan_repayment':
                loan = payment.loan
                if not loan:
                    print(f"❌ Loan missing for repayment ref: {ref}")
                    return JsonResponse({'error': 'Loan not found for repayment'}, status=400)

                if not payment.repayment_applied:
                    try:
                        apply_loan_repayment(
                            loan=loan,
                            amount=payment.amount,
                            paid_by_user=member.user,
                            payoff=payment.payoff,
                            source_reference=ref
                        )
                        payment.repayment_applied = True
                        payment.save()
                        print(f"💳 Loan repayment applied: {ref}")
                    except Exception as e:
                        print(f"❌ Repayment error: {e}")
                        return JsonResponse({'error': 'Loan repayment failed'}, status=500)
                else:
                    print(f"⏩ Loan repayment already applied: {ref}")

            else:
                print(f"⚠️ Unknown payment type: {payment_type}")

        return JsonResponse({'status': 'success'})
    
logger = logging.getLogger(__name__)

class PaymentRecheckView(views.APIView):
    """
    Manually recheck a payment status with PayStack API
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        serializer = PaymentRecheckSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        payment_id = serializer.validated_data['payment_id']
        
        try:
            # Get the payment record
            payment = Payment.objects.select_related('member', 'loan').get(
                id=payment_id,
                member__user=request.user  # Ensure user can only recheck their own payments
            )
        except Payment.DoesNotExist:
            return Response(
                {'error': 'Payment not found or you do not have permission to recheck this payment.'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if payment is already verified
        if payment.verified:
            return Response(
                {'error': 'Payment is already verified.'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check payment age (prevent rechecking very old payments)
        payment_age_days = (timezone.now() - payment.created_at).days
        if payment_age_days > 30:  # 30 days limit
            return Response(
                {'error': 'Payment is too old to recheck. Please contact support.'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Perform the recheck
        recheck_result = self._perform_paystack_recheck(payment)
        
        if recheck_result['success']:
            return Response({
                'message': '✅ Payment verification successful!',
                'payment_verified': True,
                'payment_type': payment.payment_type
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                'message': recheck_result['message'],
                'payment_verified': False,
                'can_retry': recheck_result.get('can_retry', True)
            }, status=status.HTTP_200_OK)
    
    def _perform_paystack_recheck(self, payment):
        """
        Perform the actual PayStack API verification
        """
        try:
            # Call PayStack API to verify payment
            url = f"https://api.paystack.co/transaction/verify/{payment.reference}"
            headers = {"Authorization": f"Bearer {settings.PAYSTACK_SECRET_KEY}"}
            
            response = requests.get(url, headers=headers, timeout=30)
            result = response.json()
            
            # Log the API response for debugging
            logger.info(f"PayStack recheck for {payment.reference}: {result}")
            
            if response.status_code != 200:
                return {
                    'success': False,
                    'message': 'PayStack API error. Please try again later.',
                    'can_retry': True
                }
            
            # Check if payment was successful
            if not result.get('data') or result['data'].get('status') != 'success':
                payment_status = result.get('data', {}).get('status', 'unknown')
                
                if payment_status in ['failed', 'cancelled']:
                    return {
                        'success': False,
                        'message': f'Payment was {payment_status} on PayStack. Please make a new payment.',
                        'can_retry': False
                    }
                elif payment_status == 'pending':
                    return {
                        'success': False,
                        'message': 'Payment is still pending on PayStack. Please try again in a few minutes.',
                        'can_retry': True
                    }
                else:
                    return {
                        'success': False,
                        'message': f'Payment status: {payment_status}. Please try again or contact support.',
                        'can_retry': True
                    }
            
            # Payment is successful, process it
            with transaction.atomic():
                # Update payment record
                payment.verified = True
                payment.verified_at = timezone.now()
                payment.source_reference = result['data']['reference']
                payment.save()
                
                # Process payment based on type
                self._process_verified_payment(payment)
                
                logger.info(f"Payment {payment.reference} verified successfully via recheck")
                
                return {
                    'success': True,
                    'message': 'Payment verified successfully!'
                }
                
        except requests.exceptions.RequestException as e:
            logger.error(f"Network error during payment recheck: {e}")
            return {
                'success': False,
                'message': 'Network error. Please check your connection and try again.',
                'can_retry': True
            }
        except Exception as e:
            logger.error(f"Unexpected error during payment recheck: {e}")
            return {
                'success': False,
                'message': 'An unexpected error occurred. Please try again or contact support.',
                'can_retry': True
            }
    
    def _process_verified_payment(self, payment):
        """
        Process the verified payment based on its type
        """
        member = payment.member
        payment_type = payment.payment_type
        
        if payment_type in ['shares', 'contribution']:
            Contribution.objects.get_or_create(
                member=member,
                amount=payment.amount,
                source_reference=payment.reference,
                defaults={'date': timezone.now()}
            )
            if not member.has_paid_shares:
                member.has_paid_shares = True
                member.save()
                logger.info(f"Shares entry payment flagged for member {member.id}")
        
        elif payment_type == 'levy':
            Levy.objects.get_or_create(
                member=member,
                amount=payment.amount,
                source_reference=payment.reference,
                defaults={'date': timezone.now()}
            )
            if not member.has_paid_levy:
                member.has_paid_levy = True
                member.save()
                logger.info(f"Levy entry payment flagged for member {member.id}")
        
        elif payment_type == 'loan_repayment':
            loan = payment.loan
            if loan and not payment.repayment_applied:
                try:
                    apply_loan_repayment(
                        loan=loan,
                        amount=payment.amount,
                        paid_by_user=member.user,
                        payoff=payment.payoff,
                        source_reference=payment.reference
                    )
                    payment.repayment_applied = True
                    payment.save()
                    logger.info(f"Loan repayment applied via recheck: {payment.reference}")
                except Exception as e:
                    logger.error(f"Loan repayment error during recheck: {e}")
                    raise


class AdminPaymentViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Payment.objects.select_related('member', 'loan').all().order_by('-created_at')
    serializer_class = PaymentSerializer
    permission_classes = [IsAdminUser]
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = PaymentFilter
    search_fields = ['reference', 'source_reference', 'member__full_name']
    ordering_fields = ['created_at', 'amount']

class MemberPaymentViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = PaymentFilter
    search_fields = ['reference', 'source_reference']
    ordering_fields = ['created_at', 'amount']

    def get_queryset(self):
        return (
            Payment.objects.select_related('member', 'loan')
            .filter(member=self.request.user.memberprofile)
            .order_by('-created_at')
        )

class PaymentReceiptView(views.APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, source_reference):
        try:
            payment = Payment.objects.get(source_reference=source_reference, verified=True)
        except Payment.DoesNotExist:
            return Response({'detail': 'Receipt not available.'}, status=404)

        pdf_buffer = generate_payment_receipt(payment)

        response = HttpResponse(pdf_buffer.getvalue(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="receipt_{payment.reference}.pdf"'
        return response
    

class VerifyReceiptView(views.APIView):
    permission_classes = [AllowAny]
    def get(self, request, reference):
        payment = get_object_or_404(Payment, source_reference=reference, verified=True)

        context = {
            "payment": payment,
            "amount_words": payment.amount_to_words(),
            "coop_name": "Grace Coop",
            "logo_url": f"{settings.BASE_URL}/static/images/logo.png",
            "loan_reference": (
                payment.loan.reference if payment.payment_type == "loan_repayment" and payment.loan else None
            ),
            "payment_source_reference": payment.source_reference,
        }

        return render(request, "verify_receipt.html", context)
