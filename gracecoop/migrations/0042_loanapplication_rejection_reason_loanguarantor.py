# Generated by Django 5.1.1 on 2025-07-09 22:31

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('gracecoop', '0041_expense'),
    ]

    operations = [
        migrations.AddField(
            model_name='loanapplication',
            name='rejection_reason',
            field=models.TextField(blank=True, null=True),
        ),
        migrations.CreateModel(
            name='LoanGuarantor',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('added_at', models.DateTimeField(auto_now_add=True)),
                ('application', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='guarantors', to='gracecoop.loanapplication')),
                ('guarantor', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='guaranteeing_applications', to='gracecoop.memberprofile')),
            ],
            options={
                'unique_together': {('application', 'guarantor')},
            },
        ),
    ]
