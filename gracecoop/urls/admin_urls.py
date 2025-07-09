from django.urls import path, include
from rest_framework.routers import DefaultRouter
from gracecoop.urls import loan_urls, contribution_urls
from gracecoop.views.admin_views import (
    AdminLoginView, 
    AdminDashboardView, 
    PendingApplicationsView, 
    ApproveMemberApplicationView, 
    ApprovedMembersView,
    AdminDashboardStatsView,
    AdminMemberUpdateView,
    AdminUserListView,
    AdminUserPermissionsView,
    AllPermissionsView,
    GroupListView,
    UserGroupListView,
    UserGroupUpdateView,
    CurrentAdminPermissionCheckView,
    Admin2FAVerifySetupView,
    Admin2FASetupView,
    TwoFAStatusView,
    Disable2FAView,
    Verify2FALoginView,
    CooperativeConfigAdminViewSet,
    ExpenseViewSet
    
    )
### Cooperative admin config router
router = DefaultRouter()
expense_router = DefaultRouter()
router.register(r'cooperative-config', CooperativeConfigAdminViewSet, basename='admin-cooperative-config')
expense_router.register(r'expenses', ExpenseViewSet, basename='expense')

urlpatterns = [
    path('login/', AdminLoginView.as_view(), name='admin-login'),
    path('2fa/setup/', Admin2FASetupView.as_view(), name='admin-2fa-setup'),
    path('2fa/setup-verify/', Admin2FAVerifySetupView.as_view(), name='2fa-setup-verify'),
    path('2fa/verify/', Verify2FALoginView.as_view(), name='2fa-login-verify'),
    path('2fa/status/', TwoFAStatusView.as_view(), name='2fa-status'),
    path('2fa/disable/', Disable2FAView.as_view(), name='2fa-disable'),
    path('dashboard/', AdminDashboardView.as_view(), name='admin-dashboard'),
    path('dashboard-stats/', AdminDashboardStatsView.as_view(), name='admin-dashboard-stats'),
    path('members/pending/', PendingApplicationsView.as_view(), name='pending-members'),
    path('members/<int:id>/approve/', ApproveMemberApplicationView.as_view(), name='approve-member'),
    path('members/approved/', ApprovedMembersView.as_view(), name='approved-members'),
    path('members/<int:pk>/update/', AdminMemberUpdateView.as_view(), name='admin-member-update'),



    path('users/', AdminUserListView.as_view(), name='admin-users'),
    path('users/<int:user_id>/permissions/', AdminUserPermissionsView.as_view(), name='admin-user-permissions'),
    path('permissions/check/', CurrentAdminPermissionCheckView.as_view(), name='admin-permissions'),
    path('permissions/', AllPermissionsView.as_view(), name='admin-permissions'),

    ### Group Permissions endpoint
   path('groups/', GroupListView.as_view(), name='group-list'),
   path('users/<int:user_id>/groups/view/', UserGroupListView.as_view(), name='user-group-list'),
   path('users/<int:user_id>/groups/', UserGroupUpdateView.as_view(), name='user-group-update'),

   ### Admin loan-related routes
   path('loan/', include('gracecoop.urls.loan_urls')), 

   ###Admin contribution-related endpoints
   path('contribution/', include('gracecoop.urls.contribution_urls')),

   ### Admin levy-related routes
   path('levy/', include('gracecoop.urls.levy_urls')),

    ### Admin payment-related routes
   path('payment/', include('gracecoop.urls.payment_urls')),



   ### Cooperative admin config urls
   path('', include(router.urls)),

   ### Expense urls
   path('', include(expense_router.urls)),


   ### Announcement-related endpoints
   path('notice/', include('gracecoop.urls.announcement_urls')),

   ### Report-related endpoints
   path('report/', include('gracecoop.urls.report_urls')),
  

    

]



