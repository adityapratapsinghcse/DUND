import random
from datetime import timedelta
from django.utils import timezone
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from .models import TruthEvent, Report
from .degradation import plan_report, haversine_distance_m

def compute_participant_link_quality(exercise, participant, source_role="HQ"):
    """
    Computes effective link quality q in [0.0, 1.0] for a participant,
    factoring in link status/quality, exercise global intensity, and active jamming zones.
    """
    link = exercise.links.filter(source_role=source_role, target_role=participant.role).first()
    link_up = link.is_up if link else True
    link_quality = (link.quality if link else 1.0) if link_up else 0.0

    global_factor = max(0.0, 1.0 - 0.7 * exercise.intensity)

    jamming_factor = 1.0
    active_zones = exercise.jamming_zones.filter(active=True)
    if participant.lat is not None and participant.lon is not None:
        for zone in active_zones:
            dist = haversine_distance_m(participant.lat, participant.lon, zone.lat, zone.lon)
            if dist <= zone.radius_m:
                jamming_factor *= max(0.0, 1.0 - zone.intensity)

    q = link_quality * global_factor * jamming_factor
    return max(0.0, min(1.0, q)), link_up

def get_signal_bars(q, link_up=True):
    """Returns signal bars integer 0..4 based on effective quality."""
    if not link_up or q < 0.05:
        return 0
    if q >= 0.8:
        return 4
    if q >= 0.55:
        return 3
    if q >= 0.3:
        return 2
    return 1

def publish_truth_event(exercise, payload, source_role="HQ", kind="TACTICAL_REPORT", scenario_event=None):
    """
    Stores ground truth event, runs degradation for each participant,
    stores scheduled reports, and dispatches due reports.
    """
    from adminpanel.models import SystemSettings
    settings = SystemSettings.get_settings()
    max_delay = getattr(settings, 'max_delay_sec', 300)

    now = timezone.now()
    elapsed = exercise.get_elapsed()

    truth_event = TruthEvent.objects.create(
        exercise=exercise,
        scenario_event=scenario_event,
        t_sec=elapsed,
        kind=kind,
        source_role=source_role,
        payload=payload
    )

    visible_to = payload.get('visible_to', [])
    participants = exercise.participants.all()

    for participant in participants:
        # Check audience visibility
        if visible_to and (participant.role not in visible_to) and ("ALL" not in visible_to):
            continue

        q, link_up = compute_participant_link_quality(exercise, participant, source_role)

        # Seeded RNG per (exercise.seed, truth_event.id, participant.id)
        seed_key = f"{exercise.seed}-{truth_event.id}-{participant.id}"
        rng = random.Random(seed_key)

        planned_reports = plan_report(q, rng, payload, link_up=link_up, max_delay_sec=max_delay)

        for plan in planned_reports:
            deliver_at = now + timedelta(seconds=plan['delay_sec'])
            Report.objects.create(
                truth_event=truth_event,
                exercise=exercise,
                participant=participant,
                status=plan['status'],
                origin=plan['origin'],
                confidence=plan['confidence'],
                payload=plan['payload'],
                is_corrupted=plan['is_corrupted'],
                delay_sec=plan['delay_sec'],
                deliver_at=deliver_at,
            )

    # Immediately dispatch reports that are due (e.g. zero delay)
    dispatch_due(exercise=exercise)

    # Notify instructor channel of new truth event
    channel_layer = get_channel_layer()
    if channel_layer:
        try:
            from .serializers import TruthEventSerializer
            async_to_sync(channel_layer.group_send)(
                f"exercise_{exercise.id}_instructor",
                {
                    "type": "instructor_truth_event",
                    "event": TruthEventSerializer(truth_event).data
                }
            )
        except Exception:
            pass

    return truth_event

def dispatch_due(exercise=None):
    """
    Finds all PENDING reports whose deliver_at is now or in the past,
    transitions them to DELIVERED, and broadcasts them via Channels WebSocket.
    """
    now = timezone.now()
    qs = Report.objects.filter(status='PENDING', deliver_at__lte=now).select_related('participant', 'exercise')
    if exercise:
        qs = qs.filter(exercise=exercise)

    delivered_count = 0
    channel_layer = get_channel_layer()

    for report in qs:
        report.status = 'DELIVERED'
        report.delivered_at = now
        report.save(update_fields=['status', 'delivered_at'])
        delivered_count += 1

        if channel_layer:
            try:
                from .serializers import TraineeReportSerializer
                # Push to trainee
                async_to_sync(channel_layer.group_send)(
                    f"participant_{report.participant.id}",
                    {
                        "type": "report_push",
                        "report": TraineeReportSerializer(report).data
                    }
                )
                # Push to instructor
                async_to_sync(channel_layer.group_send)(
                    f"exercise_{report.exercise.id}_instructor",
                    {
                        "type": "instructor_report_delivered",
                        "report_id": report.id,
                        "participant_id": report.participant.id,
                        "participant_role": report.participant.role,
                        "origin": report.origin,
                        "confidence": report.confidence,
                        "is_corrupted": report.is_corrupted,
                        "delay_sec": report.delay_sec,
                    }
                )
            except Exception:
                pass

    return delivered_count

def broadcast_link_status(exercise):
    """Broadcasts updated signal bars and link state to each participant."""
    channel_layer = get_channel_layer()
    if not channel_layer:
        return

    for p in exercise.participants.all():
        q, link_up = compute_participant_link_quality(exercise, p)
        bars = get_signal_bars(q, link_up)
        try:
            async_to_sync(channel_layer.group_send)(
                f"participant_{p.id}",
                {
                    "type": "link_status",
                    "bars": bars,
                    "quality": round(q, 3),
                    "status": exercise.status,
                }
            )
        except Exception:
            pass
