import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { useToast } from '../../components/ui/Toast.js';
import { Button } from '../../components/ui/Button.js';
import { Input } from '../../components/ui/Input.js';
import { Select } from '../../components/ui/Input.js';
import { Card } from '../../components/ui/Card.js';
import { Badge } from '../../components/ui/Badge.js';
import { SignalBars } from '../../components/ui/SignalBars.js';
import { TacticalMap } from '../../components/map/TacticalMap.js';
import { CommsFeed } from './CommsFeed.js';
import { DecisionPanel } from './DecisionPanel.js';
import { TraineeScorecardView } from './TraineeScorecardView.js';
import { RealtimeClient, TraineeReport, Scorecard, ActionType } from '@degrade/shared';
import { Radio, Users, Clock, Shield, AlertTriangle, Wifi, WifiOff, RefreshCw } from 'lucide-react';

const WS_BASE_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';

export const TraineePage: React.FC = () => {
  const { user, api, tokens } = useAuth();
  const { toast } = useToast();

  // Exercise Session State
  const [exerciseId, setExerciseId] = useState<number | null>(() => {
    const saved = localStorage.getItem('degrade-active-exercise-id');
    return saved ? Number(saved) : null;
  });
  const [exerciseStatus, setExerciseStatus] = useState<string>('LOBBY');
  const [scenarioTitle, setScenarioTitle] = useState<string>('');
  const [myRole, setMyRole] = useState<string>(() => {
    return localStorage.getItem('degrade-my-role') || 'LAND';
  });

  // Join Modal State
  const [joinCode, setJoinCode] = useState<string>('');
  const [isJoining, setIsJoining] = useState<boolean>(false);

  // Live Tactical State
  const [elapsedSec, setElapsedSec] = useState<number>(0);
  const [signalBars, setSignalBars] = useState<number>(4);
  const [linkQuality, setLinkQuality] = useState<number>(1.0);
  const [connectionState, setConnectionState] = useState<string>('connected');
  const [reports, setReports] = useState<TraineeReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<TraineeReport | null>(null);
  const [myPosition, setMyPosition] = useState<{ lat: number; lon: number } | null>(null);
  const [scorecard, setScorecard] = useState<Scorecard | null>(null);

  const realtimeRef = useRef<RealtimeClient | null>(null);

  // Timer tick for elapsed duration
  useEffect(() => {
    let timer: any;
    if (exerciseStatus === 'RUNNING') {
      timer = setInterval(() => {
        setElapsedSec((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [exerciseStatus]);

  // Connect Realtime WebSocket Client with Polling Fallback
  useEffect(() => {
    if (!exerciseId || !tokens.access) return;

    const pollFallback = async () => {
      try {
        const feed = await api.getTraineeFeed(exerciseId);
        setExerciseStatus(feed.status);
        setElapsedSec(feed.elapsed_sec);
        setSignalBars(feed.bars);
        setLinkQuality(feed.quality);
        setReports(feed.reports);
      } catch (_) {}
    };

    const client = new RealtimeClient({
      wsUrl: WS_BASE_URL,
      exerciseId: exerciseId,
      getToken: () => tokens.access,
      pollFallbackFn: pollFallback,
      onReport: (newReport) => {
        setReports((prev) => {
          if (prev.some((r) => r.id === newReport.id)) return prev;
          return [newReport, ...prev];
        });
        toast(`New Report: ${newReport.payload.title}`, 'info');
      },
      onLinkStatus: (data) => {
        setSignalBars(data.bars);
        setLinkQuality(data.quality);
        setExerciseStatus(data.status);
      },
      onConnectionChange: (state) => {
        setConnectionState(state);
      },
    });

    realtimeRef.current = client;
    client.connect();

    // Initial feed fetch
    pollFallback();

    return () => {
      client.disconnect();
      realtimeRef.current = null;
    };
  }, [exerciseId, tokens.access]);

  // Check for scorecard when exercise ENDS
  useEffect(() => {
    if (exerciseStatus === 'ENDED' && exerciseId) {
      api.getScorecard(exerciseId)
        .then((data) => {
          setScorecard(data);
        })
        .catch(() => {});
    }
  }, [exerciseStatus, exerciseId]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode) return;
    setIsJoining(true);

    try {
      const res = await api.joinExercise(joinCode, myRole);
      setExerciseId(res.exercise_id);
      setExerciseStatus(res.status);
      setScenarioTitle(res.scenario_title);
      localStorage.setItem('degrade-active-exercise-id', String(res.exercise_id));
      localStorage.setItem('degrade-my-role', myRole);
      toast('Successfully joined exercise station!', 'success');
    } catch (err: any) {
      toast(err.message || 'Failed to join exercise. Check code.', 'danger');
    } finally {
      setIsJoining(false);
    }
  };

  const handleSetPosition = async (coords: { lat: number; lon: number }) => {
    setMyPosition(coords);
    if (realtimeRef.current) {
      realtimeRef.current.sendPosition(coords.lat, coords.lon);
    }
    if (exerciseId) {
      try {
        await api.setPosition(exerciseId, coords.lat, coords.lon);
        toast(`Station Coordinates Updated: ${coords.lat}N, ${coords.lon}E`, 'info');
      } catch (_) {}
    }
  };

  const handleSubmitDecision = async (decisionData: {
    action_type: ActionType;
    self_confidence: number;
    truth_event?: number;
    details?: Record<string, any>;
  }) => {
    if (!exerciseId) return;
    try {
      await api.submitDecision(exerciseId, decisionData);
      toast(`Order Logged: ${decisionData.action_type}`, 'success');
      setSelectedReport(null);
    } catch (err: any) {
      toast(err.message || 'Failed to transmit order.', 'danger');
    }
  };

  const handleLeaveExercise = () => {
    localStorage.removeItem('degrade-active-exercise-id');
    setExerciseId(null);
    setExerciseStatus('LOBBY');
    setReports([]);
    setScorecard(null);
  };

  const formatElapsed = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // 1. If not in an exercise, show Join Console
  if (!exerciseId) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-6 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
              <Radio className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-semibold text-fg">Join Simulation Exercise</h2>
            <p className="text-xs text-muted">
              Enter the 6-character room code provided by your tactical instructor.
            </p>
          </div>

          <form onSubmit={handleJoin} className="space-y-4">
            <Input
              label="Exercise Join Code"
              placeholder="e.g. A9B2X7"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              className="font-mono text-center tracking-widest text-lg uppercase"
              maxLength={8}
              required
            />

            <Select
              label="Assigned Domain Role"
              value={myRole}
              onChange={(e) => setMyRole(e.target.value)}
              options={[
                { value: 'LAND', label: 'Land Component Commander (LAND)' },
                { value: 'AIR', label: 'Air Component Commander (AIR)' },
                { value: 'CYBER', label: 'Cyber Operations Cell (CYBER)' },
                { value: 'EW', label: 'Electronic Warfare Detachment (EW)' },
              ]}
            />

            <Button type="submit" variant="primary" className="w-full" isLoading={isJoining}>
              Enter Simulation Station
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  // 2. If Exercise Ended and scorecard available, show Scorecard View
  if (exerciseStatus === 'ENDED' && scorecard) {
    return (
      <TraineeScorecardView
        scorecard={scorecard}
        scenarioTitle={scenarioTitle}
        onExit={handleLeaveExercise}
      />
    );
  }

  // 3. If in LOBBY state, show waiting room
  if (exerciseStatus === 'LOBBY') {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 text-center space-y-6">
          <div className="w-12 h-12 rounded-full bg-warning/15 text-warning flex items-center justify-center mx-auto animate-pulse">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-muted">
              STATION CONNECTED • ROLE: {myRole}
            </span>
            <h2 className="text-xl font-semibold text-fg mt-1">Lobby: Waiting for Instructor</h2>
            <p className="text-xs text-muted mt-2">
              The exercise coordinator is preparing the tactical scenario. The simulation will engage automatically once launched.
            </p>
          </div>
          <div className="p-3 rounded-control bg-surface-2 border border-border text-xs font-mono text-muted flex items-center justify-center gap-2">
            <Radio className="w-3.5 h-3.5 text-primary animate-pulse" />
            <span>Telemetry Link: ONLINE</span>
          </div>
          <Button variant="outline" size="sm" onClick={handleLeaveExercise}>
            Cancel & Change Station
          </Button>
        </Card>
      </div>
    );
  }

  // 4. Exercise is RUNNING / PAUSED: Full Tactical Screen
  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden">
      {/* Top Status Strip */}
      <div className="h-11 px-4 border-b border-border bg-surface flex items-center justify-between text-xs shrink-0">
        <div className="flex items-center gap-4">
          <Badge variant={exerciseStatus === 'RUNNING' ? 'success' : 'warning'}>
            {exerciseStatus}
          </Badge>
          <div className="font-mono text-fg font-semibold flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-muted" />
            <span>T+{formatElapsed(elapsedSec)}</span>
          </div>
          <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-border text-muted">
            <span>Role:</span>
            <span className="font-mono font-medium text-fg">{myRole}</span>
          </div>
        </div>

        {/* Center: Signal Bars & Comms Status */}
        <div className="flex items-center gap-3">
          <SignalBars bars={signalBars} quality={linkQuality} />

          {connectionState !== 'connected' && (
            <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-chip text-[10px] font-mono bg-warning/15 text-warning border border-warning/30">
              <RefreshCw className="w-2.5 h-2.5 animate-spin" />
              {connectionState === 'fallback_polling' ? 'FALLBACK POLLING' : 'RECONNECTING'}
            </span>
          )}
        </div>

        {/* Right: Station Options */}
        <div className="flex items-center gap-2">
          <span className="hidden lg:inline text-[11px] text-muted italic">
            Click map to deploy unit GPS
          </span>
          <Button variant="ghost" size="sm" onClick={handleLeaveExercise} className="text-xs">
            Disconnect
          </Button>
        </div>
      </div>

      {/* Main Tactical Screen: Map (Center) + Feed (Side) */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Center: Map & Decision Panel */}
        <div className="flex-1 flex flex-col h-full overflow-hidden p-3 gap-3">
          <div className="flex-1 relative min-h-0">
            <TacticalMap
              reports={reports}
              myPosition={myPosition}
              selectedReportId={selectedReport?.id}
              onSelectReport={(r) => setSelectedReport(r)}
              onMapClick={handleSetPosition}
              className="h-full w-full"
            />
          </div>

          {/* Bottom Tactical Decision Panel */}
          <div className="shrink-0">
            <DecisionPanel
              selectedReport={selectedReport}
              onClearSelectedReport={() => setSelectedReport(null)}
              onSubmitDecision={handleSubmitDecision}
              disabled={exerciseStatus !== 'RUNNING'}
            />
          </div>
        </div>

        {/* Side: Comms Feed */}
        <div className="w-full lg:w-96 shrink-0 h-72 lg:h-full border-t lg:border-t-0">
          <CommsFeed
            reports={reports}
            selectedReportId={selectedReport?.id}
            onSelectReport={(r) => setSelectedReport(r)}
            className="h-full"
          />
        </div>
      </div>
    </div>
  );
};
