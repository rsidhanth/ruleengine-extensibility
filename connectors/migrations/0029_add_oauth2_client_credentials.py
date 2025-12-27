from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('connectors', '0028_add_oauth2_token_header_config'),
    ]

    operations = [
        migrations.AlterField(
            model_name='credential',
            name='auth_type',
            field=models.CharField(
                choices=[
                    ('none', 'No Authentication'),
                    ('basic', 'Basic Authentication'),
                    ('api_key', 'API Key'),
                    ('bearer', 'Bearer Token'),
                    ('oauth2', 'OAuth 2.0 (Authorization Code)'),
                    ('oauth2_client_credentials', 'OAuth 2.0 (Client Credentials)'),
                    ('custom', 'Custom Authentication'),
                ],
                default='none',
                max_length=30,
            ),
        ),
    ]
