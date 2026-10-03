from django.utils import timezone
from rest_framework import status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from .models import Exercise, Participant, CommLink, JammingZone, ExerciseStatus
from .serializers import (
    ExerciseListSerializer, ExerciseDetailSerializer, ExerciseCreateSerializer,
    JoinExerciseSerializer, ExerciseIntensitySerializer, ExerciseInjectSerializer,
    CommLinkSerializer, JammingZoneSerializer, ParticipantSerializer
)
from .scorecard import calculate_participant_scorecard, build_exercise_aar
from .tasks import tick_single_exercise
from comms.models import Report, Decision, TruthEvent
from comms.serializers import (
    TraineeReportSerializer, InstructorReportSerializer, TruthEventSerializer,
    DecisionSerializer, DecisionCreateSerializer
)
from comms.pipeline import (
    publish_truth_event, dispatch_due, broadcast_link_status,
    compute_participant_link_quality, get_signal_bars
)
from accounts.permissions import IsInstructorOrAdmin

class ExerciseViewSet(ModelViewSet):
    queryset = Exercise.objects.select_related('scenario', 'instructor').prefetch_related('participants', 'links', 'jamming_zones').all().order_by('-created_at')

    def get_serializer_class(self):
        if self.action == 'create':
            return ExerciseCreateSerializer
        elif self.action == 'retrieve':
            return ExerciseDetailSerializer
        return ExerciseListSerializer

    def get_permissions(self):
        if self.action in ['create', 'start', 'pause', 'resume', 'end', 'set_intensity', 'links', 'jamming', 'inject', 'monitor']:
            return [IsInstructorOrAdmin()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        exercise = serializer.save()
        try:
            from adminpanel.models import AuditLog
            AuditLog.objects.create(
                actor=self.request.user,
                action='EXERCISE_CREATE',
                target_type='EXERCISE',
                target_id=str(exercise.id),
                meta={'join_code': exercise.join_code, 'scenario': exercise.scenario.title}
            )
        except Exception:
            pass

    @action(detail=False, methods=['post'], url_path='join', permission_classes=[permissions.IsAuthenticated])
    def join(self, request):
        serializer = JoinExerciseSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        code = serializer.validated_data['join_code'].strip().upper()
        role = serializer.validated_data['role'].strip().upper()

        exercise = Exercise.objects.filter(join_code=code).first()
        if not exercise:
            return Response({'error': 'Invalid join code.'}, status=status.HTTP_404_NOT_FOUND)

        if exercise.status == ExerciseStatus.ENDED:
            return Response({'error': 'This exercise has already concluded.'}, status=status.HTTP_400_BAD_REQUEST)

        # Check maximum participants limit from system settings
        from adminpanel.models import SystemSettings
        sys_settings = SystemSettings.get_settings()
        if exercise.participants.count() >= sys_settings.max_participants_per_exercise:
            return Response({'error': f'Exercise room is full (max {sys_settings.max_participants_per_exercise}).'}, status=status.HTTP_400_BAD_REQUEST)

        participant, created = Participant.objects.get_or_create(
            exercise=exercise,
            user=request.user,
            defaults={'role': role}
        )
        if not created and participant.role != role:
            participant.role = role
            participant.save(update_fields=['role'])

        # Notify instructor room
        channel_layer = get_channel_layer()
        if channel_layer:
            async_to_sync(channel_layer.group_send)(
                f"exercise_{exercise.id}_instructor",
                {
                    "type": "instructor_participant_joined",
                    "participant": ParticipantSerializer(participant).data
                }
            )

        return Response({
            'message': 'Joined exercise successfully.',
            'participant_id': participant.id,
            'exercise_id': exercise.id,
            'role': participant.role,
            'status': exercise.status,
            'scenario_title': exercise.scenario.title,
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='start')
    def start(self, request, pk=None):
        exercise = self.get_object()
        if exercise.status == ExerciseStatus.LOBBY or exercise.status == ExerciseStatus.PAUSED:
            exercise.status = ExerciseStatus.RUNNING
            exercise.started_at = timezone.now()
            exercise.save(update_fields=['status', 'started_at'])
            tick_single_exercise(exercise)
            broadcast_link_status(exercise)

            try:
                from adminpanel.models import AuditLog
                AuditLog.objects.create(
                    actor=request.user,
                    action='EXERCISE_START',
                    target_type='EXERCISE',
                    target_id=str(exercise.id),
                    meta={'status': 'RUNNING'}
                )
            except Exception:
                pass

        return Response({'status': exercise.status, 'elapsed_sec': exercise.get_elapsed()})

    @action(detail=True, methods=['post'], url_path='pause')
    def pause(self, request, pk=None):
        exercise = self.get_object()
        if exercise.status == ExerciseStatus.RUNNING:
            delta = (timezone.now() - exercise.started_at).total_seconds() if exercise.started_at else 0
            exercise.elapsed_before += delta
            exercise.started_at = None
            exercise.status = ExerciseStatus.PAUSED
            exercise.save(update_fields=['status', 'started_at', 'elapsed_before'])
            broadcast_link_status(exercise)
        return Response({'status': exercise.status, 'elapsed_sec': exercise.get_elapsed()})

    @action(detail=True, methods=['post'], url_path='resume')
    def resume(self, request, pk=None):
        exercise = self.get_object()
        if exercise.status == ExerciseStatus.PAUSED:
            exercise.status = ExerciseStatus.RUNNING
            exercise.started_at = timezone.now()
            exercise.save(update_fields=['status', 'started_at'])
            tick_single_exercise(exercise)
            broadcast_link_status(exercise)
        return Response({'status': exercise.status, 'elapsed_sec': exercise.get_elapsed()})

    @action(detail=True, methods=['post'], url_path='end')
    def end(self, request, pk=None):
        exercise = self.get_object()
        if exercise.status != ExerciseStatus.ENDED:
            if exercise.status == ExerciseStatus.RUNNING and exercise.started_at:
                delta = (timezone.now() - exercise.started_at).total_seconds()
                exercise.elapsed_before += delta
            exercise.status = ExerciseStatus.ENDED
            exercise.started_at = None
            exercise.save(update_fields=['status', 'started_at', 'elapsed_before'])
            broadcast_link_status(exercise)

            try:
                from adminpanel.models import AuditLog
                AuditLog.objects.create(
                    actor=request.user,
                    action='EXERCISE_END',
                    target_type='EXERCISE',
                    target_id=str(exercise.id),
                    meta={'elapsed_sec': exercise.elapsed_before}
                )
            except Exception:
                pass

        return Response({'status': exercise.status, 'elapsed_sec': exercise.get_elapsed()})

    @action(detail=True, methods=['post'], url_path='intensity')
    def set_intensity(self, request, pk=None):
        exercise = self.get_object()
        serializer = ExerciseIntensitySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        exercise.intensity = serializer.validated_data['intensity']
        exercise.save(update_fields=['intensity'])
        broadcast_link_status(exercise)
        return Response({'intensity': exercise.intensity})

    @action(detail=True, methods=['get', 'post'], url_path='links')
    def manage_links(self, request, pk=None):
        exercise = self.get_object()
        if request.method == 'GET':
            links = exercise.links.all()
            return Response(CommLinkSerializer(links, many=True).data)

        # POST: update or create link
        src = request.data.get('source_role')
        tgt = request.data.get('target_role')
        quality = request.data.get('quality', 1.0)
        is_up = request.data.get('is_up', True)

        link, _ = CommLink.objects.update_or_create(
            exercise=exercise,
            source_role=src,
            target_role=tgt,
            defaults={'quality': float(quality), 'is_up': bool(is_up)}
        )
        broadcast_link_status(exercise)
        return Response(CommLinkSerializer(link).data)

    @action(detail=True, methods=['get', 'post'], url_path='jamming')
    def manage_jamming(self, request, pk=None):
        exercise = self.get_object()
        if request.method == 'GET':
            zones = exercise.jamming_zones.all()
            return Response(JammingZoneSerializer(zones, many=True).data)

        serializer = JammingZoneSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        zone = serializer.save(exercise=exercise)
        broadcast_link_status(exercise)
        return Response(JammingZoneSerializer(zone).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='inject')
    def inject(self, request, pk=None):
        exercise = self.get_object()
        serializer = ExerciseInjectSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        inj_type = data['type']

        if inj_type == 'TRUTH_EVENT':
            payload = {
                'title': data.get('title', 'Tactical Inject'),
                'detail': data.get('detail', ''),
                'lat': data.get('lat', exercise.scenario.center_lat),
                'lon': data.get('lon', exercise.scenario.center_lon),
                'visible_to': data.get('visible_to', []),
                'expected_actions': data.get('expected_actions', []),
            }
            truth_event = publish_truth_event(
                exercise=exercise,
                payload=payload,
                source_role=data.get('source_role', 'HQ'),
                kind=data.get('kind', 'INJECT')
            )
            return Response({'status': 'Truth event injected', 'event_id': truth_event.id})

        elif inj_type == 'FAKE_REPORT':
            target_role = data.get('target_role')
            p = exercise.participants.filter(role=target_role).first()
            if not p:
                return Response({'error': f'No participant found with role {target_role}'}, status=status.HTTP_404_NOT_FOUND)

            rep = Report.objects.create(
                exercise=exercise,
                participant=p,
                status='DELIVERED',
                origin='SPOOFED',
                confidence='PROBABLE',
                payload={
                    'title': data.get('title', 'SPOOFED COMM REPORT'),
                    'detail': data.get('detail', 'Intercepted unverified transmission.'),
                    'lat': data.get('lat', exercise.scenario.center_lat),
                    'lon': data.get('lon', exercise.scenario.center_lon),
                },
                is_corrupted=True,
                delay_sec=0.0,
                deliver_at=timezone.now(),
                delivered_at=timezone.now()
            )
            dispatch_due(exercise=exercise)
            return Response({'status': 'Spoofed report injected', 'report_id': rep.id})

        elif inj_type == 'JAM_LINK':
            src = data.get('source_role', 'HQ')
            tgt = data.get('target_role', 'ALL')
            links = exercise.links.all()
            if src != 'ALL':
                links = links.filter(source_role=src)
            if tgt != 'ALL':
                links = links.filter(target_role=tgt)
            links.update(is_up=False)
            broadcast_link_status(exercise)
            return Response({'status': 'Link(s) jammed'})

        elif inj_type == 'RESTORE_LINK':
            src = data.get('source_role', 'HQ')
            tgt = data.get('target_role', 'ALL')
            links = exercise.links.all()
            if src != 'ALL':
                links = links.filter(source_role=src)
            if tgt != 'ALL':
                links = links.filter(target_role=tgt)
            links.update(is_up=True)
            broadcast_link_status(exercise)
            return Response({'status': 'Link(s) restored'})

        elif inj_type == 'JAM_ZONE':
            zone = JammingZone.objects.create(
                exercise=exercise,
                lat=data.get('lat', exercise.scenario.center_lat),
                lon=data.get('lon', exercise.scenario.center_lon),
                radius_m=data.get('radius_m', 5000.0),
                intensity=data.get('intensity', 0.8),
                active=True
            )
            broadcast_link_status(exercise)
            return Response({'status': 'Jamming zone created', 'zone_id': zone.id})

        return Response({'error': 'Invalid inject type.'}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['get'], url_path='monitor')
    def monitor(self, request, pk=None):
        exercise = self.get_object()
        # Tick exercise to sync events and reports on monitor poll
        tick_single_exercise(exercise)

        participants = exercise.participants.select_related('user').all()
        truth_events = TruthEvent.objects.filter(exercise=exercise).order_by('t_sec')
        reports = Report.objects.filter(exercise=exercise).select_related('participant').order_by('-delivered_at', '-id')[:50]
        decisions = Decision.objects.filter(exercise=exercise).select_related('participant', 'participant__user').order_by('-created_at')[:30]

        # Calculate live signal bars for each participant
        participants_data = []
        for p in participants:
            q, is_up = compute_participant_link_quality(exercise, p)
            p_dict = ParticipantSerializer(p).data
            p_dict['signal_bars'] = get_signal_bars(q, is_up)
            p_dict['link_quality'] = round(q, 3)
            participants_data.append(p_dict)

        return Response({
            'exercise_id': exercise.id,
            'status': exercise.status,
            'elapsed_sec': exercise.get_elapsed(),
            'intensity': exercise.intensity,
            'participants': participants_data,
            'links': CommLinkSerializer(exercise.links.all(), many=True).data,
            'jamming_zones': JammingZoneSerializer(exercise.jamming_zones.all(), many=True).data,
            'truth_events': TruthEventSerializer(truth_events, many=True).data,
            'reports': InstructorReportSerializer(reports, many=True).data,
            'decisions': DecisionSerializer(decisions, many=True).data,
        })

    @action(detail=True, methods=['get'], url_path='feed', permission_classes=[permissions.IsAuthenticated])
    def trainee_feed(self, request, pk=None):
        exercise = self.get_object()
        # Tick to flush simulation events
        tick_single_exercise(exercise)

        participant = exercise.participants.filter(user=request.user).first()
        if not participant:
            return Response({'error': 'You are not enrolled in this exercise.'}, status=status.HTTP_403_FORBIDDEN)

        q, is_up = compute_participant_link_quality(exercise, participant)
        bars = get_signal_bars(q, is_up)

        since_id = request.query_params.get('since')
        reports_qs = Report.objects.filter(
            participant=participant,
            status='DELIVERED'
        ).order_by('id')

        if since_id and since_id.isdigit():
            reports_qs = reports_qs.filter(id__gt=int(since_id))

        reports_data = TraineeReportSerializer(reports_qs, many=True).data

        return Response({
            'status': exercise.status,
            'elapsed_sec': exercise.get_elapsed(),
            'bars': bars,
            'quality': round(q, 3),
            'reports': reports_data,
        })

    @action(detail=True, methods=['post'], url_path='position', permission_classes=[permissions.IsAuthenticated])
    def set_position(self, request, pk=None):
        exercise = self.get_object()
        participant = exercise.participants.filter(user=request.user).first()
        if not participant:
            return Response({'error': 'Not enrolled in exercise.'}, status=status.HTTP_403_FORBIDDEN)

        lat = request.data.get('lat')
        lon = request.data.get('lon')
        if lat is None or lon is None:
            return Response({'error': 'lat and lon are required.'}, status=status.HTTP_400_BAD_REQUEST)

        participant.lat = float(lat)
        participant.lon = float(lon)
        participant.save(update_fields=['lat', 'lon', 'last_seen'])

        broadcast_link_status(exercise)
        return Response({'status': 'Position updated', 'lat': participant.lat, 'lon': participant.lon})

    @action(detail=True, methods=['get', 'post'], url_path='decisions', permission_classes=[permissions.IsAuthenticated])
    def decisions(self, request, pk=None):
        exercise = self.get_object()
        participant = exercise.participants.filter(user=request.user).first()
        if not participant and not request.user.role in ['ADMIN', 'INSTRUCTOR']:
            return Response({'error': 'Not enrolled in exercise.'}, status=status.HTTP_403_FORBIDDEN)

        if request.method == 'GET':
            if request.user.role in ['ADMIN', 'INSTRUCTOR']:
                decisions_qs = Decision.objects.filter(exercise=exercise)
            else:
                decisions_qs = Decision.objects.filter(exercise=exercise, participant=participant)
            return Response(DecisionSerializer(decisions_qs, many=True).data)

        # POST decision
        serializer = DecisionCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        truth_event = serializer.validated_data.get('truth_event')
        action_type = serializer.validated_data['action_type']
        self_confidence = serializer.validated_data['self_confidence']
        details = serializer.validated_data.get('details', {})

        latency = 0.0
        correct = None
        if truth_event:
            latency = max(0.0, exercise.get_elapsed() - truth_event.t_sec)
            expected = truth_event.payload.get('expected_actions', [])
            if expected:
                correct = (action_type in expected)
            else:
                correct = True

        decision = Decision.objects.create(
            exercise=exercise,
            participant=participant,
            truth_event=truth_event,
            action_type=action_type,
            self_confidence=self_confidence,
            latency_sec=round(latency, 2),
            correct=correct,
            details=details,
        )

        # Notify instructor
        channel_layer = get_channel_layer()
        if channel_layer:
            async_to_sync(channel_layer.group_send)(
                f"exercise_{exercise.id}_instructor",
                {
                    "type": "instructor_decision",
                    "decision": DecisionSerializer(decision).data
                }
            )

        return Response(DecisionSerializer(decision).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'], url_path='aar')
    def aar(self, request, pk=None):
        exercise = self.get_object()
        return Response(build_exercise_aar(exercise))

    @action(detail=True, methods=['get'], url_path='scorecard')
    def scorecard(self, request, pk=None):
        exercise = self.get_object()
        participant = exercise.participants.filter(user=request.user).first()
        if participant and request.user.role == 'TRAINEE':
            return Response(calculate_participant_scorecard(participant))
        scorecards = [calculate_participant_scorecard(p) for p in exercise.participants.all()]
        return Response({'scorecards': scorecards})
