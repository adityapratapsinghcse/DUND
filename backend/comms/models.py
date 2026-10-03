from django.db import models
from django.conf import settings

class TruthEvent(models.Model):
    exercise = models.ForeignKey('exercises.Exercise', on_delete=models.CASCADE, related_name='truth_events')
    scenario_event = models.ForeignKey('scenarios.ScenarioEvent', on_delete=models.SET_NULL, null=True, blank=True)
    t_sec = models.FloatField(default=0.0)
    kind = models.CharField(max_length=100)
    source_role = models.CharField(max_length=50, default='HQ')
    payload = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"TruthEvent #{self.id} [{self.source_role} -> {self.kind}] @ {self.t_sec:.1f}s"

class Report(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('DELIVERED', 'Delivered'),
        ('DROPPED', 'Dropped'),
    ]
    ORIGIN_CHOICES = [
        ('NORMAL', 'Normal'),
        ('CONFLICT', 'Conflict'),
        ('SPOOFED', 'Spoofed'),
    ]
    CONFIDENCE_CHOICES = [
        ('CONFIRMED', 'Confirmed'),
        ('PROBABLE', 'Probable'),
        ('UNVERIFIED', 'Unverified'),
    ]

    truth_event = models.ForeignKey(TruthEvent, on_delete=models.SET_NULL, null=True, blank=True, related_name='reports')
    exercise = models.ForeignKey('exercises.Exercise', on_delete=models.CASCADE, related_name='reports')
    participant = models.ForeignKey('exercises.Participant', on_delete=models.CASCADE, related_name='reports')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    origin = models.CharField(max_length=20, choices=ORIGIN_CHOICES, default='NORMAL')
    confidence = models.CharField(max_length=20, choices=CONFIDENCE_CHOICES, default='UNVERIFIED')
    payload = models.JSONField(default=dict)
    is_corrupted = models.BooleanField(default=False)
    delay_sec = models.FloatField(default=0.0)
    deliver_at = models.DateTimeField()
    delivered_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['deliver_at', 'id']

    def __str__(self):
        return f"Report #{self.id} -> {self.participant.role} [{self.status}/{self.confidence}]"

class Decision(models.Model):
    ACTION_TYPES = [
        ('MOVE', 'Move'),
        ('HOLD', 'Hold'),
        ('FIRE_SUPPORT', 'Fire Support'),
        ('REQUEST_ISR', 'Request ISR'),
        ('VERIFY', 'Verify Comms/Data'),
        ('FALLBACK_COMMS', 'Switch to Fallback Comms'),
    ]

    exercise = models.ForeignKey('exercises.Exercise', on_delete=models.CASCADE, related_name='decisions')
    participant = models.ForeignKey('exercises.Participant', on_delete=models.CASCADE, related_name='decisions')
    truth_event = models.ForeignKey(TruthEvent, on_delete=models.SET_NULL, null=True, blank=True, related_name='decisions')
    action_type = models.CharField(max_length=30, choices=ACTION_TYPES)
    self_confidence = models.FloatField(help_text="0.0 to 1.0 (from confidence slider)")
    latency_sec = models.FloatField(default=0.0)
    correct = models.BooleanField(null=True, blank=True)
    details = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"Decision #{self.id} by {self.participant.role}: {self.action_type} (conf={self.self_confidence:.2f})"
