from django.urls import path, include
from rest_framework.routers import DefaultRouter
from gracecoop.views.member_views import MemberDocumentViewSet, DocumentRequestViewSet

document_router = DefaultRouter()
document_router.register(r'documents', MemberDocumentViewSet, basename='documents')  
document_router.register(r'requests', DocumentRequestViewSet, basename='requests')

urlpatterns = [
    path('', include(document_router.urls)),
]