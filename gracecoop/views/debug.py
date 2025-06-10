from django.http import HttpResponse

def debug_login_view(request):
    return HttpResponse("DEBUG: Reached /admin/login/")