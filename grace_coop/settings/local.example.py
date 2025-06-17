# grace_coop/settings/local.example.py

from .base import *

DEBUG = True

# Replace with a secure secret key before use
SECRET_KEY = 'your-local-secret-key'

ALLOWED_HOSTS = [
    'localhost',
    '127.0.0.1',
    'your-ngrok-subdomain.ngrok-free.app',
]

STATICFILES_DIRS += [
    os.path.join(BASE_DIR, 'frontend/build'),
]

CORS_ALLOWED_ORIGINS = [
    'http://localhost:3000',
]

CSRF_TRUSTED_ORIGINS = [
    'http://localhost:3000',
]

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'your_local_db_name',
        'USER': 'your_local_db_user',
        'PASSWORD': 'your_local_db_password',
        'HOST': 'localhost',
        'PORT': '5432',
    }
}

# Dummy or test Paystack keys for development
PAYSTACK_SECRET_KEY = 'your_test_paystack_secret_key'
PAYSTACK_PUBLIC_KEY = 'your_test_paystack_public_key'
ALLOWED_PAYSTACK_IPS = ['*']

SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False
