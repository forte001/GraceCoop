# Generated by Django 5.1.1 on 2025-04-29 14:32

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('gracecoop', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='memberprofile',
            name='membership_status',
            field=models.CharField(choices=[('active', 'Active'), ('inactive', 'Inactive'), ('archived', 'Archived')], default='inactive', max_length=10),
        ),
    ]
