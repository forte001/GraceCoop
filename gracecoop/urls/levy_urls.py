from rest_framework.routers import DefaultRouter
from gracecoop.views.levy_views import AdminLevyViewSet, MemberLevyViewSet
from django.urls import path, include


levy_router = DefaultRouter()

# Member routes
levy_router.register(r'member/levies', MemberLevyViewSet, basename='member-levy')

# Admin routes
levy_router.register(r'admin/levies', AdminLevyViewSet, basename='admin-levy')

urlpatterns = [
    path('levy/', include(levy_router.urls)),  # Handle all contribution-related endpoints
]