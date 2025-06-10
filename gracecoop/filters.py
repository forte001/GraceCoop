import django_filters
from .models import LoanRepayment

class AdminRepaymentFilter(django_filters.FilterSet):
    loan__reference = django_filters.CharFilter(field_name='loan__reference', lookup_expr='icontains')
    was_late = django_filters.BooleanFilter()
    payment_date_after = django_filters.DateFilter(field_name='payment_date', lookup_expr='gte')
    payment_date_before = django_filters.DateFilter(field_name='payment_date', lookup_expr='lte')

    class Meta:
        model = LoanRepayment
        fields = ['loan__reference', 'was_late', 'payment_date_after', 'payment_date_before']

class MemberRepaymentFilter(django_filters.FilterSet):
    loan__reference = django_filters.CharFilter(field_name='loan__reference', lookup_expr='icontains')
    was_late = django_filters.BooleanFilter()
    due_date = django_filters.DateFromToRangeFilter() 
    payment_date_after = django_filters.DateFilter(field_name='payment_date', lookup_expr='gte')
    payment_date_before = django_filters.DateFilter(field_name='payment_date', lookup_expr='lte')

    class Meta:
        model = LoanRepayment
        fields = ['loan__reference', 'was_late', 'due_date']


