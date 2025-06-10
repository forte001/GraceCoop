from django.urls import include, path
from rest_framework.routers import DefaultRouter
from gracecoop.views.contribution_views import AdminContributionViewSet, MemberContributionViewSet

# Create a router for the Contribution viewset
contribution_router = DefaultRouter()

# Member routes
contribution_router.register(r'contributions-list', MemberContributionViewSet, basename='member-contribution')

# Admin routes
contribution_router.register(r'contributions-admin', AdminContributionViewSet, basename='admin-contribution')


urlpatterns = [
    path('', include(contribution_router.urls)),  # Handle all contribution-related endpoints
]