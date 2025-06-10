# from django.db.models.signals import post_save
# from django.dispatch import receiver
# from gracecoop.models import MemberProfile, User
# from django.db.models.signals import m2m_changed
# # from django.contrib.auth.models import User, Group



# @receiver(post_save, sender=User)
# def create_member_profile(sender, instance, created, **kwargs):
#     if created and not hasattr(instance, "profile"):
#         MemberProfile.objects.create(
#             user=instance,
#             full_name=instance.username,
#             email=instance.email
#         )

# @receiver(m2m_changed, sender=User.groups.through)
# def update_is_staff_on_admin_group(sender, instance, action, **kwargs):
#     if action == "post_add":
#         if instance.groups.filter(name="Admin").exists():
#             instance.is_staff = True
#             instance.save()