from rest_framework import status, generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from django.contrib.auth import get_user_model
from .serializers import RegisterSerializer, UserSerializer, UserUpdateSerializer, CustomTokenObtainPairSerializer

User = get_user_model()

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            # Audit log login
            try:
                from adminpanel.models import AuditLog
                username = request.data.get('username')
                user = User.objects.filter(username=username).first()
                if user:
                    AuditLog.objects.create(
                        actor=user,
                        action='LOGIN',
                        target_type='USER',
                        target_id=str(user.id),
                        meta={'ip': request.META.get('REMOTE_ADDR')}
                    )
            except Exception:
                pass
        return response

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = [permissions.AllowAny]
    serializer_class = RegisterSerializer

class CurrentUserView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return UserUpdateSerializer
        return UserSerializer
