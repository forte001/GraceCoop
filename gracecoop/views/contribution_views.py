from rest_framework import viewsets,status
from ..models import Contribution
from ..serializers import ContributionSerializer
from ..permissions import IsAdminUser
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum

class BaseContributionViewSet(viewsets.ModelViewSet):
    queryset = Contribution.objects.all()
    serializer_class = ContributionSerializer

    def perform_create(self, serializer):
        if not serializer.validated_data.get('member'):
            serializer.save(member=self.request.user.memberprofile)
        else:
            serializer.save()


class AdminContributionViewSet(BaseContributionViewSet):
    permission_classes = [IsAdminUser]


class MemberContributionViewSet(BaseContributionViewSet):
    permission_classes = [IsAuthenticated]

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