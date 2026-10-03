export type Role = 'ADMIN' | 'INSTRUCTOR' | 'TRAINEE';

export interface User {
  id: number;
  username: string;
  email: string;
  role: Role;
  rank: string;
  unit: string;
  is_active: boolean;
  date_joined: string;
}

export interface AuthTokens {
  access: string;
  refresh: string;
  user: User;
}

export type ExerciseStatus = 'LOBBY' | 'RUNNING' | 'PAUSED' | 'ENDED';

export interface ScenarioEvent {
  id?: number;
  t_offset_sec: number;
  event_type: 'TRUTH' | 'LINK_DOWN' | 'LINK_UP' | 'JAM_ZONE';
  kind: string;
  source_role: string;
  payload: {
    title?: string;
    detail?: string;
    lat?: number;
    lon?: number;
    visible_to?: string[];
    expected_actions?: string[];
    [key: string]: any;
  };
}

export interface Scenario {
  id: number;
  title: string;
  description: string;
  domains: string[];
  roles: string[];
  difficulty: 'EASY' | 'MEDIUM' | 'HARD' | 'EXTREME';
  center_lat: number;
  center_lon: number;
  default_intensity: number;
  created_by?: number;
  created_by_name?: string;
  created_at: string;
  events?: ScenarioEvent[];
  events_count?: number;
}

export interface Participant {
  id: number;
  user: number;
  username: string;
  rank?: string;
  unit?: string;
  role: string;
  lat?: number | null;
  lon?: number | null;
  joined_at: string;
  last_seen: string;
  signal_bars?: number;
  link_quality?: number;
}

export interface CommLink {
  id: number;
  exercise: number;
  source_role: string;
  target_role: string;
  quality: number;
  is_up: boolean;
}

export interface JammingZone {
  id: number;
  exercise: number;
  lat: number;
  lon: number;
  radius_m: number;
  intensity: number;
  active: boolean;
  created_at: string;
}

export interface Exercise {
  id: number;
  join_code: string;
  scenario: Scenario | number;
  scenario_title?: string;
  instructor: number;
  instructor_name?: string;
  status: ExerciseStatus;
  intensity: number;
  seed: number;
  started_at: string | null;
  elapsed_sec: number;
  participants?: Participant[];
  participants_count?: number;
  links?: CommLink[];
  jamming_zones?: JammingZone[];
  created_at: string;
}

export interface TruthEvent {
  id: number;
  exercise: number;
  scenario_event?: number | null;
  t_sec: number;
  kind: string;
  source_role: string;
  payload: Record<string, any>;
  created_at: string;
}

export type ConfidenceLevel = 'CONFIRMED' | 'PROBABLE' | 'UNVERIFIED';

export interface TraineeReport {
  id: number;
  exercise: number;
  participant: number;
  participant_role: string;
  status: 'PENDING' | 'DELIVERED' | 'DROPPED';
  confidence: ConfidenceLevel;
  payload: {
    title: string;
    detail?: string;
    lat?: number;
    lon?: number;
    noisy?: boolean;
    [key: string]: any;
  };
  delivered_at: string | null;
  created_at: string;
}

export interface InstructorReport extends TraineeReport {
  truth_event?: number | null;
  origin: 'NORMAL' | 'CONFLICT' | 'SPOOFED';
  is_corrupted: boolean;
  delay_sec: number;
  deliver_at: string;
}

export type ActionType = 'MOVE' | 'HOLD' | 'FIRE_SUPPORT' | 'REQUEST_ISR' | 'VERIFY' | 'FALLBACK_COMMS';

export interface Decision {
  id: number;
  exercise: number;
  participant: number;
  participant_role: string;
  user_name: string;
  truth_event?: number | null;
  action_type: ActionType;
  self_confidence: number;
  latency_sec: number;
  correct: boolean | null;
  details: Record<string, any>;
  created_at: string;
}

export interface CalibrationBin {
  bin: string;
  expected_confidence: number;
  actual_accuracy: number;
  samples: number;
}

export interface Scorecard {
  participant_id: number;
  role: string;
  user: string;
  decisions: number;
  accuracy: number;
  avg_latency: number;
  calibration_error: number;
  verified_info: number;
  used_fallback_comms: number;
  calibration_curve: CalibrationBin[];
}

export interface AARData {
  exercise_id: number;
  scenario_title: string;
  status: ExerciseStatus;
  duration_sec: number;
  intensity: number;
  truth_events: TruthEvent[];
  reports: InstructorReport[];
  decisions: Decision[];
  scorecards: Scorecard[];
}

export interface AdminStats {
  users_by_role: Record<string, number>;
  total_users: number;
  total_scenarios: number;
  exercises_by_status: Record<string, number>;
  active_sessions_now: number;
  decisions_today: number;
  avg_intensity: number;
  exercises_per_day_14d: Array<{ date: string; count: number }>;
}

export interface SystemSettings {
  max_delay_sec: number;
  default_intensity: number;
  allow_self_registration: boolean;
  max_participants_per_exercise: number;
  updated_at: string;
}

export interface AuditLog {
  id: number;
  actor: number | null;
  actor_name?: string;
  action: string;
  target_type: string;
  target_id: string;
  meta: Record<string, any>;
  created_at: string;
}
