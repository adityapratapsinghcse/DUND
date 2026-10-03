from django.urls import re_path
from .consumers import ExerciseConsumer

websocket_urlpatterns = [
    re_path(r'^ws/exercises/(?P<id>\d+)/?$', ExerciseConsumer.as_asgi()),
]
