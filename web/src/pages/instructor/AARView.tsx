import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import { useToast } from '../../components/ui/Toast.js';
import { Button } from '../../components/ui/Button.js';
import { Select } from '../../components/ui/Input.js';
import { Card } from '../../components/ui/Card.js';
import { Badge } from '../../components/ui/Badge.js';
import { StatCard } from '../../components/ui/StatCard.js';
import { TacticalMap } from '../../components/map/TacticalMap.js';
import { AARData } from '@degrade/shared';
import {
  Printer, Play, Pause, RotateCcw, ArrowLeft, Target, Clock,
  Award, ShieldAlert, CheckCircle2, AlertTriangle, XCircle, FastForward
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

export const AARView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const exerciseId = Number(id);
  const { api } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [aar, setAar] = useState<AARData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Replay Scrubber State
  const [currentTimeSec, setCurrentTimeSec] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);

  useEffect(() => {
    api.getAAR(exerciseId)
      .then((data) => {
        setAar(data);
        setCurrentTimeSec(data.duration_sec || 60);
      })
      .catch((err) => toast(err.message || 'Failed to load AAR data.', 'danger'))
      .finally(() => setIsLoading(false));
  }, [exerciseId]);

  // Scrubber playback timer
  useEffect(() => {
    let timer: any;
    if (isPlaying && aar) {
      timer = setInterval(() => {
        setCurrentTimeSec((t) => {
          if (t >= aar.duration_sec) {
            setIsPlaying(false);
            return aar.duration_sec;
          }
          return Math.min(aar.duration_sec, t + playbackSpeed);
        });
      }, 1000 / playbackSpeed);
    }
    return () => clearInterval(timer);
  }, [isPlaying, playbackSpeed, aar]);

  const handlePrint = () => {
    window.print();
  };

  if (isLoading || !aar) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <span className="text-xs text-muted font-mono">COMPILING AFTER-ACTION INTELLIGENCE...</span>
        </div>
      </div>
    );
  }

  // Filter reports visible up to currentTimeSec for map replay
  const activeReplayReports = aar.reports.filter((r) => {
    if (!r.deliver_at) return true;
    const diff = (new Date(r.deliver_at).getTime() - new Date(aar.truth_events[0]?.created_at || 0).getTime()) / 1000;
    return diff <= currentTimeSec;
  });

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6 aar-container">
      {/* Header & Print Control */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-4 no-print">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Button variant="ghost" size="sm" onClick={() => navigate('/instructor')} className="text-xs -ml-2">
              <ArrowLeft className="w-4 h-4 mr-1" /> Dashboard
            </Button>
            <Badge variant="primary">AFTER-ACTION REVIEW</Badge>
          </div>
          <h1 className="text-2xl font-semibold text-fg">{aar.scenario_title}</h1>
          <p className="text-xs text-muted mt-0.5">
            Simulation Exercise #{aar.exercise_id} • Total Duration: {Math.round(aar.duration_sec)} seconds • Global Intensity: {Math.round(aar.intensity * 100)}%
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="primary" onClick={handlePrint} className="gap-2">
            <Printer className="w-4 h-4" /> Export Printable AAR
          </Button>
        </div>
      </div>

      {/* Trainee Scorecards Grid */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-fg">
          Participant Performance & Brier Calibration Scorecards
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {aar.scorecards.map((sc) => (
            <Card key={sc.participant_id} className="p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <div>
                  <h4 className="font-semibold text-fg text-sm">{sc.user}</h4>
                  <span className="text-xs text-muted font-mono">{sc.role} Commander</span>
                </div>
                <Badge variant={sc.accuracy >= 70 ? 'success' : 'warning'}>
                  {sc.accuracy}% ACCURACY
                </Badge>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono bg-surface-2 p-2 rounded-control">
                <div>
                  <span className="text-muted block text-[10px]">DECISIONS</span>
                  <span className="font-bold text-fg">{sc.decisions}</span>
                </div>
                <div>
                  <span className="text-muted block text-[10px]">BRIER ERROR</span>
                  <span className="font-bold text-primary">{sc.calibration_error.toFixed(3)}</span>
                </div>
                <div>
                  <span className="text-muted block text-[10px]">FALLBACK</span>
                  <span className="font-bold text-fg">{sc.used_fallback_comms}</span>
                </div>
              </div>

              {/* Calibration Mini Chart */}
              {sc.calibration_curve && sc.calibration_curve.length > 0 && (
                <div className="h-32 w-full pt-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sc.calibration_curve}>
                      <XAxis dataKey="bin" tick={{ fontSize: 9 }} />
                      <YAxis tick={{ fontSize: 9 }} domain={[0, 100]} />
                      <Tooltip />
                      <Bar dataKey="expected_confidence" name="Expected (%)" fill="var(--color-primary)" />
                      <Bar dataKey="actual_accuracy" name="Actual (%)" fill="var(--color-accent)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>

      {/* Replay Map & Scrubber */}
      <Card className="p-4 space-y-3 no-print">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-fg">Tactical Timeline Replay Scrubber</h3>
            <p className="text-xs text-muted">
              Scrub through the exercise timeline to visualize when reports arrived and where corruption shifted coordinates.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsPlaying(!isPlaying)}
              className="gap-1.5"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              {isPlaying ? 'Pause' : 'Play'}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setCurrentTimeSec(0)}
              title="Reset to 0s"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </Button>
            <Select
              value={String(playbackSpeed)}
              onChange={(e: any) => setPlaybackSpeed(Number(e.target.value))}
              className="w-20 text-xs py-1"
              options={[
                { value: '1', label: '1x' },
                { value: '2', label: '2x' },
                { value: '5', label: '5x' },
              ]}
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="range"
            min="0"
            max={Math.max(1, aar.duration_sec)}
            step="1"
            value={currentTimeSec}
            onChange={(e) => setCurrentTimeSec(Number(e.target.value))}
            className="w-full accent-primary h-2 bg-border rounded-lg appearance-none cursor-pointer"
          />
          <span className="font-mono text-xs font-bold text-primary shrink-0 w-16 text-right">
            +{currentTimeSec}s / +{Math.round(aar.duration_sec)}s
          </span>
        </div>

        <div className="h-72 w-full mt-2">
          <TacticalMap reports={activeReplayReports} isInstructor={true} className="h-full w-full" />
        </div>
      </Card>

      {/* Vertical 2-Column Timeline: What Was True vs What Each Trainee Saw */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-fg">
          Chronological Audit: Ground Truth vs Perceived Intelligence
        </h3>

        <div className="space-y-4">
          {aar.truth_events.map((te) => {
            const correspondingReports = aar.reports.filter((r) => r.truth_event === te.id);
            const correspondingDecisions = aar.decisions.filter((d) => d.truth_event === te.id);

            return (
              <Card key={te.id} className="p-4 space-y-3">
                {/* Event Header */}
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-chip bg-primary/10 text-primary border border-primary/20">
                      +{Math.round(te.t_sec)}s
                    </span>
                    <h4 className="text-sm font-semibold text-fg">
                      {te.payload.title || te.kind}
                    </h4>
                  </div>
                  <span className="text-xs font-mono text-muted">
                    Source: {te.source_role}
                  </span>
                </div>

                {/* Side-by-side: Truth vs Perceived */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left: What Was True */}
                  <div className="p-3 rounded-control bg-surface-2/60 border border-border space-y-2">
                    <span className="text-[11px] font-semibold text-primary uppercase font-mono block">
                      Ground Truth (Actual Reality)
                    </span>
                    <p className="text-xs text-fg leading-relaxed">
                      {te.payload.detail || 'Standard tactical telemetry.'}
                    </p>
                    <div className="text-[10px] font-mono text-muted space-y-0.5 pt-1 border-t border-border/50">
                      <div>Coordinates: {te.payload.lat}N, {te.payload.lon}E</div>
                      {te.payload.expected_actions && (
                        <div>Expected Doctrine Actions: {te.payload.expected_actions.join(', ')}</div>
                      )}
                    </div>
                  </div>

                  {/* Right: What Each Trainee Saw */}
                  <div className="p-3 rounded-control bg-surface-2/60 border border-border space-y-2">
                    <span className="text-[11px] font-semibold text-accent uppercase font-mono block">
                      What Trainees Perceived (Degraded Feed)
                    </span>

                    {correspondingReports.length === 0 ? (
                      <p className="text-xs text-danger italic">
                        All transmissions dropped or blocked by EW jamming / severed link.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {correspondingReports.map((rep) => (
                          <div key={rep.id} className="p-2 rounded-control bg-surface border border-border text-xs space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-fg">{rep.participant_role}</span>
                              <div className="flex items-center gap-1.5">
                                <Badge size="sm" variant={rep.status === 'DROPPED' ? 'danger' : 'default'}>
                                  {rep.status}
                                </Badge>
                                <Badge size="sm" variant={rep.origin === 'CONFLICT' ? 'warning' : rep.origin === 'SPOOFED' ? 'danger' : 'info'}>
                                  {rep.origin}
                                </Badge>
                              </div>
                            </div>
                            <div className="text-[11px] text-muted">
                              {rep.payload.title} — {rep.payload.detail}
                            </div>
                            <div className="flex items-center justify-between text-[10px] font-mono text-muted pt-1">
                              <span>Delay: {rep.delay_sec}s</span>
                              <span>{rep.is_corrupted ? 'CORRUPTED (Shifted GPS)' : 'Intact'}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Subordinate decisions logged */}
                {correspondingDecisions.length > 0 && (
                  <div className="p-2 rounded-control bg-surface border border-border/80">
                    <span className="text-[10px] font-mono uppercase text-muted block mb-1">
                      Trainee Orders In Response:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {correspondingDecisions.map((dec) => (
                        <div key={dec.id} className="text-xs font-mono px-2 py-1 rounded-control bg-surface-2 border border-border flex items-center gap-1.5">
                          <span className="font-semibold text-fg">{dec.participant_role}:</span>
                          <span className="text-primary">{dec.action_type}</span>
                          <span className="text-muted">({Math.round(dec.self_confidence * 100)}% conf, {dec.latency_sec}s lag)</span>
                          {dec.correct !== null && (
                            <span className={dec.correct ? 'text-success' : 'text-danger'}>
                              {dec.correct ? '✓' : '✗'}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};
