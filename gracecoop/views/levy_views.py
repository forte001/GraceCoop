from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum
from gracecoop.models import Levy
from gracecoop.serializers import LevySerializer
from rest_framework.permissions import IsAuthenticated
from ..permissions import IsAdminUser
from django_filters.rest_framework import DjangoFilterBackend
from ..filters import LevyFilter

class BaseLevyViewSet(viewsets.ModelViewSet):
    queryset = Levy.objects.all()
    serializer_class = LevySerializer
    filter_backends = [DjangoFilterBackend]
    ordering_fields = ['date', 'amount']
    ordering = ['-date']

    def perform_create(self, serializer):
        if not serializer.validated_data.get('member'):
            serializer.save(member=self.request.user.memberprofile)
        else:
            serializer.save()


class AdminLevyViewSet(BaseLevyViewSet):
    permission_classes = [IsAdminUser]
    filterset_class = LevyFilter


class MemberLevyViewSet(BaseLevyViewSet):
    permission_classes = [IsAuthenticated]
    filterset_class = LevyFilter

    def get_queryset(self):
        return self.queryset.filter(member=self.request.user.memberprofile)

    def perform_create(self, serializer):
        serializer.save(member=self.request.user.memberprofile)

    @action(detail=False, methods=['get'], url_path='summary')
    def levy_summary(self, request):
        """
        Returns total levy paid to date.
        """
        profile = request.user.memberprofile
        total = Levy.objects.filter(member=profile).aggregate(total=Sum('amount'))['total'] or 0
        return Response({'total_levies': total})

    @action(detail=False, methods=['post'], url_path='pay')
    def pay_levy(self, request):
        """
        Handles monthly levy payment from member.
        Expected payload: { "amount": 2000 }
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(member=request.user.memberprofile)
        return Response(serializer.data, status=status.HTTP_201_CREATED)