from comms.models import Decision, Report, TruthEvent

def calculate_participant_scorecard(participant):
    """
    Computes scorecard metrics for a single participant:
    - decisions count
    - accuracy (% correct)
    - avg latency (seconds)
    - calibration error (Brier score on self_confidence)
    - verified_info count
    - used_fallback_comms count
    """
    decisions = Decision.objects.filter(participant=participant)
    total_decisions = decisions.count()

    if total_decisions == 0:
        return {
            'participant_id': participant.id,
            'role': participant.role,
            'user': participant.user.username,
            'decisions': 0,
            'accuracy': 0.0,
            'avg_latency': 0.0,
            'calibration_error': 0.0,
            'verified_info': 0,
            'used_fallback_comms': 0,
            'calibration_curve': [],
        }

    correct_count = 0
    evaluated_count = 0
    total_latency = 0.0
    brier_sum = 0.0
    verified_info = 0
    used_fallback_comms = 0

    # Group confidence into bins [0-20%, 20-40%, 40-60%, 60-80%, 80-100%]
    bins = {
        '0-20%': {'conf_sum': 0.0, 'correct_sum': 0, 'count': 0},
        '20-40%': {'conf_sum': 0.0, 'correct_sum': 0, 'count': 0},
        '40-60%': {'conf_sum': 0.0, 'correct_sum': 0, 'count': 0},
        '60-80%': {'conf_sum': 0.0, 'correct_sum': 0, 'count': 0},
        '80-100%': {'conf_sum': 0.0, 'correct_sum': 0, 'count': 0},
    }

    for d in decisions:
        total_latency += d.latency_sec
        if d.action_type == 'VERIFY':
            verified_info += 1
        elif d.action_type == 'FALLBACK_COMMS':
            used_fallback_comms += 1

        is_correct = d.correct
        # If correct wasn't explicitly graded, check if action was reasonable or matching expected
        if is_correct is None and d.truth_event:
            expected = d.truth_event.payload.get('expected_actions', [])
            if expected:
                is_correct = (d.action_type in expected)
            else:
                is_correct = True  # Default true if no conflicting action specified

        outcome = 1.0 if is_correct else 0.0
        conf = max(0.0, min(1.0, d.self_confidence))
        brier_sum += (conf - outcome) ** 2
        evaluated_count += 1
        if is_correct:
            correct_count += 1

        # Binning
        if conf <= 0.2:
            b_key = '0-20%'
        elif conf <= 0.4:
            b_key = '20-40%'
        elif conf <= 0.6:
            b_key = '40-60%'
        elif conf <= 0.8:
            b_key = '60-80%'
        else:
            b_key = '80-100%'

        bins[b_key]['count'] += 1
        bins[b_key]['conf_sum'] += conf
        bins[b_key]['correct_sum'] += 1 if is_correct else 0

    accuracy = round((correct_count / evaluated_count) * 100.0, 1) if evaluated_count > 0 else 0.0
    avg_latency = round(total_latency / total_decisions, 2)
    brier_score = round(brier_sum / evaluated_count, 3) if evaluated_count > 0 else 0.0

    calibration_curve = []
    for b_name, b_data in bins.items():
        if b_data['count'] > 0:
            avg_conf = round((b_data['conf_sum'] / b_data['count']) * 100.0, 1)
            actual_acc = round((b_data['correct_sum'] / b_data['count']) * 100.0, 1)
        else:
            avg_conf = 0.0
            actual_acc = 0.0
        calibration_curve.append({
            'bin': b_name,
            'expected_confidence': avg_conf,
            'actual_accuracy': actual_acc,
            'samples': b_data['count'],
        })

    return {
        'participant_id': participant.id,
        'role': participant.role,
        'user': participant.user.username,
        'decisions': total_decisions,
        'accuracy': accuracy,
        'avg_latency': avg_latency,
        'calibration_error': brier_score,
        'verified_info': verified_info,
        'used_fallback_comms': used_fallback_comms,
        'calibration_curve': calibration_curve,
    }

def build_exercise_aar(exercise):
    """
    Builds the complete After-Action Review (AAR) dataset:
    - Truth events timeline
    - Perceived reports per participant (revealing origin, is_corrupted, delay_sec in AAR)
    - Decisions made
    - Individual & aggregate scorecards
    """
    truth_events = TruthEvent.objects.filter(exercise=exercise).order_by('t_sec')
    reports = Report.objects.filter(exercise=exercise).select_related('participant').order_by('deliver_at')
    decisions = Decision.objects.filter(exercise=exercise).select_related('participant', 'participant__user')

    scorecards = [calculate_participant_scorecard(p) for p in exercise.participants.all()]

    from comms.serializers import TruthEventSerializer, InstructorReportSerializer, DecisionSerializer
    return {
        'exercise_id': exercise.id,
        'scenario_title': exercise.scenario.title,
        'status': exercise.status,
        'duration_sec': exercise.get_elapsed(),
        'intensity': exercise.intensity,
        'truth_events': TruthEventSerializer(truth_events, many=True).data,
        'reports': InstructorReportSerializer(reports, many=True).data,
        'decisions': DecisionSerializer(decisions, many=True).data,
        'scorecards': scorecards,
    }
