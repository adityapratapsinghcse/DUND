from rest_framework import viewsets, permissions
from .models import Scenario
from .serializers import ScenarioSerializer, ScenarioListSerializer
from accounts.permissions import IsInstructorOrAdmin

class ScenarioViewSet(viewsets.ModelViewSet):
    queryset = Scenario.objects.prefetch_related('events').select_related('created_by').all().order_by('-created_at')

    def get_serializer_class(self):
        if self.action == 'list':
            return ScenarioListSerializer
        return ScenarioSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.IsAuthenticated()]
        return [IsInstructorOrAdmin()]

    def perform_create(self, serializer):
        scenario = serializer.save(created_by=self.request.user)
        try:
            from adminpanel.models import AuditLog
            AuditLog.objects.create(
                actor=self.request.user,
                action='SCENARIO_CREATE',
                target_type='SCENARIO',
                target_id=str(scenario.id),
                meta={'title': scenario.title}
            )
        except Exception:
            pass

    def perform_update(self, serializer):
        scenario = serializer.save()
        try:
            from adminpanel.models import AuditLog
            AuditLog.objects.create(
                actor=self.request.user,
                action='SCENARIO_UPDATE',
                target_type='SCENARIO',
                target_id=str(scenario.id),
                meta={'title': scenario.title}
            )
        except Exception:
            pass

    def perform_destroy(self, instance):
        scenario_id = str(instance.id)
        title = instance.title
        instance.delete()
        try:
            from adminpanel.models import AuditLog
            AuditLog.objects.create(
                actor=self.request.user,
                action='SCENARIO_DELETE',
                target_type='SCENARIO',
                target_id=scenario_id,
                meta={'title': title}
            )
        except Exception:
            pass
