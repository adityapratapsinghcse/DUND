from rest_framework import serializers
from .models import Scenario, ScenarioEvent

class ScenarioEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = ScenarioEvent
        fields = ['id', 't_offset_sec', 'event_type', 'kind', 'source_role', 'payload']

class ScenarioSerializer(serializers.ModelSerializer):
    events = ScenarioEventSerializer(many=True, required=False)
    created_by_name = serializers.ReadOnlyField(source='created_by.username')

    class Meta:
        model = Scenario
        fields = [
            'id', 'title', 'description', 'domains', 'roles',
            'difficulty', 'center_lat', 'center_lon', 'default_intensity',
            'created_by', 'created_by_name', 'created_at', 'updated_at', 'events'
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']

    def create(self, validated_data):
        events_data = validated_data.pop('events', [])
        scenario = Scenario.objects.create(**validated_data)
        for ev_data in events_data:
            ScenarioEvent.objects.create(scenario=scenario, **ev_data)
        return scenario

    def update(self, instance, validated_data):
        events_data = validated_data.pop('events', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if events_data is not None:
            instance.events.all().delete()
            for ev_data in events_data:
                ScenarioEvent.objects.create(scenario=instance, **ev_data)
        return instance

class ScenarioListSerializer(serializers.ModelSerializer):
    events_count = serializers.IntegerField(source='events.count', read_only=True)
    created_by_name = serializers.ReadOnlyField(source='created_by.username')

    class Meta:
        model = Scenario
        fields = [
            'id', 'title', 'description', 'domains', 'roles',
            'difficulty', 'center_lat', 'center_lon', 'default_intensity',
            'created_by_name', 'created_at', 'events_count'
        ]
