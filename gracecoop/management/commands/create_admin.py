import os
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()

class Command(BaseCommand):
    help = "Creates an admin user if ENABLE_CREATE_ADMIN is set to true"

    def handle(self, *args, **options):
        should_run = os.environ.get("ENABLE_CREATE_ADMIN", "false").lower() == "true"

        if not should_run:
            self.stdout.write(self.style.WARNING("Admin creation skipped (ENABLE_CREATE_ADMIN not set to true)."))
            return

        username = os.environ["ADMIN_USERNAME"]
        email = os.environ["ADMIN_EMAIL"]
        password = os.environ["ADMIN_PASSWORD"]

        if User.objects.filter(username=username).exists():
            self.stdout.write(self.style.NOTICE("Admin user already exists."))
        else:
            User.objects.create_superuser(username=username, email=email, password=password)
            self.stdout.write(self.style.SUCCESS(f"Admin user '{username}' created successfully."))


