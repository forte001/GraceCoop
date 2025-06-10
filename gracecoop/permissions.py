from rest_framework.permissions import BasePermission

class IsApprovedMember(BasePermission):
    """Allows access only to users with an approved member profile."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and getattr(request.user, 'is_approved_member', False)

class IsAdminUser(BasePermission):
    """Allows access only to admin (staff) users."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.is_staff

class IsSuperUser(BasePermission):
    """Allows access only to superusers."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.is_superuser

class CanViewPendingApplications(BasePermission):
    """Allows access only to users with 'can_view_pending_applications' permission."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.has_perm('gracecoop.can_view_pending_applications')

class CanApproveMember(BasePermission):
    """Allows access only to users with 'can_approve_member' permission."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.has_perm('gracecoop.can_approve_member')

class CanViewApprovedMembers(BasePermission):
    """Allows access only to users with 'can_view_approved_members' permission."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.has_perm('gracecoop.can_view_approved_members')

class CanUpdateMemberProfile(BasePermission):
    """Allows access only to users with 'can_update_member_profile' permission."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.has_perm('gracecoop.can_update_member_profile')

class IsAdminWith2FA(BasePermission):
    """Allows access only to staff users who have a confirmed TOTP device (2FA enabled)."""
    def has_permission(self, request, view):
        if not request.user.is_authenticated or not request.user.is_staff:
            return False
        return request.user.totpdevice_set.filter(confirmed=True).exists()


########################################################
# LOAN-RELATED PERMISSIONS
#######################################################
class CanCreateLoanCategory(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.has_perm('gracecoop.can_create_loan_category')

class CanEditLoanCategory(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.has_perm('gracecoop.can_edit_loan_category')

class CanDeleteLoanCategory(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.has_perm('gracecoop.can_delete_loan_category')
    
    
class CanApproveLoan(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.has_perm('gracecoop.can_approve_loan')


class CanDeleteLoan(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.has_perm('gracecoop.can_delete_loan')


class CanDisburseLoan(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.has_perm('gracecoop.can_disburse_loan')


class CanApproveGracePeriod(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.has_perm('gracecoop.can_approve_grace_period')