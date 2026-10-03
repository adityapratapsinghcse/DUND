from django.db import models
from django.conf import settings

class AuditLog(models.Model):
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='audit_actions')
    action = models.CharField(max_length=100, db_index=True)
    target_type = models.CharField(max_length=50, blank=True)
    target_id = models.CharField(max_length=50, blank=True)
    meta = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        actor_name = self.actor.username if self.actor else "SYSTEM"
        return f"[{self.created_at.strftime('%Y-%m-%d %H:%M:%S')}] {actor_name} -> {self.action} on {self.target_type}:{self.target_id}"

class SystemSettings(models.Model):
    max_delay_sec = models.PositiveIntegerField(default=300, help_text="Maximum comms delay ceiling in seconds")
    default_intensity = models.FloatField(default=0.3, help_text="Default baseline degradation intensity 0..1")
    allow_self_registration = models.BooleanField(default=True, help_text="Permit new trainees to register freely")
    max_participants_per_exercise = models.PositiveIntegerField(default=12, help_text="Max trainees per single exercise lobby")
    updated_at = models.DateTimeField(auto_now=True)

    @classmethod
    def get_settings(cls):
        obj, _ = cls.objects.get_or_create(id=1)
        return obj

    def __str__(self):
        return f"SystemSettings (max_delay={self.max_delay_sec}s, max_p={self.max_participants_per_exercise})"
