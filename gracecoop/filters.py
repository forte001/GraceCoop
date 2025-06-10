import django_filters
from .models import LoanRepayment, Contribution, Levy

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

class AdminContributionFilter(django_filters.FilterSet):
    member_name = django_filters.CharFilter(method='filter_by_member_name', label='Member Name')
    payment_date_after = django_filters.DateFilter(field_name='date', lookup_expr='gte')
    payment_date_before = django_filters.DateFilter(field_name='date', lookup_expr='lte')

    class Meta:
        model = Contribution
        fields = ['member_name', 'payment_date_after', 'payment_date_before']

    def filter_by_member_name(self, queryset, name, value):
        return queryset.filter(member__full_name__icontains=value)
    

class MemberContributionFilter(django_filters.FilterSet):
    payment_date_after = django_filters.DateFilter(field_name='date', lookup_expr='gte')
    payment_date_before = django_filters.DateFilter(field_name='date', lookup_expr='lte')

    class Meta:
        model = Contribution
        fields = [ 'payment_date_after', 'payment_date_before']

    def filter_by_member_name(self, queryset, name, value):
        return queryset.filter(member__full_name__icontains=value)

class AdminLevyFilter(django_filters.FilterSet):
    member_name = django_filters.CharFilter(method='filter_by_member_name', label='Member Name')
    payment_date_after = django_filters.DateFilter(field_name='date', lookup_expr='gte')
    payment_date_before = django_filters.DateFilter(field_name='date', lookup_expr='lte')

    class Meta:
        model = Levy
        fields = ['member_name', 'payment_date_after', 'payment_date_before']

    def filter_by_member_name(self, queryset, name, value):
        return queryset.filter(member__full_name__icontains=value)
    

class MemberLevyFilter(django_filters.FilterSet):
    payment_date_after = django_filters.DateFilter(field_name='date', lookup_expr='gte')
    payment_date_before = django_filters.DateFilter(field_name='date', lookup_expr='lte')

    class Meta:
        model = Levy
        fields = [ 'payment_date_after', 'payment_date_before']

    def filter_by_member_name(self, queryset, name, value):
        return queryset.filter(member__full_name__icontains=value)
