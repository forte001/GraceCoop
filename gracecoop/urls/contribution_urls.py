from django.urls import include, path
from rest_framework.routers import DefaultRouter
from gracecoop.views.contribution_views import AdminContributionViewSet, MemberContributionViewSet

# Create a router for the Contribution viewset
contribution_router = DefaultRouter()

# Member routes
contribution_router.register(r'member/contributions', MemberContributionViewSet, basename='member-contribution')

# Admin routes
contribution_router.register(r'admin/contributions', AdminContributionViewSet, basename='admin-contribution')


urlpatterns = [
    path('contributions/', include(contribution_router.urls)),  # Handle all contribution-related endpoints
]