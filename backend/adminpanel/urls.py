from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    AdminStatsView, AdminUserViewSet, AdminExerciseViewSet,
    AdminAuditLogView, AdminSystemSettingsView
)

router = DefaultRouter()
router.register(r'users', AdminUserViewSet, basename='admin-users')
router.register(r'exercises', AdminExerciseViewSet, basename='admin-exercises')

urlpatterns = [
    path('stats/', AdminStatsView.as_view(), name='admin-stats'),
    path('audit/', AdminAuditLogView.as_view(), name='admin-audit'),
    path('settings/', AdminSystemSettingsView.as_view(), name='admin-settings'),
    path('', include(router.urls)),
]
