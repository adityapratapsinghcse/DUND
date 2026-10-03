import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { SignalBars } from '../components/ui/SignalBars.js';
import { Button } from '../components/ui/Button.js';
import { exerciseReducer, initialExerciseState } from '@degrade/shared';

describe('Web UI Components and State Reducers', () => {
  it('renders SignalBars with COMMS LOST when bars is 0', () => {
    render(<SignalBars bars={0} />);
    expect(screen.getByText('COMMS LOST')).toBeInTheDocument();
  });

  it('renders SignalBars with bar count label when quality is normal', () => {
    render(<SignalBars bars={3} quality={0.75} />);
    expect(screen.getByText('3/4 BARS (75%)')).toBeInTheDocument();
  });

  it('renders Button correctly with loading spinner', () => {
    render(<Button isLoading={true}>Submit Action</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('updates state correctly using exerciseReducer', () => {
    const s1 = exerciseReducer(initialExerciseState, {
      type: 'SET_STATUS',
      payload: 'RUNNING',
    });
    expect(s1.status).toBe('RUNNING');

    const s2 = exerciseReducer(s1, {
      type: 'SET_LINK_STATUS',
      payload: { bars: 1, quality: 0.2, status: 'RUNNING' },
    });
    expect(s2.bars).toBe(1);
    expect(s2.linkQuality).toBe(0.2);

    const report = {
      id: 99,
      exercise: 1,
      participant: 2,
      participant_role: 'LAND',
      status: 'DELIVERED' as const,
      confidence: 'CONFIRMED' as const,
      payload: { title: 'Enemy Radar Contact' },
      delivered_at: null,
      created_at: new Date().toISOString(),
    };

    const s3 = exerciseReducer(s2, {
      type: 'ADD_REPORT',
      payload: report,
    });
    expect(s3.reports.length).toBe(1);
    expect(s3.reports[0].payload.title).toBe('Enemy Radar Contact');
  });
});
