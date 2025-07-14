from django.contrib import admin
from .models import (

MemberProfile,
LoanCategory, 
Loan,
LoanApplication,
LoanRepayment,
LoanRepaymentSchedule,
DisbursementLog,
Contribution, 
User,
CooperativeConfig,
Payment,
Levy,
Announcement,
Expense,
LoanGuarantor
)
class UserAdmin(admin.ModelAdmin):
    list_display = (
        'id', 'first_name', 'last_name', 'email','date_joined','is_active', 'is_staff', 'is_superuser'
    )
    search_fields = ['__all__']
    list_filter = ('id', 'is_active','is_staff', 'is_superuser' )

class MemberProfileAdmin(admin.ModelAdmin):
    list_display = (
        'id', 'user_full_name', 'user_email', 'status', 'membership_status',
        'member_id', 'has_paid_shares', 'has_paid_levy', 'joined_on'
    )
    search_fields = ('user__first_name', 'user__last_name', 'user__email', 'member_id')
    list_filter = ('status', 'has_paid_shares', 'has_paid_levy')

    def user_full_name(self, obj):
        return obj.user.get_full_name() if obj.user else "—"
    user_full_name.short_description = 'Full Name'

    def user_email(self, obj):
        return obj.user.email if obj.user else "—"
    user_email.short_description = 'Email'

    def approve_member(self, request, queryset):
        for member in queryset:
            if member.status == 'pending' and member.has_paid_shares and member.has_paid_levy:
                member.status = 'approved'
                member.save()
    approve_member.short_description = "Approve selected members"

    def get_actions(self, request):
        actions = super().get_actions(request)
        if not any(
            m.has_paid_shares and m.has_paid_levy and m.status == 'pending'
            for m in self.model.objects.filter(status='pending')
        ):
            actions.pop('approve_member', None)
        return actions

class LoanCategoryAdmin(admin.ModelAdmin):
    list_display = ('uuid','name', 'abbreviation', 'interest_rate', 'loan_period_months', 'grace_period_months', 'status')
    list_filter = ('name','status', 'abbreviation')
    search_fields = ('name', 'abbreviation')
    readonly_fields = ('id',)

class LoanAdmin(admin.ModelAdmin):
    list_display = (
        'id', 'reference', 'member', 'category', 'amount', 'interest_rate', 'duration_months',
        'status', 'disbursed_amount', 'remaining_disbursement', 'approved_by', 'approved_at'
    )
    list_filter = ('status', 'category')
    search_fields = ('member__full_name', 'member__member_id', 'id','reference',)
    ordering = ('-approved_at',)
    

    def member_full_name(self, obj):
        return obj.member.user.get_full_name() if obj.member and obj.member.user else "—"
    member_full_name.short_description = 'Member Name'

    def member_id(self, obj):
        return obj.member.member_id if obj.member else "—"
    member_id.short_description = 'Member ID'

    def approved_by_email(self, obj):
        return obj.approved_by.email if obj.approved_by else "—"
    approved_by_email.short_description = 'Approved By'

class DisbursementLogAdmin(admin.ModelAdmin):
    list_display = (
        'id','loan__reference', 'loan_id', 'member_full_name', 'amount', 'repayment_months',
        'disbursed_by_email', 'disbursed_at'
    )
    search_fields = ('loan__reference','loan__id', 'loan__member__user__first_name', 'loan__member__user__last_name')
    list_filter = ('disbursed_at',)

    def loan_id(self, obj):
        return obj.loan.id
    loan_id.short_description = 'Loan ID'

    def member_full_name(self, obj):
        return obj.loan.member.user.get_full_name() if obj.loan and obj.loan.member and obj.loan.member.user else "—"
    member_full_name.short_description = 'Member'

    def disbursed_by_email(self, obj):
        return obj.disbursed_by.email if obj.disbursed_by else "—"
    disbursed_by_email.short_description = 'Disbursed By'

class LoanApplicationAdmin(admin.ModelAdmin):
    list_display = (
        'applicant', 'category', 'amount', 'interest_rate', 'loan_period_months',
        'repayment_months', 'status', 'application_date', 'approved_by', 'approval_date'
    )
    list_filter = ('status', 'category', 'application_date')
    search_fields = ('applicant__username',)

class LoanGuarantorAdmin(admin.ModelAdmin):
    list_display = ('id', 'application', 'guarantor', 'created_at')
    list_filter = ('application', 'guarantor','consent_status', 'created_at', 'response_date')

class LoanRepaymentAdmin(admin.ModelAdmin):
    list_display = (
        'id', 'loan__reference', 'loan_id','source_reference', 'member_full_name', 'amount', 'principal_component',
        'interest_component', 'payment_date', 'was_late', 'paid_by_email', 'recorded_at'
    )
    search_fields = ('loan__id', 'loan__member__user__first_name', 'loan__member__user__last_name')
    list_filter = ('was_late', 'payment_date')

    def loan_id(self, obj):
        return obj.loan.id
    loan_id.short_description = 'Loan ID'

    def member_full_name(self, obj):
        return obj.loan.member.user.get_full_name() if obj.loan and obj.loan.member and obj.loan.member.user else "—"
    member_full_name.short_description = 'Member'

    def paid_by_email(self, obj):
        return obj.paid_by.email if obj.paid_by else "—"
    paid_by_email.short_description = 'Paid By'

class LoanRepaymentScheduleAdmin(admin.ModelAdmin):
    list_display = (
        'id', 'loan__reference', 'loan_id', 'member_full_name', 'installment', 'due_date',
        'principal', 'interest', 'amount_due', 'is_paid'
    )
    search_fields = ('loan__reference','loan__id', 'loan__member__user__first_name', 'loan__member__user__last_name')
    list_filter = ('is_paid', 'due_date')

    def loan_id(self, obj):
        return obj.loan.id
    loan_id.short_description = 'Loan ID'

    def member_full_name(self, obj):
        return obj.loan.member.user.get_full_name() if obj.loan and obj.loan.member and obj.loan.member.user else "—"
    member_full_name.short_description = 'Member'

class CooperativeConfigAdmin(admin.ModelAdmin):
    list_display = ('entry_shares_amount', 'development_levy_amount', 'status', 'effective_date')
    list_filter = ('status',)
    search_fields = ('status',)

class PaymentAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'member',
        'payment_type',
        'loan',
        'amount',
        'reference',
        'verified',
        'created_at',
        'verified_at',
    )
    list_filter = ('payment_type', 'verified', 'created_at')
    search_fields = ('member__full_name', 'reference', 'loan__reference')
    ordering = ('-created_at',)
    readonly_fields = ('created_at', 'verified_at')
    list_editable = ('verified',)

class LevyAdmin(admin.ModelAdmin):
    list_display =['id', 'member', 'amount', 'date']
    search_fields =['member']
    ordering = ['date']

class ContributionAdmin(admin.ModelAdmin):
    list_display =['id', 'member', 'amount', 'date']
    search_fields =['member']
    ordering = ['date']

class AnnouncementAdmin(admin.ModelAdmin):
    list_display = ['title', 'is_active', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['title', 'message']

class ExpenseAdmin(admin.ModelAdmin):
    list_display = ('id','title','vendor_name', 'category', 'amount', 'date_incurred', 'recorded_by')
    list_filter = ('category', 'date_incurred')
    search_fields = ('recorded_by','vendor_name', 'narration')

# Register your models
admin.site.register(LoanGuarantor, LoanGuarantorAdmin),
admin.site.register(Expense, ExpenseAdmin),
admin.site.register(Announcement, AnnouncementAdmin),
admin.site.register(Levy, LevyAdmin),
admin.site.register(Payment,PaymentAdmin),
admin.site.register(CooperativeConfig, CooperativeConfigAdmin),
admin.site.register(LoanRepaymentSchedule, LoanRepaymentScheduleAdmin),
admin.site.register(LoanRepayment, LoanRepaymentAdmin),
admin.site.register(LoanApplication, LoanApplicationAdmin),
admin.site.register(DisbursementLog, DisbursementLogAdmin),
admin.site.register(LoanCategory, LoanCategoryAdmin),
admin.site.register(MemberProfile,  MemberProfileAdmin)
admin.site.register(Loan, LoanAdmin),
admin.site.register(Contribution, ContributionAdmin),
admin.site.register(User, UserAdmin)
