from django.db import models
from django.conf import settings

class Scenario(models.Model):
    DIFFICULTY_CHOICES = [
        ('EASY', 'Easy'),
        ('MEDIUM', 'Medium'),
        ('HARD', 'Hard'),
        ('EXTREME', 'Extreme'),
    ]

    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default='')
    domains = models.JSONField(default=list, help_text="e.g. ['LAND', 'AIR', 'CYBER', 'EW']")
    roles = models.JSONField(default=list, help_text="e.g. ['LAND', 'AIR', 'CYBER']")
    difficulty = models.CharField(max_length=20, choices=DIFFICULTY_CHOICES, default='MEDIUM')
    center_lat = models.FloatField(default=25.4358)  # Prayagraj area
    center_lon = models.FloatField(default=81.8463)
    default_intensity = models.FloatField(default=0.3)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title

class ScenarioEvent(models.Model):
    EVENT_TYPES = [
        ('TRUTH', 'Truth Event'),
        ('LINK_DOWN', 'Link Down'),
        ('LINK_UP', 'Link Up'),
        ('JAM_ZONE', 'Jam Zone'),
    ]

    scenario = models.ForeignKey(Scenario, on_delete=models.CASCADE, related_name='events')
    t_offset_sec = models.PositiveIntegerField(help_text="Seconds from exercise start")
    event_type = models.CharField(max_length=30, choices=EVENT_TYPES, default='TRUTH')
    kind = models.CharField(max_length=100, default='TACTICAL_REPORT')
    source_role = models.CharField(max_length=50, default='HQ')
    payload = models.JSONField(default=dict, help_text="{title, detail, lat, lon, visible_to, expected_actions}")

    class Meta:
        ordering = ['t_offset_sec', 'id']

    def __str__(self):
        return f"{self.scenario.title} @ +{self.t_offset_sec}s [{self.event_type}] {self.kind}"
