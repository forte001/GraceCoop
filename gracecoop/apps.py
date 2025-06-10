from django.apps import AppConfig


class GracecoopConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'gracecoop'

    # def ready(self):
    #     import gracecoop.signals # Importing signal
