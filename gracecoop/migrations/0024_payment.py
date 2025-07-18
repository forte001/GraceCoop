# Generated by Django 5.1.1 on 2025-05-29 10:52

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('gracecoop', '0023_cooperativeconfig_alter_loan_options_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='Payment',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('payment_type', models.CharField(choices=[('shares', 'Shares'), ('levy', 'Development Levy'), ('loan_repayment', 'Loan Repayment')], max_length=20)),
                ('reference', models.CharField(max_length=100, unique=True)),
                ('amount', models.DecimalField(decimal_places=2, max_digits=10)),
                ('verified', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('verified_at', models.DateTimeField(blank=True, null=True)),
                ('loan', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='gracecoop.loan')),
                ('member', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='gracecoop.memberprofile')),
            ],
        ),
    ]
