from rest_framework import serializers
from .models import TruthEvent, Report, Decision

class TraineeReportSerializer(serializers.ModelSerializer):
    """
    STRICT SECURITY: Trainee serializer MUST NEVER expose origin,
    is_corrupted, delay_sec, or expected_actions.
    """
    participant_role = serializers.ReadOnlyField(source='participant.role')

    class Meta:
        model = Report
        fields = [
            'id', 'exercise', 'participant', 'participant_role',
            'status', 'confidence', 'payload', 'delivered_at', 'created_at'
        ]
        read_only_fields = fields

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Ensure nested payload never exposes expected_actions or visible_to
        if isinstance(data.get('payload'), dict):
            clean_payload = dict(data['payload'])
            clean_payload.pop('expected_actions', None)
            clean_payload.pop('visible_to', None)
            data['payload'] = clean_payload
        return data

class InstructorReportSerializer(serializers.ModelSerializer):
    """Full ground-truth report view for instructors, admins, and AAR."""
    participant_role = serializers.ReadOnlyField(source='participant.role')

    class Meta:
        model = Report
        fields = [
            'id', 'exercise', 'truth_event', 'participant', 'participant_role',
            'status', 'origin', 'confidence', 'payload', 'is_corrupted',
            'delay_sec', 'deliver_at', 'delivered_at', 'created_at'
        ]

class TruthEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = TruthEvent
        fields = [
            'id', 'exercise', 'scenario_event', 't_sec',
            'kind', 'source_role', 'payload', 'created_at'
        ]

class DecisionSerializer(serializers.ModelSerializer):
    participant_role = serializers.ReadOnlyField(source='participant.role')
    user_name = serializers.ReadOnlyField(source='participant.user.username')

    class Meta:
        model = Decision
        fields = [
            'id', 'exercise', 'participant', 'participant_role', 'user_name',
            'truth_event', 'action_type', 'self_confidence', 'latency_sec',
            'correct', 'details', 'created_at'
        ]
        read_only_fields = ['id', 'exercise', 'participant', 'latency_sec', 'correct', 'created_at']

class DecisionCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Decision
        fields = ['truth_event', 'action_type', 'self_confidence', 'details']
