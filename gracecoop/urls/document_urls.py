from django.urls import path, include
from rest_framework.routers import DefaultRouter
from gracecoop.views.member_views import (MemberDocumentViewSet,
                                          MemberDocumentRequestViewSet,
                                          AdminDocumentViewSet,
                                          AdminDocumentRequestViewSet)

admin_document_router = DefaultRouter()
member_document_router = DefaultRouter()

# Admin routes - admin can manage all documents and requests
admin_document_router.register(r'admin-documents', AdminDocumentViewSet, basename='admin-documents')
admin_document_router.register(r'admin-document-requests', AdminDocumentRequestViewSet, basename='admin-document-requests')

# Member routes - members can only access their own data
member_document_router.register(r'member-documents', MemberDocumentViewSet, basename='member-documents')
member_document_router.register(r'member-document-requests', MemberDocumentRequestViewSet, basename='member-document-requests')
urlpatterns = [
    path('', include(admin_document_router.urls)),
    path('', include(member_document_router.urls)),
]