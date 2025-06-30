from rest_framework.routers import DefaultRouter
from django.urls import path, include
from gracecoop.views.admin_views import AnnouncementViewSet

router = DefaultRouter()
router.register(r'announcements', AnnouncementViewSet, basename='announcement')

urlpatterns = [
    path('', include(router.urls)),
]