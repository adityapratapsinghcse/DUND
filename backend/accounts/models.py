from django.contrib.auth.models import AbstractUser
from django.db import models

class Role(models.TextChoices):
    ADMIN = 'ADMIN', 'Admin'
    INSTRUCTOR = 'INSTRUCTOR', 'Instructor'
    TRAINEE = 'TRAINEE', 'Trainee'

class User(AbstractUser):
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.TRAINEE)
    rank = models.CharField(max_length=60, blank=True, default='')
    unit = models.CharField(max_length=100, blank=True, default='')

    def __str__(self):
        return f"{self.username} ({self.role})"
