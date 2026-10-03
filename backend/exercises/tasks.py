from celery import shared_task
from django.utils import timezone
from .models import Exercise, ExerciseStatus, CommLink, JammingZone
from comms.pipeline import publish_truth_event, dispatch_due, broadcast_link_status

def tick_single_exercise(exercise):
    """
    Ticks a single exercise: checks elapsed time, triggers due ScenarioEvents,
    and dispatches any due reports.
    """
    if exercise.status != ExerciseStatus.RUNNING:
        return 0

    elapsed = exercise.get_elapsed()
    fired_ids = set(exercise.fired_event_ids or [])
    newly_fired = False

    # Get un-fired events due at or before current elapsed time
    due_events = exercise.scenario.events.filter(
        t_offset_sec__lte=int(elapsed)
    ).exclude(id__in=fired_ids).order_by('t_offset_sec')

    for event in due_events:
        fired_ids.add(event.id)
        newly_fired = True

        if event.event_type == 'TRUTH':
            publish_truth_event(
                exercise=exercise,
                payload=event.payload,
                source_role=event.source_role,
                kind=event.kind,
                scenario_event=event
            )
        elif event.event_type == 'LINK_DOWN':
            src = event.payload.get('source_role', event.source_role)
            tgt = event.payload.get('target_role', 'ALL')
            links_qs = exercise.links.all()
            if src != 'ALL':
                links_qs = links_qs.filter(source_role=src)
            if tgt != 'ALL':
                links_qs = links_qs.filter(target_role=tgt)
            links_qs.update(is_up=False)
            broadcast_link_status(exercise)

        elif event.event_type == 'LINK_UP':
            src = event.payload.get('source_role', event.source_role)
            tgt = event.payload.get('target_role', 'ALL')
            links_qs = exercise.links.all()
            if src != 'ALL':
                links_qs = links_qs.filter(source_role=src)
            if tgt != 'ALL':
                links_qs = links_qs.filter(target_role=tgt)
            links_qs.update(is_up=True)
            broadcast_link_status(exercise)

        elif event.event_type == 'JAM_ZONE':
            p = event.payload
            JammingZone.objects.create(
                exercise=exercise,
                lat=p.get('lat', exercise.scenario.center_lat),
                lon=p.get('lon', exercise.scenario.center_lon),
                radius_m=p.get('radius_m', 5000.0),
                intensity=p.get('intensity', 0.8),
                active=True
            )
            broadcast_link_status(exercise)

    if newly_fired:
        exercise.fired_event_ids = list(fired_ids)
        exercise.save(update_fields=['fired_event_ids'])

    # Dispatch any scheduled reports that are now due
    delivered_count = dispatch_due(exercise=exercise)
    return len(due_events) + delivered_count

@shared_task
def simulation_tick():
    """
    Periodic task running every 1s across all active exercises.
    """
    active_exercises = Exercise.objects.filter(status=ExerciseStatus.RUNNING).select_related('scenario')
    total_actions = 0
    for exercise in active_exercises:
        total_actions += tick_single_exercise(exercise)
    return total_actions
