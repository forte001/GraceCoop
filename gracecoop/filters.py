import django_filters
from .models import LoanRepayment, Contribution, Levy, Loan
from django.db.models import Q


class LoanFilter(django_filters.FilterSet):
    query = django_filters.CharFilter(method='filter_by_query', label='Search by reference or member')
    approved_at_after = django_filters.DateFilter(field_name='approved_at', lookup_expr='gte')
    approved_at_before = django_filters.DateFilter(field_name='approved_at', lookup_expr='lte')

    class Meta:
        model = Loan
        fields = ['approved_at_after', 'approved_at_before']  # Only actual model fields or mapped ones

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

    class Meta:
        model = Contribution
        fields = ['member_name', 'payment_date_after', 'payment_date_before']

    def filter_by_member_name(self, queryset, name, value):
        return queryset.filter(
        Q(member__user__first_name__icontains=value) |
        Q(member__user__last_name__icontains=value)
    )


class LevyFilter(django_filters.FilterSet):
    member_name = django_filters.CharFilter(method='filter_by_member_name', label='Member Name')
    payment_date_after = django_filters.DateFilter(field_name='date', lookup_expr='gte')
    payment_date_before = django_filters.DateFilter(field_name='date', lookup_expr='lte')

    class Meta:
        model = Levy
        fields = ['member_name', 'payment_date_after', 'payment_date_before']

    def filter_by_member_name(self, queryset, name, value):
        return queryset.filter(
        Q(member__user__first_name__icontains=value) |
        Q(member__user__last_name__icontains=value)
    )
    
