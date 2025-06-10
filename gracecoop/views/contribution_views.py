from rest_framework import viewsets,status
from ..models import Contribution
from ..serializers import ContributionSerializer
from ..permissions import IsAdminUser
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum
from django_filters.rest_framework import DjangoFilterBackend
from ..filters import AdminContributionFilter, MemberContributionFilter

class BaseContributionViewSet(viewsets.ModelViewSet):
    queryset = Contribution.objects.all()
    serializer_class = ContributionSerializer
    filter_backends = [DjangoFilterBackend]
    ordering_fields = ['date', 'amount']
    ordering = ['-date']

    def perform_create(self, serializer):
        if not serializer.validated_data.get('member'):
            serializer.save(member=self.request.user.memberprofile)
        else:
            serializer.save()


class AdminContributionViewSet(BaseContributionViewSet):
    permission_classes = [IsAdminUser]
    filterset_class = AdminContributionFilter
    


class MemberContributionViewSet(BaseContributionViewSet):
    permission_classes = [IsAuthenticated]
    filterset_class = MemberContributionFilter

    def get_queryset(self):
        return self.queryset.filter(member=self.request.user.memberprofile)

    def perform_create(self, serializer):
        serializer.save(member=self.request.user.memberprofile)

    @action(detail=False, methods=['get'], url_path='summary')
    def contribution_summary(self, request):
        """
        Returns total contributions made by the member to date.
        """
        profile = request.user.memberprofile
        total = Contribution.objects.filter(member=profile).aggregate(total=Sum('amount'))['total'] or 0
        return Response({'total_contributions': total})

    @action(detail=False, methods=['post'], url_path='make')
    def make_contribution(self, request):
        """
        Handles contribution payment from member.
        Expected payload: { "amount": 10000 }
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(member=request.user.memberprofile)
        return Response(serializer.data, status=status.HTTP_201_CREATED)