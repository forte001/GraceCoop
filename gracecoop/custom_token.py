from rest_framework_simplejwt.serializers import TokenObtainPairSerializer, TokenRefreshSerializer
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import InvalidToken

class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)

        # Add custom claims
        token['username'] = user.username
        token['is_staff'] = user.is_staff
        token['is_superuser'] = user.is_superuser
        token['is_admin'] = user.is_staff or user.is_superuser

        return token
    
class CustomTokenRefreshSerializer(TokenRefreshSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        try:
            access = AccessToken(data['access'])
            user = self.context['request'].user or self.user  # fallback

            # If user is not attached, get it from token
            if user is None and 'user_id' in access.payload:
                from django.contrib.auth import get_user_model
                User = get_user_model()
                user = User.objects.get(id=access['user_id'])

            access['username'] = user.username
            # access['is_staff'] = user.is_staff
            access['is_superuser'] = user.is_superuser
            access['is_admin'] = user.is_staff or user.is_superuser

            data['access'] = str(access)
        except Exception:
            raise InvalidToken("Failed to add custom claims during refresh.")
        return data