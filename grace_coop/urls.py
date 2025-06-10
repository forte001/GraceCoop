"""
URL configuration for grace_coop project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include, re_path
from django.views.generic import TemplateView
from django.conf import settings
from django.conf.urls.static import static
from gracecoop.views.admin_views import CustomTokenObtainPairView, CustomTokenRefreshView
from gracecoop.urls import member_urls, loan_urls, contribution_urls,  admin_urls
from gracecoop.views.admin_views import get_csrf_token


urlpatterns = [
    path('admin/', admin.site.urls),  # Admin URLs
    path('accounts/', include('django.contrib.auth.urls')),  # Authentication URLs (for login)/

    # Your API URLs
    path('api/members/', include(('gracecoop.urls.member_urls', 'members'), namespace='members')),       # Member-related URLs
    path('api/', include('gracecoop.urls.contribution_urls')),  # Contribution-related URLs
    # path('api/', include('gracecoop.urls.transaction_urls')),   # Transaction-related URLs
    path('api/admin/', include('gracecoop.urls.admin_urls')),   # Admin-related URLs

    path('api/csrf-token/', get_csrf_token, name='csrf-token'),

   

    # JWT authentication routes
    path('api/token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', CustomTokenRefreshView.as_view(), name='token_refresh'),

    

    # Updated catch-all route with explicit exclusions
    re_path(r'^(?!admin(?:/|$)|api(?:/|$)|accounts(?:/|$)).*$', TemplateView.as_view(template_name='index.html')),
    
]



# Serve static files in development
if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)