from rest_framework import serializers
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'role', 'rank', 'unit', 'is_active', 'date_joined']
        read_only_fields = ['id', 'role', 'date_joined']

class UserUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['email', 'rank', 'unit']

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password', 'rank', 'unit']

    def validate(self, attrs):
        # Check system settings for allow_self_registration
        from adminpanel.models import SystemSettings
        settings = SystemSettings.get_settings()
        if not settings.allow_self_registration:
            raise serializers.ValidationError("Self-registration is currently disabled by system administrator.")
        return attrs

    def create(self, validated_data):
        password = validated_data.pop('password')
        # Self-registration always creates TRAINEE role
        user = User(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            rank=validated_data.get('rank', ''),
            unit=validated_data.get('unit', ''),
            role='TRAINEE',
        )
        user.set_password(password)
        user.save()
        return user

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        data['user'] = UserSerializer(self.user).data
        return data
