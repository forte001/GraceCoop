from rest_framework import viewsets, generics, status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework_simplejwt.tokens import RefreshToken, AccessToken
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from ..models import MemberProfile, CooperativeConfig
from ..serializers import (
    UserSerializer,
    MemberProfileSerializer,
    UserRegistrationSerializer,
    UserLoginSerializer,
    TwoFASetupVerifySerializer,
    TwoFASetupSerializer,
    CooperativeConfigSerializer
)


# =======================
# USER REGISTRATION & LOGIN
# =======================

class UserRegistrationView(APIView):
    permission_classes = [AllowAny]
    def post(self, request):
        serializer = UserRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            # Create the user
            user = serializer.save()
            return Response({"message": "Registration successful!"}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


########################################################
### User Login View with 2FA implementation
########################################################
@method_decorator(csrf_exempt, name='dispatch')
class UserLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        # Deserialize the incoming request
        serializer = UserLoginSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.validated_data['user']
            profile = serializer.validated_data['profile']

            # Check if 2FA is enabled for the user
            if user.is_2fa_enabled:
                # Generate a temporary token for 2FA
                temp_token = AccessToken.for_user(user)

                # Respond with temp_token and user ID for further OTP verification
                return Response({
                    "require_2fa": True,
                    "user_id": user.id,
                    "temp_token": str(temp_token),
                    "is_2fa_setup_complete": user.is_2fa_enabled
                }, status=status.HTTP_200_OK)

            # If 2FA is not required, issue the normal access and refresh tokens
            refresh = RefreshToken.for_user(user)
            return Response({
                "message": "Login successful!",
                "user": {
                    "username": user.username,
                    "email": user.email,
                },
                "profile": {
                    "member_id": profile.member_id,
                    "full_name": profile.full_name,
                    "status": profile.status,
                },
                "access": str(refresh.access_token),
                "refresh": str(refresh),
            }, status=status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
class Member2FASetupView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Use the serializer with an empty object to trigger get_totp_uri
        serializer = TwoFASetupSerializer({}, context={'request': request})
        return Response(serializer.data)

    def post(self, request):
        # No additional logic needed for POST during initial setup
        return Response({"detail": "2FA setup initiated."})
    
class Member2FAVerifyView(APIView):

    permission_classes = [IsAuthenticated]

    def post(self, request):
        # Validate the OTP for 2FA setup
        serializer = TwoFASetupVerifySerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            return Response({"detail": "2FA setup completed successfully."}, status=status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)



class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)
    

# =======================
# MEMBER VIEWS
# =======================

class MemberViewSet(viewsets.ModelViewSet):
    queryset = MemberProfile.objects.all()
    serializer_class = MemberProfileSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=["get"], url_path="my-profile")
    def my_profile(self, request):
        user = request.user
        try:
            profile, created = MemberProfile.objects.get_or_create(
                user=user,
                defaults={
                    "full_name": user.username,
                    "email": user.email,
                }
            )
            serializer = self.get_serializer(profile)
            return Response(serializer.data)
        except Exception as e:
            print("❌ Error in my-profile:", e)
            return Response(
                {"error": "Unable to retrieve or create your profile."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )



# =======================
# MEMBER-SELF PROFILE VIEW
# =======================

class MyMemberProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = MemberProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        user = self.request.user
        profile, created = MemberProfile.objects.get_or_create(
            user=user,
            defaults={
                "full_name": user.username,
                "email": user.email,
                "phone_number": getattr(user, 'phone_number', ''),
                "address": getattr(user, 'address', ''),
                "status": "pending",
            }
        )
        return profile
    
class ActiveCooperativeConfigView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, *args, **kwargs):
        active_config = CooperativeConfig.objects.filter(status='active').order_by('-effective_date').first()
        if active_config:
            serializer = CooperativeConfigSerializer(active_config)
            return Response(serializer.data)
        return Response({"detail": "No active cooperative config found."}, status=404)
        
