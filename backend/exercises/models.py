import random
import string
from django.db import models
from django.conf import settings
from django.utils import timezone

class ExerciseStatus(models.TextChoices):
    LOBBY = 'LOBBY', 'Lobby'
    RUNNING = 'RUNNING', 'Running'
    PAUSED = 'PAUSED', 'Paused'
    ENDED = 'ENDED', 'Ended'

class Exercise(models.Model):
    scenario = models.ForeignKey('scenarios.Scenario', on_delete=models.CASCADE, related_name='exercises')
    instructor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='hosted_exercises')
    join_code = models.CharField(max_length=8, unique=True, db_index=True)
    status = models.CharField(max_length=20, choices=ExerciseStatus.choices, default=ExerciseStatus.LOBBY)
    intensity = models.FloatField(default=0.3)
    seed = models.PositiveIntegerField(default=123456)
    started_at = models.DateTimeField(null=True, blank=True)
    elapsed_before = models.FloatField(default=0.0)
    fired_event_ids = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @classmethod
    def generate_join_code(cls):
        chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
        for _ in range(50):
            code = ''.join(random.choice(chars) for _ in range(6))
            if not cls.objects.filter(join_code=code).exists():
                return code
        return ''.join(random.choice(chars) for _ in range(6))

    def get_elapsed(self):
        if self.status == ExerciseStatus.RUNNING and self.started_at:
            delta = (timezone.now() - self.started_at).total_seconds()
            return round(self.elapsed_before + delta, 2)
        return round(self.elapsed_before, 2)

    def __str__(self):
        return f"Exercise #{self.id} [{self.join_code}] - {self.scenario.title} ({self.status})"

class Participant(models.Model):
    exercise = models.ForeignKey(Exercise, on_delete=models.CASCADE, related_name='participants')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='participations')
    role = models.CharField(max_length=50)  # e.g. LAND, AIR, CYBER
    lat = models.FloatField(null=True, blank=True)
    lon = models.FloatField(null=True, blank=True)
    joined_at = models.DateTimeField(auto_now_add=True)
    last_seen = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('exercise', 'user')

    def __str__(self):
        return f"{self.user.username} as {self.role} in Exercise {self.exercise_id}"

class CommLink(models.Model):
    exercise = models.ForeignKey(Exercise, on_delete=models.CASCADE, related_name='links')
    source_role = models.CharField(max_length=50)
    target_role = models.CharField(max_length=50)
    quality = models.FloatField(default=1.0)
    is_up = models.BooleanField(default=True)

    class Meta:
        unique_together = ('exercise', 'source_role', 'target_role')

    def __str__(self):
        status_str = "UP" if self.is_up else "DOWN"
        return f"{self.source_role} -> {self.target_role}: {status_str} (q={self.quality})"

class JammingZone(models.Model):
    exercise = models.ForeignKey(Exercise, on_delete=models.CASCADE, related_name='jamming_zones')
    lat = models.FloatField()
    lon = models.FloatField()
    radius_m = models.FloatField(default=5000.0)
    intensity = models.FloatField(default=0.8)
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"JammingZone #{self.id} @ ({self.lat:.4f}, {self.lon:.4f}) r={self.radius_m}m int={self.intensity}"
