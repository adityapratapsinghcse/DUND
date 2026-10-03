from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import AuditLog, SystemSettings

User = get_user_model()

class AuditLogSerializer(serializers.ModelSerializer):
    actor_name = serializers.ReadOnlyField(source='actor.username')

    class Meta:
        model = AuditLog
        fields = ['id', 'actor', 'actor_name', 'action', 'target_type', 'target_id', 'meta', 'created_at']

class SystemSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = SystemSettings
        fields = ['max_delay_sec', 'default_intensity', 'allow_self_registration', 'max_participants_per_exercise', 'updated_at']
        read_only_fields = ['updated_at']

class AdminUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'role', 'rank', 'unit', 'is_active', 'date_joined']

class AdminUserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password', 'role', 'rank', 'unit', 'is_active']

    def create(self, validated_data):
        import secrets
        password = validated_data.pop('password', None) or secrets.token_urlsafe(8)
        user = User.objects.create_user(password=password, **validated_data)
        user._raw_password = password
        return user
