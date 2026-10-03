from rest_framework import serializers
from .models import Exercise, Participant, CommLink, JammingZone
from scenarios.serializers import ScenarioListSerializer

class CommLinkSerializer(serializers.ModelSerializer):
    class Meta:
        model = CommLink
        fields = ['id', 'exercise', 'source_role', 'target_role', 'quality', 'is_up']

class JammingZoneSerializer(serializers.ModelSerializer):
    class Meta:
        model = JammingZone
        fields = ['id', 'exercise', 'lat', 'lon', 'radius_m', 'intensity', 'active', 'created_at']
        read_only_fields = ['id', 'created_at']

class ParticipantSerializer(serializers.ModelSerializer):
    username = serializers.ReadOnlyField(source='user.username')
    rank = serializers.ReadOnlyField(source='user.rank')
    unit = serializers.ReadOnlyField(source='user.unit')

    class Meta:
        model = Participant
        fields = ['id', 'user', 'username', 'rank', 'unit', 'role', 'lat', 'lon', 'joined_at', 'last_seen']
        read_only_fields = ['id', 'user', 'joined_at', 'last_seen']

class ExerciseListSerializer(serializers.ModelSerializer):
    scenario_title = serializers.ReadOnlyField(source='scenario.title')
    instructor_name = serializers.ReadOnlyField(source='instructor.username')
    participants_count = serializers.IntegerField(source='participants.count', read_only=True)
    elapsed_sec = serializers.SerializerMethodField()

    class Meta:
        model = Exercise
        fields = [
            'id', 'join_code', 'scenario', 'scenario_title', 'instructor',
            'instructor_name', 'status', 'intensity', 'participants_count',
            'elapsed_sec', 'created_at'
        ]

    def get_elapsed_sec(self, obj):
        return obj.get_elapsed()

class ExerciseDetailSerializer(serializers.ModelSerializer):
    scenario = ScenarioListSerializer(read_only=True)
    instructor_name = serializers.ReadOnlyField(source='instructor.username')
    participants = ParticipantSerializer(many=True, read_only=True)
    links = CommLinkSerializer(many=True, read_only=True)
    jamming_zones = JammingZoneSerializer(many=True, read_only=True)
    elapsed_sec = serializers.SerializerMethodField()

    class Meta:
        model = Exercise
        fields = [
            'id', 'join_code', 'scenario', 'instructor', 'instructor_name',
            'status', 'intensity', 'seed', 'started_at', 'elapsed_sec',
            'participants', 'links', 'jamming_zones', 'created_at'
        ]

    def get_elapsed_sec(self, obj):
        return obj.get_elapsed()

class ExerciseCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Exercise
        fields = ['id', 'join_code', 'scenario', 'intensity', 'status', 'created_at']
        read_only_fields = ['id', 'join_code', 'status', 'created_at']

    def create(self, validated_data):
        import random
        user = self.context['request'].user
        scenario = validated_data['scenario']
        intensity = validated_data.get('intensity', scenario.default_intensity)
        code = Exercise.generate_join_code()
        seed = random.randint(100000, 999999)

        exercise = Exercise.objects.create(
            scenario=scenario,
            instructor=user,
            join_code=code,
            intensity=intensity,
            seed=seed,
        )

        # Create all permutations of ["HQ"] + scenario.roles
        roles = ["HQ"] + [r for r in scenario.roles if r != "HQ"]
        for src in roles:
            for tgt in roles:
                if src != tgt:
                    CommLink.objects.create(
                        exercise=exercise,
                        source_role=src,
                        target_role=tgt,
                        quality=1.0,
                        is_up=True
                    )

        return exercise

class JoinExerciseSerializer(serializers.Serializer):
    join_code = serializers.CharField(max_length=8)
    role = serializers.CharField(max_length=50)

class ExerciseIntensitySerializer(serializers.Serializer):
    intensity = serializers.FloatField(min_value=0.0, max_value=1.0)

class ExerciseInjectSerializer(serializers.Serializer):
    type = serializers.ChoiceField(choices=['TRUTH_EVENT', 'FAKE_REPORT', 'JAM_LINK', 'RESTORE_LINK', 'JAM_ZONE'])
    source_role = serializers.CharField(max_length=50, default='HQ')
    target_role = serializers.CharField(max_length=50, required=False, allow_blank=True)
    title = serializers.CharField(max_length=200, required=False, allow_blank=True)
    detail = serializers.CharField(required=False, allow_blank=True)
    lat = serializers.FloatField(required=False)
    lon = serializers.FloatField(required=False)
    radius_m = serializers.FloatField(required=False, default=5000.0)
    intensity = serializers.FloatField(required=False, default=0.8)
    kind = serializers.CharField(max_length=100, default='INSTRUCTOR_INJECT')
    visible_to = serializers.ListField(child=serializers.CharField(), required=False)
    expected_actions = serializers.ListField(child=serializers.CharField(), required=False)
