from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from ..permissions import IsAdminUser, CanViewReports
from django.db.models import Sum
from django.db.models.functions import TruncMonth
from decimal import Decimal
from datetime import date, datetime
from django.utils import timezone
from django.contrib.auth import get_user_model
from collections import OrderedDict
from calendar import month_name
from ..serializers import (
    MemberBalanceReportSerializer,
    ReportParametersSerializer,
    ReportSummarySerializer
)
from gracecoop.models import MemberProfile, LoanRepayment, Payment
from gracecoop.pagination import StandardResultsSetPagination

User = get_user_model()


class ReportsViewSet(viewsets.ViewSet):
    """
    ViewSet for generating various cooperative reports.
    """

    permission_classes = [IsAdminUser, CanViewReports]
    pagination_class = StandardResultsSetPagination

    @action(detail=False, methods=["get"], url_path="members-balances")
    def members_balances(self, request):
        """
        Generate Members' Balances Report.
        """

        params_serializer = ReportParametersSerializer(data=request.query_params)
        params_serializer.is_valid(raise_exception=True)
        filters = params_serializer.validated_data

        as_of_date = filters.get("as_of_date", date.today())
        member_status = filters.get("member_status")
        approval_status = filters.get("approval_status", "approved")
        include_inactive = filters.get("include_inactive", False)

        members_qs = MemberProfile.objects.select_related("user")

        if not include_inactive:
            members_qs = members_qs.filter(membership_status="active")

        if member_status:
            members_qs = members_qs.filter(membership_status=member_status)

        if approval_status:
            members_qs = members_qs.filter(status=approval_status)

        # Add sorting
        sort_by = request.query_params.get("sort_by", "full_name")
        order = request.query_params.get("order", "asc")
        if order == "desc":
            sort_by = f"-{sort_by}"

        members_qs = members_qs.order_by(sort_by)

        members_data = []
        totals = {
            "contributions": Decimal("0.00"),
            "levies": Decimal("0.00"),
            "loans_disbursed": Decimal("0.00"),
            "loan_repayments": Decimal("0.00"),
            "outstanding_loans": Decimal("0.00"),
        }

        for member in members_qs:
            contributions_sum = member.contributions.filter(
                date__date__lte=as_of_date
            ).aggregate(total=Sum("amount"))["total"] or Decimal("0.00")

            levies_sum = member.levies.filter(
                date__date__lte=as_of_date
            ).aggregate(total=Sum("amount"))["total"] or Decimal("0.00")

            member_loans = member.loans.filter(
                status__in=["disbursed", "partially_disbursed", "paid", "grace_applied"]
            )

            loans_disbursed = member_loans.aggregate(total=Sum("disbursed_amount"))[
                "total"
            ] or Decimal("0.00")

            loan_repayments = LoanRepayment.objects.filter(
                loan__member=member, payment_date__lte=as_of_date
            ).aggregate(total=Sum("amount"))["total"] or Decimal("0.00")

            outstanding_loans = loans_disbursed - loan_repayments
            total_assets = contributions_sum + levies_sum
            net_position = total_assets - outstanding_loans

            member_data = {
                "member_id": member.member_id,
                "full_name": member.full_name,
                "email": member.email,
                "phone_number": member.phone_number,
                "membership_status": member.membership_status,
                "approval_status": member.status,
                "joined_on": member.joined_on,
                "contributions_balance": contributions_sum,
                "levies_balance": levies_sum,
                "total_assets": total_assets,
                "loans_disbursed": loans_disbursed,
                "loan_repayments": loan_repayments,
                "outstanding_loans": outstanding_loans,
                "active_loans_count": member_loans.exclude(status="paid").count(),
                "net_position": net_position,
            }

            members_data.append(member_data)

            totals["contributions"] += contributions_sum
            totals["levies"] += levies_sum
            totals["loans_disbursed"] += loans_disbursed
            totals["loan_repayments"] += loan_repayments
            totals["outstanding_loans"] += outstanding_loans

        total_members = len(members_data)
        total_assets = totals["contributions"] + totals["levies"]
        net_coop_position = total_assets - totals["outstanding_loans"]

        summary_data = {
            "report_date": as_of_date,
            "total_members": total_members,
            "total_contributions": totals["contributions"],
            "total_levies": totals["levies"],
            "total_assets": total_assets,
            "total_loans_disbursed": totals["loans_disbursed"],
            "total_loan_repayments": totals["loan_repayments"],
            "total_outstanding_loans": totals["outstanding_loans"],
            "net_cooperative_position": net_coop_position,
            "members_with_outstanding_loans": sum(
                1 for m in members_data if m["outstanding_loans"] > 0
            ),
            "average_contributions": (
                totals["contributions"] / total_members if total_members else Decimal("0.00")
            ),
            "average_outstanding_loans": (
                totals["outstanding_loans"] / total_members if total_members else Decimal("0.00")
            ),
        }

        # Serialize
        members_serializer = MemberBalanceReportSerializer(members_data, many=True)

        # apply DRF pagination
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(members_serializer.data, request)

        if page is not None:
            paginated_response = paginator.get_paginated_response(page)
            paginated_response.data["summary"] = summary_data
            return paginated_response


        # fallback if pagination fails
        return Response({
            "summary": summary_data,
            "members": members_serializer.data,
        })
    
    @action(detail=False, methods=["get"], url_path="monthly-receipts-analysis")
    def monthly_receipts_analysis(self, request):
        year = request.query_params.get("year")
        if not year:
            return Response({"error": "year parameter is required"}, status=400)
        
        year = int(year)
        current_month = datetime.now().month
        current_year = datetime.now().year
        
        monthly_data = OrderedDict()
        for month_num in range(1, 13):
            month_label = month_name[month_num]
            if year < current_year or (year == current_year and month_num <= current_month):
                # past or current month — default to 0
                monthly_data[month_label] = {
                    "shares": Decimal("0.00"),
                    "levy": Decimal("0.00"),
                    "loan_repayment": Decimal("0.00"),
                    "total": Decimal("0.00")
                }
            else:
                # future month — show dashes
                monthly_data[month_label] = {
                    "shares": "-",
                    "levy": "-",
                    "loan_repayment": "-",
                    "total": "-"
                }
        
        payments = (
            Payment.objects.filter(
                verified=True,
                created_at__year=year
            )
            .annotate(month=TruncMonth("created_at"))
            .values("month", "payment_type")
            .order_by("month")
            .annotate(total=Sum("amount"))
        )

        grand_total = Decimal("0.00")

        for record in payments:
            month_str = record["month"].strftime("%B")
            ptype = record["payment_type"]
            amt = record["total"]
            
            # only update if month was numeric before (skip dash months)
            if isinstance(monthly_data[month_str][ptype], Decimal):
                monthly_data[month_str][ptype] += amt
                monthly_data[month_str]["total"] += amt
                grand_total += amt

        return Response({
            "year": year,
            "monthly_breakdown": monthly_data,
            "grand_total": grand_total,
        })

    @action(detail=False, methods=["get"], url_path="available-reports")
    def available_reports(self, request):
        return Response(
            {
                "available_reports": [
                    {
                        "name": "members_balances",
                        "description": "Shows current balance of members' contributions and loans",
                        "endpoint": "/api/reports/members-balances/",
                    },
                    {
                        "name": "loan_portfolio",
                        "description": "Overview of all loans and their status",
                        "status": "coming soon",
                    },
                    {
                        "name": "financial_summary",
                        "description": "Overall cooperative financial summary",
                        "status": "coming soon",
                    },
                ]
            }
        )
