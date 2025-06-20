from django.urls import path, include
from rest_framework.routers import DefaultRouter
from gracecoop.views.payment_view import AdminPaymentViewSet, MemberPaymentViewSet

payment_router = DefaultRouter()
payment_router.register(r'payments-admin', AdminPaymentViewSet, basename='admin-payments')
payment_router.register(r'all-payments', MemberPaymentViewSet, basename='member-all-payments')

urlpatterns = [
    path('', include(payment_router.urls)),
]