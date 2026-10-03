import os
from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'degrade.settings')

app = Celery('degrade')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()

app.conf.beat_schedule = {
    'simulation-tick-every-second': {
        'task': 'exercises.tasks.simulation_tick',
        'schedule': 1.0,
    },
}
