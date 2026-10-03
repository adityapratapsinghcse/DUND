import json
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from django.utils import timezone
from .models import Exercise, Participant, ExerciseStatus
from comms.pipeline import compute_participant_link_quality, get_signal_bars

class ExerciseConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        user = self.scope.get('user')
        if not user or user.is_anonymous:
            await self.close(code=4001)
            return

        self.exercise_id = self.scope['url_route']['kwargs']['id']
        self.exercise = await self.get_exercise(self.exercise_id)
        if not self.exercise:
            await self.close(code=4004)
            return

        self.user = user
        self.is_instructor = (user.role in ['ADMIN', 'INSTRUCTOR'] or user.id == self.exercise.instructor_id)
        self.groups_joined = []

        if self.is_instructor:
            self.instructor_group = f"exercise_{self.exercise_id}_instructor"
            await self.channel_layer.group_add(self.instructor_group, self.channel_name)
            self.groups_joined.append(self.instructor_group)
        else:
            self.participant = await self.get_participant(self.exercise, self.user)
            if self.participant:
                self.trainee_group = f"participant_{self.participant.id}"
                await self.channel_layer.group_add(self.trainee_group, self.channel_name)
                self.groups_joined.append(self.trainee_group)

        # General exercise group
        self.common_group = f"exercise_{self.exercise_id}_common"
        await self.channel_layer.group_add(self.common_group, self.channel_name)
        self.groups_joined.append(self.common_group)

        await self.accept()

        # Send initial status
        if not self.is_instructor and hasattr(self, 'participant') and self.participant:
            bars, q = await self.get_initial_link_status(self.exercise, self.participant)
            await self.send_json({
                "type": "link_status",
                "bars": bars,
                "quality": q,
                "status": self.exercise.status,
            })
        else:
            await self.send_json({
                "type": "exercise_connected",
                "status": self.exercise.status,
                "is_instructor": self.is_instructor,
            })

    async def disconnect(self, close_code):
        for group in getattr(self, 'groups_joined', []):
            await self.channel_layer.group_discard(group, self.channel_name)

    async def receive_json(self, content):
        msg_type = content.get('type')
        if msg_type == 'ping':
            await self.send_json({'type': 'pong'})
        elif msg_type == 'position':
            lat = content.get('lat')
            lon = content.get('lon')
            if lat is not None and lon is not None and hasattr(self, 'participant') and self.participant:
                await self.update_participant_pos(self.participant.id, float(lat), float(lon))
                await self.send_json({'type': 'position_acknowledged'})

    # Handlers for group events
    async def report_push(self, event):
        await self.send_json({
            'type': 'report',
            'report': event['report'],
        })

    async def link_status(self, event):
        await self.send_json({
            'type': 'link_status',
            'bars': event['bars'],
            'quality': event.get('quality', 1.0),
            'status': event.get('status', 'RUNNING'),
        })

    async def instructor_truth_event(self, event):
        await self.send_json({
            'type': 'truth_event',
            'event': event['event'],
        })

    async def instructor_report_delivered(self, event):
        await self.send_json({
            'type': 'report_delivered',
            'report_id': event['report_id'],
            'participant_id': event['participant_id'],
            'participant_role': event['participant_role'],
            'origin': event['origin'],
            'confidence': event['confidence'],
            'is_corrupted': event['is_corrupted'],
            'delay_sec': event['delay_sec'],
        })

    async def instructor_decision(self, event):
        await self.send_json({
            'type': 'decision',
            'decision': event['decision'],
        })

    async def instructor_participant_joined(self, event):
        await self.send_json({
            'type': 'participant_joined',
            'participant': event['participant'],
        })

    # DB helpers
    @database_sync_to_async
    def get_exercise(self, exercise_id):
        return Exercise.objects.filter(id=exercise_id).first()

    @database_sync_to_async
    def get_participant(self, exercise, user):
        return Participant.objects.filter(exercise=exercise, user=user).first()

    @database_sync_to_async
    def update_participant_pos(self, participant_id, lat, lon):
        Participant.objects.filter(id=participant_id).update(
            lat=lat, lon=lon, last_seen=timezone.now()
        )

    @database_sync_to_async
    def get_initial_link_status(self, exercise, participant):
        q, link_up = compute_participant_link_quality(exercise, participant)
        bars = get_signal_bars(q, link_up)
        return bars, round(q, 3)
