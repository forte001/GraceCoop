# Generated by Django 5.1.1 on 2025-05-15 09:17

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('gracecoop', '0006_alter_loan_options_loan_approved_at_loan_approved_by_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='loanapplication',
            name='category',
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, to='gracecoop.loancategory'),
        ),
    ]
