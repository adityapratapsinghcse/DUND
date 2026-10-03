import { TraineeReport, Decision, TruthEvent, Participant, ExerciseStatus } from '../types/index.js';

export interface ExerciseLiveState {
  exerciseId: number | null;
  status: ExerciseStatus;
  elapsedSec: number;
  bars: number;
  linkQuality: number;
  connectionState: 'connected' | 'reconnecting' | 'fallback_polling' | 'disconnected';
  reports: TraineeReport[];
  truthEvents: TruthEvent[];
  decisions: Decision[];
  participants: Participant[];
  myPosition: { lat: number; lon: number } | null;
}

export const initialExerciseState: ExerciseLiveState = {
  exerciseId: null,
  status: 'LOBBY',
  elapsedSec: 0,
  bars: 4,
  linkQuality: 1.0,
  connectionState: 'disconnected',
  reports: [],
  truthEvents: [],
  decisions: [],
  participants: [],
  myPosition: null,
};

export function exerciseReducer(state: ExerciseLiveState, action: { type: string; payload?: any }): ExerciseLiveState {
  switch (action.type) {
    case 'SET_EXERCISE_ID':
      return { ...state, exerciseId: action.payload };

    case 'SET_STATUS':
      return { ...state, status: action.payload };

    case 'SET_ELAPSED':
      return { ...state, elapsedSec: action.payload };

    case 'SET_LINK_STATUS':
      return {
        ...state,
        bars: action.payload.bars ?? state.bars,
        linkQuality: action.payload.quality ?? state.linkQuality,
        status: action.payload.status ?? state.status,
      };

    case 'SET_CONNECTION_STATE':
      return { ...state, connectionState: action.payload };

    case 'ADD_REPORT': {
      const incoming: TraineeReport = action.payload;
      if (state.reports.some(r => r.id === incoming.id)) {
        return state;
      }
      return {
        ...state,
        reports: [incoming, ...state.reports],
      };
    }

    case 'SET_REPORTS':
      return { ...state, reports: action.payload };

    case 'ADD_TRUTH_EVENT': {
      const incoming: TruthEvent = action.payload;
      if (state.truthEvents.some(e => e.id === incoming.id)) {
        return state;
      }
      return {
        ...state,
        truthEvents: [...state.truthEvents, incoming],
      };
    }

    case 'ADD_DECISION': {
      const incoming: Decision = action.payload;
      if (state.decisions.some(d => d.id === incoming.id)) {
        return state;
      }
      return {
        ...state,
        decisions: [incoming, ...state.decisions],
      };
    }

    case 'UPDATE_PARTICIPANT': {
      const incoming: Participant = action.payload;
      const index = state.participants.findIndex(p => p.id === incoming.id);
      if (index >= 0) {
        const next = [...state.participants];
        next[index] = { ...next[index], ...incoming };
        return { ...state, participants: next };
      }
      return { ...state, participants: [...state.participants, incoming] };
    }

    case 'SET_PARTICIPANTS':
      return { ...state, participants: action.payload };

    case 'SET_MY_POSITION':
      return { ...state, myPosition: action.payload };

    case 'RESET':
      return initialExerciseState;

    default:
      return state;
  }
}
