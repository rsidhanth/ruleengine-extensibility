from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import Connector, Credential, ConnectorAction, Event, Sequence, ActivityLog


def get_client_ip(request):
    """Extract client IP from request"""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


def create_activity_log(entity_type, action_type, entity_id, entity_name, user=None, user_email='', message='', changes=None, request=None):
    """Helper function to create activity log entries"""
    ip_address = None
    user_agent = ''

    if request:
        ip_address = get_client_ip(request)
        user_agent = request.META.get('HTTP_USER_AGENT', '')[:500]

    if user and not user_email:
        user_email = user.email

    ActivityLog.objects.create(
        user=user,
        user_email=user_email,
        entity_type=entity_type,
        action_type=action_type,
        entity_id=entity_id,
        entity_name=entity_name,
        message=message,
        changes=changes or {},
        ip_address=ip_address,
        user_agent=user_agent,
    )


# Connector Signals
@receiver(post_save, sender=Connector)
def log_connector_save(sender, instance, created, **kwargs):
    """Log connector create/update"""
    action_type = 'created' if created else 'updated'
    message = f"Connector '{instance.name}' was {action_type}"

    if created:
        message += f" with base URL {instance.base_url}"

    create_activity_log(
        entity_type='connector',
        action_type=action_type,
        entity_id=instance.id,
        entity_name=instance.name,
        message=message,
        user_email='System'  # TODO: Get from request context when available
    )


@receiver(post_delete, sender=Connector)
def log_connector_delete(sender, instance, **kwargs):
    """Log connector deletion"""
    create_activity_log(
        entity_type='connector',
        action_type='deleted',
        entity_id=instance.id,
        entity_name=instance.name,
        message=f"Connector '{instance.name}' was deleted",
        user_email='System'
    )


# Credential Signals
@receiver(post_save, sender=Credential)
def log_credential_save(sender, instance, created, **kwargs):
    """Log credential create/update"""
    action_type = 'created' if created else 'updated'
    message = f"Credential '{instance.name}' was {action_type} with auth type '{instance.auth_type}'"

    create_activity_log(
        entity_type='credential',
        action_type=action_type,
        entity_id=instance.id,
        entity_name=instance.name,
        message=message,
        user_email='System'
    )


@receiver(post_delete, sender=Credential)
def log_credential_delete(sender, instance, **kwargs):
    """Log credential deletion"""
    create_activity_log(
        entity_type='credential',
        action_type='deleted',
        entity_id=instance.id,
        entity_name=instance.name,
        message=f"Credential '{instance.name}' was deleted",
        user_email='System'
    )


# ConnectorAction Signals
@receiver(post_save, sender=ConnectorAction)
def log_action_save(sender, instance, created, **kwargs):
    """Log action create/update"""
    action_type = 'created' if created else 'updated'
    message = f"Action '{instance.name}' was {action_type} for connector '{instance.connector.name}'"

    if created:
        message += f" with HTTP method {instance.http_method}"

    create_activity_log(
        entity_type='action',
        action_type=action_type,
        entity_id=instance.id,
        entity_name=f"{instance.connector.name} - {instance.name}",
        message=message,
        user_email='System'
    )


@receiver(post_delete, sender=ConnectorAction)
def log_action_delete(sender, instance, **kwargs):
    """Log action deletion"""
    create_activity_log(
        entity_type='action',
        action_type='deleted',
        entity_id=instance.id,
        entity_name=f"{instance.connector.name} - {instance.name}",
        message=f"Action '{instance.name}' was deleted from connector '{instance.connector.name}'",
        user_email='System'
    )


# Event Signals
@receiver(post_save, sender=Event)
def log_event_save(sender, instance, created, **kwargs):
    """Log event create/update"""
    action_type = 'created' if created else 'updated'
    message = f"Event '{instance.name}' (ID: {instance.event_id}) was {action_type}"

    if created:
        message += f" as {instance.event_type} event"

    # Check if status changed for update
    if not created and kwargs.get('update_fields'):
        if 'status' in kwargs['update_fields']:
            status_action = 'activated' if instance.status == 'active' else 'deactivated'
            create_activity_log(
                entity_type='event',
                action_type=status_action,
                entity_id=instance.id,
                entity_name=instance.name,
                message=f"Event '{instance.name}' was {status_action}",
                user=instance.created_by,
                user_email='System'
            )
            return

    create_activity_log(
        entity_type='event',
        action_type=action_type,
        entity_id=instance.id,
        entity_name=instance.name,
        message=message,
        user=instance.created_by,
        user_email='System'
    )


@receiver(post_delete, sender=Event)
def log_event_delete(sender, instance, **kwargs):
    """Log event deletion"""
    create_activity_log(
        entity_type='event',
        action_type='deleted',
        entity_id=instance.id,
        entity_name=instance.name,
        message=f"Event '{instance.name}' (ID: {instance.event_id}) was deleted",
        user=instance.created_by,
        user_email='System'
    )


# Sequence Signals
@receiver(post_save, sender=Sequence)
def log_sequence_save(sender, instance, created, **kwargs):
    """Log sequence create/update"""
    action_type = 'created' if created else 'updated'
    message = f"Sequence '{instance.name}' (ID: {instance.sequence_id}) was {action_type}"

    if created:
        message += f" as {instance.sequence_type} sequence with version {instance.version}"

    # Check if status changed for update
    if not created and kwargs.get('update_fields'):
        if 'status' in kwargs['update_fields']:
            status_action = 'activated' if instance.status == 'active' else 'deactivated'
            create_activity_log(
                entity_type='sequence',
                action_type=status_action,
                entity_id=instance.id,
                entity_name=instance.name,
                message=f"Sequence '{instance.name}' was {status_action}",
                user=instance.created_by,
                user_email='System'
            )
            return

    create_activity_log(
        entity_type='sequence',
        action_type=action_type,
        entity_id=instance.id,
        entity_name=instance.name,
        message=message,
        user=instance.created_by,
        user_email='System'
    )


@receiver(post_delete, sender=Sequence)
def log_sequence_delete(sender, instance, **kwargs):
    """Log sequence deletion"""
    create_activity_log(
        entity_type='sequence',
        action_type='deleted',
        entity_id=instance.id,
        entity_name=instance.name,
        message=f"Sequence '{instance.name}' (ID: {instance.sequence_id}) was deleted",
        user=instance.created_by,
        user_email='System'
    )
