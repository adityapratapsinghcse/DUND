import secrets
from datetime import timedelta
from django.utils import timezone
from django.db.models import Count, Avg
from django.contrib.auth import get_user_model
from rest_framework import status, permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.pagination import PageNumberPagination

from .models import AuditLog, SystemSettings
from .serializers import AuditLogSerializer, SystemSettingsSerializer, AdminUserSerializer, AdminUserCreateSerializer
from accounts.permissions import IsAdminRole
from exercises.models import Exercise, ExerciseStatus
from exercises.serializers import ExerciseDetailSerializer, ExerciseListSerializer
from scenarios.models import Scenario
from comms.models import Decision

User = get_user_model()

class StandardResultsSetPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100

class AdminStatsView(APIView):
    permission_classes = [IsAdminRole]

    def get(self, request):
        now = timezone.now()
        start_of_today = now.replace(hour=0, minute=0, second=0, microsecond=0)

        # Users by role
        users_by_role_raw = User.objects.values('role').annotate(count=Count('id'))
        users_by_role = {item['role']: item['count'] for item in users_by_role_raw}
        for r in ['ADMIN', 'INSTRUCTOR', 'TRAINEE']:
            users_by_role.setdefault(r, 0)

        # Scenarios count
        total_scenarios = Scenario.objects.count()

        # Exercises by status
        ex_by_status_raw = Exercise.objects.values('status').annotate(count=Count('id'))
        exercises_by_status = {item['status']: item['count'] for item in ex_by_status_raw}
        for s in ['LOBBY', 'RUNNING', 'PAUSED', 'ENDED']:
            exercises_by_status.setdefault(s, 0)

        active_sessions_now = Exercise.objects.filter(status__in=[ExerciseStatus.RUNNING, ExerciseStatus.PAUSED]).count()
        decisions_today = Decision.objects.filter(created_at__gte=start_of_today).count()

        avg_intensity_data = Exercise.objects.aggregate(avg=Avg('intensity'))
        avg_intensity = round(avg_intensity_data['avg'] or 0.3, 2)

        # 14-day series
        series = []
        for i in range(13, -1, -1):
            day_start = (now - timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0)
            day_end = day_start + timedelta(days=1)
            cnt = Exercise.objects.filter(created_at__gte=day_start, created_at__lt=day_end).count()
            series.append({
                'date': day_start.strftime('%Y-%m-%d'),
                'count': cnt
            })

        return Response({
            'users_by_role': users_by_role,
            'total_users': User.objects.count(),
            'total_scenarios': total_scenarios,
            'exercises_by_status': exercises_by_status,
            'active_sessions_now': active_sessions_now,
            'decisions_today': decisions_today,
            'avg_intensity': avg_intensity,
            'exercises_per_day_14d': series,
        })

class AdminUserViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminRole]
    pagination_class = StandardResultsSetPagination
    queryset = User.objects.all().order_by('-date_joined')

    def get_serializer_class(self):
        if self.action == 'create':
            return AdminUserCreateSerializer
        return AdminUserSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        role = self.request.query_params.get('role')
        if role:
            qs = qs.filter(role=role)
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            qs = qs.filter(is_active=is_active.lower() == 'true')
        search = self.request.query_params.get('search')
        if search:
            from django.db.models import Q
            qs = qs.filter(
                Q(username__icontains=search) |
                Q(email__icontains=search) |
                Q(rank__icontains=search) |
                Q(unit__icontains=search)
            )
        return qs

    def perform_create(self, serializer):
        user = serializer.save()
        AuditLog.objects.create(
            actor=self.request.user,
            action='USER_CREATE',
            target_type='USER',
            target_id=str(user.id),
            meta={'username': user.username, 'role': user.role}
        )

    def perform_update(self, serializer):
        user = serializer.save()
        AuditLog.objects.create(
            actor=self.request.user,
            action='USER_UPDATE',
            target_type='USER',
            target_id=str(user.id),
            meta={'username': user.username, 'role': user.role, 'is_active': user.is_active}
        )

    @action(detail=True, methods=['post'], url_path='reset-password')
    def reset_password(self, request, pk=None):
        user = self.get_object()
        temp_pass = secrets.token_urlsafe(10)
        user.set_password(temp_pass)
        user.save(update_fields=['password'])

        AuditLog.objects.create(
            actor=request.user,
            action='RESET_PASSWORD',
            target_type='USER',
            target_id=str(user.id),
            meta={'username': user.username}
        )
        return Response({'temporary_password': temp_pass})

    @action(detail=True, methods=['post'], url_path='toggle-active')
    def toggle_active(self, request, pk=None):
        user = self.get_object()
        user.is_active = not user.is_active
        user.save(update_fields=['is_active'])

        AuditLog.objects.create(
            actor=request.user,
            action='USER_DEACTIVATE' if not user.is_active else 'USER_ACTIVATE',
            target_type='USER',
            target_id=str(user.id),
            meta={'username': user.username, 'is_active': user.is_active}
        )
        return Response({'is_active': user.is_active})

class AdminExerciseViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAdminRole]
    pagination_class = StandardResultsSetPagination
    queryset = Exercise.objects.select_related('scenario', 'instructor').prefetch_related('participants').all().order_by('-created_at')
    serializer_class = ExerciseListSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        status_param = self.request.query_params.get('status')
        if status_param:
            qs = qs.filter(status=status_param)
        instructor_id = self.request.query_params.get('instructor')
        if instructor_id:
            qs = qs.filter(instructor_id=instructor_id)
        return qs

    @action(detail=True, methods=['post'], url_path='force-end')
    def force_end(self, request, pk=None):
        exercise = self.get_object()
        exercise.status = ExerciseStatus.ENDED
        exercise.started_at = None
        exercise.save(update_fields=['status', 'started_at'])

        AuditLog.objects.create(
            actor=request.user,
            action='EXERCISE_FORCE_END',
            target_type='EXERCISE',
            target_id=str(exercise.id),
            meta={'join_code': exercise.join_code}
        )
        return Response({'status': exercise.status, 'message': 'Exercise forced to end.'})

class AdminAuditLogView(APIView):
    permission_classes = [IsAdminRole]

    def get(self, request):
        qs = AuditLog.objects.select_related('actor').all().order_by('-created_at')
        action_filter = request.query_params.get('action')
        if action_filter:
            qs = qs.filter(action=action_filter)
        paginator = StandardResultsSetPagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = AuditLogSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

class AdminSystemSettingsView(APIView):
    permission_classes = [IsAdminRole]

    def get(self, request):
        settings_obj = SystemSettings.get_settings()
        return Response(SystemSettingsSerializer(settings_obj).data)

    def patch(self, request):
        settings_obj = SystemSettings.get_settings()
        serializer = SystemSettingsSerializer(settings_obj, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        AuditLog.objects.create(
            actor=request.user,
            action='SETTINGS_UPDATE',
            target_type='SYSTEM_SETTINGS',
            target_id=str(settings_obj.id),
            meta=request.data
        )
        return Response(serializer.data)
