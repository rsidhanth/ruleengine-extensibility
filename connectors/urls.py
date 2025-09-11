from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'credentials', views.CredentialViewSet)
router.register(r'connectors', views.ConnectorViewSet)
router.register(r'actions', views.ConnectorActionViewSet, basename='connectoraction')

urlpatterns = [
    path('api/', include(router.urls)),
    # Async progress tracking endpoints  
    path('api/async-progress/<str:execution_id>/', views.get_async_action_progress, name='async_action_progress'),
    path('api/workflow/<int:workflow_execution_id>/async-progress/', views.get_workflow_async_progress, name='workflow_async_progress'),
    path('api/progress-step/<int:step_id>/details/', views.get_progress_step_details, name='progress_step_details'),
    # Webhook endpoints
    path('api/webhooks/async/<str:execution_id>/', views.dynamic_webhook_handler, name='dynamic_webhook'),
    path('api/webhooks/async/static/', views.static_webhook_handler, name='static_webhook'),
]