import copy
import math

def haversine_distance_m(lat1, lon1, lat2, lon2):
    """Calculate distance in meters between two coordinates."""
    R = 6371000.0  # Earth radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (math.sin(delta_phi / 2.0) ** 2 +
         math.cos(phi1) * math.cos(phi2) * (math.sin(delta_lambda / 2.0) ** 2))
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c

def sanitize_trainee_payload(raw_payload):
    """
    Strips instructor-only ground truth metadata (expected_actions, visible_to)
    from trainee-visible payload.
    """
    clean = copy.deepcopy(raw_payload) if isinstance(raw_payload, dict) else {}
    clean.pop('expected_actions', None)
    clean.pop('visible_to', None)
    return clean

def plan_report(q, rng, payload, link_up=True, max_delay_sec=300.0):
    """
    Pure degradation function with seeded RNG.
    
    Formula specifications:
    - Drop probability: 0.8 * (1 - q)^2
    - Delay: up to max_delay_sec * (1 - q)
    - Corruption probability: 0.35 * (1 - q) (shift lat/lon up to ~0.05 deg * loss)
    - Conflicting second report probability: 0.25 * (1 - q)
    - Confidence label: q > 0.75 CONFIRMED, q > 0.4 PROBABLE, else UNVERIFIED
    
    Returns a list of planned report dicts (1 primary report, plus optional second conflict report).
    """
    loss = max(0.0, min(1.0, 1.0 - q))
    results = []

    # 1. Determine confidence
    if q > 0.75:
        confidence = 'CONFIRMED'
    elif q > 0.4:
        confidence = 'PROBABLE'
    else:
        confidence = 'UNVERIFIED'

    # Base payload sanitized
    primary_payload = sanitize_trainee_payload(payload)

    # 2. Check Link Up & Drop Probability
    drop_prob = 0.8 * (loss ** 2)
    is_dropped = (not link_up) or (rng.random() < drop_prob)
    status = 'DROPPED' if is_dropped else 'PENDING'

    # 3. Calculate Delay
    delay_sec = round(rng.uniform(0.0, float(max_delay_sec)) * loss, 2)

    # 4. Corruption Check
    corrupt_prob = 0.35 * loss
    is_corrupted = False
    if rng.random() < corrupt_prob:
        is_corrupted = True
        if 'lat' in primary_payload and 'lon' in primary_payload:
            try:
                lat_shift = rng.uniform(-0.05, 0.05) * loss
                lon_shift = rng.uniform(-0.05, 0.05) * loss
                primary_payload['lat'] = round(float(primary_payload['lat']) + lat_shift, 6)
                primary_payload['lon'] = round(float(primary_payload['lon']) + lon_shift, 6)
                primary_payload['noisy'] = True
            except (ValueError, TypeError):
                pass

    results.append({
        'status': status,
        'origin': 'NORMAL',
        'confidence': confidence,
        'payload': primary_payload,
        'is_corrupted': is_corrupted,
        'delay_sec': delay_sec,
    })

    # 5. Conflicting Report Check (second report)
    conflict_prob = 0.25 * loss
    if not is_dropped and (rng.random() < conflict_prob):
        conflict_payload = sanitize_trainee_payload(payload)
        # Shift coordinate in opposite direction or alter detail
        if 'lat' in conflict_payload and 'lon' in conflict_payload:
            try:
                c_lat_shift = rng.uniform(-0.08, 0.08) * loss
                c_lon_shift = rng.uniform(-0.08, 0.08) * loss
                conflict_payload['lat'] = round(float(conflict_payload['lat']) + c_lat_shift, 6)
                conflict_payload['lon'] = round(float(conflict_payload['lon']) + c_lon_shift, 6)
            except (ValueError, TypeError):
                pass
        
        conflict_delay = round(delay_sec + rng.uniform(2.0, 30.0) * loss, 2)
        results.append({
            'status': 'PENDING',
            'origin': 'CONFLICT',
            'confidence': 'UNVERIFIED' if confidence == 'CONFIRMED' else confidence,
            'payload': conflict_payload,
            'is_corrupted': True,
            'delay_sec': conflict_delay,
        })

    return results
