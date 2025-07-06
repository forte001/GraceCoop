from django.urls import path, include
from rest_framework.routers import DefaultRouter
from gracecoop.views.report_views import ReportsViewSet

router = DefaultRouter()
router.register(r'reports', ReportsViewSet, basename='reports')

urlpatterns = [
    path('', include(router.urls)),
]