from django.urls import path, include
from rest_framework.routers import DefaultRouter
from gracecoop.views.member_views import (
    MemberDashboardSummaryView,
    MemberViewSet,
    PasswordResetConfirmView,
    PasswordResetRequestView,
    UserRegistrationView,
    UserLoginView,
    CurrentUserView,
    MyMemberProfileView,
    Member2FAVerifyView,
    Member2FASetupView,
    ActiveCooperativeConfigView,
    VerifyEmailView

)
from gracecoop.views.admin_views import TwoFAStatusView, Disable2FAView, Verify2FALoginView
from gracecoop.views.payment_view import (LoanPaymentInitiateView, 
                                          LoanPaymentVerifyView, 
                                          PaystackWebhookView,
                                          ContributionPaymentInitiateView,
                                          ContributionPaymentVerifyView,
                                          LevyPaymentInitiateView,
                                          LevyPaymentVerifyView,
                                          EntryPaymentInitiateView,
                                          EntryPaymentVerifyView,
                                          MemberPaymentViewSet)

router = DefaultRouter()
router.register(r'profiles', MemberViewSet, basename='member-profile')

urlpatterns = [
    # RESTful CRUD endpoints: /api/members/profiles/
    path('', include(router.urls)),

    # Auth & user routes
    path('register/', UserRegistrationView.as_view(), name='register'),
    path('login/', UserLoginView.as_view(), name='login'),
    path('2fa/setup/', Member2FASetupView.as_view(), name='member-2fa-setup'),
    path('2fa/setup-verify/', Member2FAVerifyView.as_view(), name='2fa-setup-verify'),
    path('2fa/verify/', Verify2FALoginView.as_view(), name='2fa-login-verify'),
    path('2fa/status/', TwoFAStatusView.as_view(), name='2fa-status'),
    path('2fa/disable/', Disable2FAView.as_view(), name='2fa-disable'),
    path('user/me/', CurrentUserView.as_view(), name='current-user'),
    path("dashboard/summary/", MemberDashboardSummaryView.as_view(), name="member-dashboard-summary"),
    path('verify-email/', VerifyEmailView.as_view(), name="verify-email"),
    path("password-reset-request/", PasswordResetRequestView.as_view(), name="password-reset-request"),
    path("password-reset-confirm/", PasswordResetConfirmView.as_view(), name="password-reset-confirm"),


    # Logged-in member can view their own profile
    path('my-profile/', MyMemberProfileView.as_view(), name='my-profile'),
    path("update-profile/", MyMemberProfileView.as_view(), name="update-profile"),

    ## Member loan-related endpoints
    path('loan/', include('gracecoop.urls.loan_urls')),


    ### Cooperative active config endpoint
    path('cooperative-config/active/', ActiveCooperativeConfigView.as_view(), name='active-cooperative-config'),

    ### Payment initiate and verify endpoints
    path('loan/pay/initiate/', LoanPaymentInitiateView.as_view(), name='pay-initiate'),
    path('loan/pay/verify/', LoanPaymentVerifyView.as_view(), name='pay-verify'),
    path('paystack/webhook/', PaystackWebhookView.as_view(), name='paystack-webhook'),


    ### Contribution-related endpoints
    path('contribution/', include('gracecoop.urls.contribution_urls')),
    path('contribution/pay/initiate/', ContributionPaymentInitiateView.as_view(), name='contrib-initiate'),
    path('contribution/pay/verify/', ContributionPaymentVerifyView.as_view(), name='contrib-verify'),


    ### Levy-related endpoints
    path('levy/', include('gracecoop.urls.levy_urls')),
    path('levy/pay/initiate/', LevyPaymentInitiateView.as_view(), name='levy-initiate'),
    path('levy/pay/verify/', LevyPaymentVerifyView.as_view(), name='levy-verify'),

    ### Payment-related endpoints
    path('payment/', include('gracecoop.urls.payment_urls')),


    ### New member entry payments endpoints
    path('entry-payment/initiate/', EntryPaymentInitiateView.as_view(), name='entry-initiate'),
    path('entry-payment/verify/<str:reference>/', EntryPaymentVerifyView.as_view(), name='entry-verify'),

    ### Announcement 
    path('notice/', include('gracecoop.urls.announcement_urls')),




   
   
]
