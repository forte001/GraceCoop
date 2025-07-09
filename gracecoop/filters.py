import django_filters
from .models import (LoanRepayment, 
                     Contribution, 
                     Levy, Loan, 
                     LoanApplication,
                     MemberProfile, 
                     CooperativeConfig,
                     Payment,
                     DisbursementLog,
                     Expense)
from django.db.models import Q

class LoanApplicationFilter(django_filters.FilterSet):
    query = django_filters.CharFilter(method='filter_by_query', label='Search by applicant username or name')
    approved_at_after = django_filters.DateFilter(field_name='approval_date', lookup_expr='gte')
    approved_at_before = django_filters.DateFilter(field_name='approval_date', lookup_expr='lte')

    class Meta:
        model = LoanApplication
        fields = {
            'status': ['exact'],
            'category': ['exact'],
            'loan_period_months': ['exact'],
            'amount': ['gte', 'lte'],
            'application_date': ['gte', 'lte'],
        }

    def filter_by_query(self, queryset, name, value):
        return queryset.filter(
            Q(applicant__user__first_name__icontains=value) |
            Q(applicant__user__last_name__icontains=value)|
            Q(applicant__username__icontains=value)
        )

class LoanFilter(django_filters.FilterSet):
    query = django_filters.CharFilter(method='filter_by_query', label='Search by reference or member')
    approved_at_after = django_filters.DateFilter(field_name='approved_at', lookup_expr='gte')
    approved_at_before = django_filters.DateFilter(field_name='approved_at', lookup_expr='lte')

    # ✅ Add disbursed_at filters
    disbursed_at_after = django_filters.DateFilter(field_name='disbursed_at', lookup_expr='gte')
    disbursed_at_before = django_filters.DateFilter(field_name='disbursed_at', lookup_expr='lte')

    class Meta:
        model = Loan
        fields = [
            'approved_at_after',
            'approved_at_before',
            'disbursed_at_after',
            'disbursed_at_before',
        ]

    def filter_by_query(self, queryset, name, value):
        return queryset.filter(
            Q(reference__icontains=value) |
            Q(member__user__first_name__icontains=value) |
            Q(member__user__last_name__icontains=value)
        )

        

class RepaymentFilter(django_filters.FilterSet):
    loan__reference = django_filters.CharFilter(field_name='loan__reference', lookup_expr='icontains')
    was_late = django_filters.BooleanFilter()
    payment_date_after = django_filters.DateFilter(field_name='payment_date', lookup_expr='gte')
    payment_date_before = django_filters.DateFilter(field_name='payment_date', lookup_expr='lte')

    class Meta:
        model = LoanRepayment
        fields = ['loan__reference', 'was_late', 'payment_date_after', 'payment_date_before']


class ContributionFilter(django_filters.FilterSet):
    member_name = django_filters.CharFilter(method='filter_by_member_name', label='Member Name')
    payment_date_after = django_filters.DateFilter(field_name='date', lookup_expr='gte')
    payment_date_before = django_filters.DateFilter(field_name='date', lookup_expr='lte')
    source_reference = django_filters.CharFilter(field_name='source_reference', lookup_expr='icontains')

    class Meta:
        model = Contribution
        fields = ['member_name', 'payment_date_after', 'payment_date_before', 'source_reference']

    def filter_by_member_name(self, queryset, name, value):
        return queryset.filter(
        Q(member__user__first_name__icontains=value) |
        Q(member__user__last_name__icontains=value)
    )


class LevyFilter(django_filters.FilterSet):
    member_name = django_filters.CharFilter(method='filter_by_member_name', label='Member Name')
    payment_date_after = django_filters.DateFilter(field_name='date', lookup_expr='gte')
    payment_date_before = django_filters.DateFilter(field_name='date', lookup_expr='lte')
    source_reference = django_filters.CharFilter(field_name='source_reference', lookup_expr='icontains')

    class Meta:
        model = Levy
        fields = ['member_name', 'payment_date_after', 'payment_date_before', 'source_reference']

    def filter_by_member_name(self, queryset, name, value):
        return queryset.filter(
        Q(member__user__first_name__icontains=value) |
        Q(member__user__last_name__icontains=value)
    )
    
class PendingMemberFilter(django_filters.FilterSet):
    has_paid_shares = django_filters.BooleanFilter()
    has_paid_levy = django_filters.BooleanFilter()
    membership_status = django_filters.ChoiceFilter(choices=MemberProfile.MEMBERSHIP_STATUS_CHOICES)
    joined_on_after = django_filters.DateFilter(field_name='joined_on', lookup_expr='gte')
    joined_on_before = django_filters.DateFilter(field_name='joined_on', lookup_expr='lte')

    # Full-text search fields
    full_name = django_filters.CharFilter(field_name='full_name', lookup_expr='icontains')
    email = django_filters.CharFilter(field_name='email', lookup_expr='icontains')

    class Meta:
        model = MemberProfile
        fields = [
            'has_paid_shares',
            'has_paid_levy',
            'membership_status',
            'joined_on_after',
            'joined_on_before',
            'full_name',
            'email',
        ]

class MemberFilter(django_filters.FilterSet):
    full_name = django_filters.CharFilter(lookup_expr='icontains')
    email = django_filters.CharFilter(lookup_expr='icontains')
    member_id = django_filters.CharFilter(lookup_expr='icontains')
    membership_status = django_filters.ChoiceFilter(
        choices=MemberProfile.MEMBERSHIP_STATUS_CHOICES
    )
    joined_on_after = django_filters.DateFilter(field_name='joined_on', lookup_expr='gte')
    joined_on_before = django_filters.DateFilter(field_name='joined_on', lookup_expr='lte')

    class Meta:
        model = MemberProfile
        fields = [
            'full_name',
            'email',
            'member_id',
            'membership_status',
            'joined_on_after',
            'joined_on_before',
        ]

class CooperativeConfigFilter(django_filters.FilterSet):
    status = django_filters.CharFilter(lookup_expr='iexact')  # e.g. active, inactive, archived
    effective_date_after = django_filters.DateFilter(field_name='effective_date', lookup_expr='gte')
    effective_date_before = django_filters.DateFilter(field_name='effective_date', lookup_expr='lte')

    class Meta:
        model = CooperativeConfig
        fields = ['status', 'effective_date_after', 'effective_date_before']


class PaymentFilter(django_filters.FilterSet):
    payment_type = django_filters.CharFilter(lookup_expr='iexact')
    verified = django_filters.BooleanFilter()
    member__full_name = django_filters.CharFilter(field_name='member__full_name', lookup_expr='icontains')
    created_at = django_filters.DateFromToRangeFilter()

    class Meta:
        model = Payment
        fields = ['payment_type', 'verified', 'member__full_name', 'created_at']


class DisbursementLogFilter(django_filters.FilterSet):
    disbursed_by__username = django_filters.CharFilter(lookup_expr='icontains')
    loan__reference = django_filters.CharFilter(lookup_expr='icontains')
    disbursed_at = django_filters.DateFromToRangeFilter()

    class Meta:
        model = DisbursementLog
        fields = ['disbursed_by__username', 'loan__reference', 'disbursed_at']

class ExpenseFilter(django_filters.FilterSet):
    vendor_name = django_filters.CharFilter(field_name='vendor_name', lookup_expr='icontains')
    category = django_filters.CharFilter(field_name='category')
    title = django_filters.CharFilter(field_name='title', lookup_expr='icontains')
    date_incurred_after = django_filters.DateFilter(field_name='date_incurred', lookup_expr='gte')
    date_incurred_before = django_filters.DateFilter(field_name='date_incurred', lookup_expr='lte')

    class Meta:
        model = Expense
        fields = ['vendor_name', 'category', 'title', 'date_incurred_after', 'date_incurred_before']