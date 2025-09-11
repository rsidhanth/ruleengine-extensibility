from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'workflows', views.WorkflowViewSet)
router.register(r'workflow-executions', views.WorkflowExecutionViewSet)
router.register(r'workflow-rules', views.WorkflowRuleViewSet, basename='workflowrule')
router.register(r'rule-executions', views.RuleExecutionViewSet)
router.register(r'api-call-logs', views.ApiCallLogViewSet)

urlpatterns = [
    path('api/', include(router.urls)),
]