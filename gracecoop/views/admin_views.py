from datetime import timedelta
from django.utils import timezone
import traceback
from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.exceptions import NotFound
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser, AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken, AccessToken
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.contrib.auth.models import Permission, Group
from django.http import JsonResponse
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_GET
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from gracecoop.models import User, MemberProfile
from gracecoop.custom_token import CustomTokenRefreshSerializer
from rest_framework import generics, permissions
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from ..permissions import IsAdminUser, IsSuperUser, IsAdminWith2FA
from django_filters.rest_framework import DjangoFilterBackend
from ..filters import PendingMemberFilter, MemberFilter, CooperativeConfigFilter
from gracecoop.pagination import StandardResultsSetPagination
from gracecoop.serializers import (
MemberProfileSerializer,
MemberProfile,
AdminLoginSerializer,
MemberApprovalSerializer,
CustomTokenObtainPairSerializer,
AdminMemberProfileEditSerializer,
PermissionSerializer,
UserPermissionUpdateSerializer,
PendingApprovalSerializer,
AdminUserSerializer, 
GroupSerializer,
UserGroupUpdateSerializer,
AdminDashboardStatsSerializer,
TwoFAVerifyLoginSerializer,
TwoFASetupVerifySerializer,
Toggle2FASerializer,
TwoFASetupSerializer,
CooperativeConfigSerializer,
AnnouncementSerializer
)
from gracecoop.permissions import (
    CanViewPendingApplications,
    CanApproveMember,
    CanViewApprovedMembers,
    CanUpdateMemberProfile,
)
from gracecoop.models import CooperativeConfig, Payment, Announcement
from django.db.models import Sum

###########################################################
### Admin Login View with 2FA implementaion
###########################################################
@method_decorator(csrf_exempt, name='dispatch')
class AdminLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        try:
            serializer = AdminLoginSerializer(data=request.data)
            if serializer.is_valid():
                user = serializer.validated_data["user"]

                # Check if 2FA is enabled for the user
                if user.is_2fa_enabled:
                    temp_token = AccessToken.for_user(user)
                    return Response({
                        "require_2fa": True,
                        "user_id": user.id,
                        "temp_token": str(temp_token),
                        "is_2fa_setup_complete": user.is_2fa_enabled
                    }, status=status.HTTP_200_OK)

                # If 2FA is not required, issue access and refresh tokens
                refresh = RefreshToken.for_user(user)
                return Response({
                    "detail": "Login successful.",
                    "access": str(refresh.access_token),
                    "refresh": str(refresh),
                    "user": {
                        "id": user.id,
                        "username": user.username,
                        "is_admin": True
                    }
                }, status=status.HTTP_200_OK)

            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        except Exception:
            print("LOGIN ERROR:\n", traceback.format_exc())
            return Response(
                {"detail": "Server error. Please check logs."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class Verify2FALoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = TwoFAVerifyLoginSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.validated_data["user"]

            refresh = RefreshToken.for_user(user)
            return Response({
                "detail": "2FA verification successful.",
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": {
                    "id": user.id,
                    "username": user.username,
                    "role": user.role,
                }
            }, status=status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)         
    

class Admin2FAVerifySetupView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        # Only allow staff (admin) to perform this action
        if not request.user.is_staff:
            return Response({"detail": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)

        # Validate the OTP for 2FA setup
        serializer = TwoFASetupVerifySerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            return Response({"detail": "2FA setup completed successfully."}, status=status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class Admin2FASetupView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not request.user.is_staff:
            return Response({"detail": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)

        # Use the serializer with an empty object to trigger get_totp_uri
        serializer = TwoFASetupSerializer({}, context={'request': request})
        return Response(serializer.data)


    def post(self, request):
        # Check if the user is an admin
        if not request.user.is_staff:
            return Response({"detail": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)

        # No additional logic needed for POST during initial setup
        return Response({"detail": "2FA setup initiated."})


class TwoFAStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({"is_2fa_enabled": request.user.is_2fa_enabled})

class Toggle2FAView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        user.is_2fa_enabled = not user.is_2fa_enabled
        if not user.is_2fa_enabled:
            user.otp_secret = None
        user.save()
        serializer = Toggle2FASerializer(user)
        return Response(serializer.data)    

class Disable2FAView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        user.is_2fa_enabled = False
        user.otp_secret = None  #  Clears the secret
        user.save()
        return Response({"detail": "2FA disabled."})
    

###################################################################
         
### Admin Token pair
class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

class CustomTokenRefreshView(TokenRefreshView):
    serializer_class = CustomTokenRefreshSerializer

class AdminDashboardView(APIView):
    permission_classes = [IsAuthenticated, IsAdminWith2FA]

    def get(self, request):
        return Response({"message": "Welcome to the Admin Dashboard"})
    
class AdminDashboardStatsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request, *args, **kwargs):
        total_members = MemberProfile.objects.count()
        pending_members = MemberProfile.objects.filter(status='pending').count()

        # filter for periods
        period = request.query_params.get('period', '30')
        try:
            period = int(period)
        except ValueError:
            period = 30

        today = timezone.now()
        start_date = today - timedelta(days=period)

        total_payments = Payment.objects.filter(
            created_at__gte=start_date, verified=True
        ).aggregate(total=Sum('amount'))['total'] or 0

        recent_payments = Payment.objects.filter(verified=True).order_by('-created_at')[:10]

        stats_data = {
            "total_members": total_members,
            "pending_members": pending_members,
            "total_payments": total_payments,
            "recent_payments": recent_payments,
            "period": period,
        }

        serializer = AdminDashboardStatsSerializer(stats_data)
        return Response(serializer.data)

    
# List all pending applications
class PendingApplicationsView(generics.ListAPIView):
    serializer_class = PendingApprovalSerializer
    permission_classes = [IsAdminUser, CanViewPendingApplications]
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend]
    filterset_class = PendingMemberFilter

    def get_queryset(self):
        return MemberProfile.objects.filter(status='pending')


# Approve a member application
class ApproveMemberApplicationView(generics.UpdateAPIView):
    serializer_class = MemberApprovalSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAdminUser, CanApproveMember]
    queryset = MemberProfile.objects.all()
    lookup_field = 'id'

# View to list approved members
class ApprovedMembersView(generics.ListAPIView):
    serializer_class = MemberProfileSerializer
    permission_classes = [IsAdminUser, CanViewApprovedMembers]
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend]
    filterset_class = MemberFilter

    def get_queryset(self):
        return MemberProfile.objects.filter(status='approved')

class AdminMemberUpdateView(generics.RetrieveUpdateAPIView):
    queryset = MemberProfile.objects.all()
    serializer_class = AdminMemberProfileEditSerializer
    permission_classes = [IsAdminUser, CanUpdateMemberProfile]



# List all admin users
class AdminUserListView(generics.ListAPIView):
    queryset = User.objects.filter(memberprofile__status='approved').distinct()
    serializer_class = AdminUserSerializer
    permission_classes = [permissions.IsAdminUser]


# List all permissions available in the system
class AllPermissionsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        permissions_qs = Permission.objects.all()
        serializer = PermissionSerializer(permissions_qs, many=True)
        return Response(serializer.data)

### Current Admin User check
class CurrentAdminPermissionCheckView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        try:
            is_admin = request.user.is_staff or request.user.is_superuser
            # print(f"[DEBUG] User: {request.user}, Is Auth: {request.user.is_authenticated}, Is Admin: {is_admin}")

            if is_admin:
                return Response({
                    "is_admin": True,
                    "user_id": request.user.id,
                    "username": request.user.username,
                }, status=200)
            else:
                return Response({"detail": "Forbidden: Admin access required."}, status=403)
        except Exception as e:
            print(f"[ERROR] {e}")
            return Response({"detail": "Unexpected server error."}, status=500)

    
# View and update a specific user's permissions
class AdminUserPermissionsView(APIView):
    permission_classes = [IsSuperUser]

    def get(self, request, user_id, *args, **kwargs):
        try:
            user = User.objects.get(id=user_id)
            perms = user.user_permissions.values_list('id', flat=True)
            return Response({'user_permissions': list(perms)})
        except User.DoesNotExist:
            return Response({'detail': 'User not found'}, status=404)

    def patch(self, request, user_id, *args, **kwargs):
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'detail': 'User not found'}, status=404)

        serializer = UserPermissionUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        permission_ids = serializer.validated_data['permissions']
        user.user_permissions.set(permission_ids)
        return Response({'status': 'Permissions updated successfully'})
    
    ### Group Permissions
class GroupListView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        groups = Group.objects.all()
        serializer = GroupSerializer(groups, many=True)
        return Response(serializer.data)        

class UserGroupListView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request, user_id):
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            raise NotFound("User not found")

        groups = user.groups.all()
        serializer = GroupSerializer(groups, many=True)
        return Response({'groups': serializer.data})

class UserGroupUpdateView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request, user_id):
        user = get_object_or_404(User, id=user_id)
        groups = user.groups.all()
        serializer = GroupSerializer(groups, many=True)
        return Response({'groups': serializer.data})

    def patch(self, request, user_id):
        user = get_object_or_404(User, id=user_id)
        serializer = UserGroupUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        group_ids = serializer.validated_data['group_ids']
        groups = Group.objects.filter(id__in=group_ids)

        # Step 1: Check group names
        group_names = list(groups.values_list('name', flat=True))

        # Step 2: Enforce admin group if assigning other groups
        assigning_other_roles = any(name.lower() not in ['admin', 'staff'] for name in group_names)
        has_admin_or_staff = any(name.lower() in ['admin', 'staff'] for name in group_names)

        if assigning_other_roles and not has_admin_or_staff:
            return Response({
                'detail': 'Admin or Staff group must be assigned before assigning other roles.'
            }, status=400)

        # Step 3: Save groups
        user.groups.set(groups)

        # Step 4: Set is_staff based on admin/staff group
        if has_admin_or_staff:
            if not user.is_staff:
                user.is_staff = True
                user.save()
        else:
            if user.is_staff and not user.is_superuser:
                user.is_staff = False
                user.save()

        return Response({'detail': 'Groups updated successfully'})

    

#######################################
## CSRF
#######################################
@require_GET
@ensure_csrf_cookie
def get_csrf_token(request):
    return JsonResponse({'detail': 'CSRF cookie set'})

#######################################
## COOPERATIVE CONFIG
#######################################

class CooperativeConfigAdminViewSet(viewsets.ModelViewSet):
    queryset = CooperativeConfig.objects.all().order_by('-effective_date')
    serializer_class = CooperativeConfigSerializer
    permission_classes = [IsAdminUser]
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend]
    filterset_class = CooperativeConfigFilter

#######################################
## ANNOUNCEMENTS
#######################################

class AnnouncementViewSet(viewsets.ModelViewSet):
    queryset = Announcement.objects.all().order_by("-created_at")
    serializer_class = AnnouncementSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['is_active']

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            permission_classes = [permissions.AllowAny]
        else:
            permission_classes = [permissions.IsAdminUser]
        return [permission() for permission in permission_classes]
    
    def create(self, request, *args, **kwargs):
        """
        Allow admin to create a new announcement.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    def update(self, request, *args, **kwargs):
        """
        Allow admin to fully update an existing announcement.
        """
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)
    
    def destroy(self, request, *args, **kwargs):
        """
        Allow admin to delete an announcement.
        """
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)