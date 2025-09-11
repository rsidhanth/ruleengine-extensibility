#!/bin/bash

echo "Setting up Rule Engine Extensibility Framework..."

# Install Python dependencies
pip install -r requirements.txt

# Run Django migrations
python manage.py makemigrations
python manage.py migrate

# Create superuser (optional)
echo "Creating Django superuser..."
echo "from django.contrib.auth import get_user_model; User = get_user_model(); User.objects.create_superuser('admin', 'admin@example.com', 'admin123') if not User.objects.filter(username='admin').exists() else None" | python manage.py shell

echo "Setup complete!"
echo "Run 'python manage.py runserver' to start the Django backend"