# gracecoop/middleware.py

from django_otp.middleware import OTPMiddleware

class ConditionalOTPMiddleware(OTPMiddleware):
    def __call__(self, request):
        if request.path.startswith('/admin/login/'):
            return self.get_response(request)
        if request.path.startswith('/admin/'):
            return self.get_response(request)
        return super().__call__(request)

