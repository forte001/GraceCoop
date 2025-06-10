from django.urls import include, path
from rest_framework.routers import DefaultRouter
from gracecoop.views.loan_views import (
    MemberLoanViewSet,
    LoanCategoryViewSet, 
    AdminLoanViewSet,
    AdminLoanApplicationViewSet,                                   
    MemberLoanApplicationViewSet,
    AdminRepaymentListView,
    MemberRepaymentListView     
    
     )

loan_router = DefaultRouter()
loan_router.register(r'loans', MemberLoanViewSet, basename='member-loan')
loan_router.register(r'loans-admin', AdminLoanViewSet, basename='admin-loan')
loan_router.register(r'loan-categories', LoanCategoryViewSet, basename='loan-category')
loan_router.register(r'loan-applications-admin', AdminLoanApplicationViewSet, basename='admin-loan-applications')
loan_router.register(r'loan-applications', MemberLoanApplicationViewSet, basename='member-loan-applications')

urlpatterns = [
    path('', include(loan_router.urls)),
    path('repayments-admin/', AdminRepaymentListView.as_view(), name='admin-repayments'),
    path('repayments/', MemberRepaymentListView.as_view(), name='member-repayments'),
]
