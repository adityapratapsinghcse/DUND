import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import { useToast } from '../../components/ui/Toast.js';
import { Button } from '../../components/ui/Button.js';
import { Card } from '../../components/ui/Card.js';
import { Badge } from '../../components/ui/Badge.js';
import { Input, Select } from '../../components/ui/Input.js';
import { SignalBars } from '../../components/ui/SignalBars.js';
import { TacticalMap } from '../../components/map/TacticalMap.js';
import { RealtimeClient, TruthEvent, Decision, Participant, CommLink, JammingZone, TraineeReport } from '@degrade/shared';
import {
  Play, Pause, Square, Radio, Users, Clock, Zap, ShieldAlert,
  Send, Plus, RefreshCw, BarChart2, Layers, Wifi, WifiOff
} from 'lucide-react';

const WS_BASE_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';

export const ControlRoom: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const exerciseId = Number(id);
  const { api, tokens } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Monitor State
  const [exerciseStatus, setExerciseStatus] = useState<string>('LOBBY');
  const [elapsedSec, setElapsedSec] = useState<number>(0);
  const [intensity, setIntensity] = useState<number>(0.35);
  const [joinCode, setJoinCode] = useState<string>('');
  const [scenarioTitle, setScenarioTitle] = useState<string>('');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [links, setLinks] = useState<CommLink[]>([]);
  const [jammingZones, setJammingZones] = useState<JammingZone[]>([]);
  const [truthEvents, setTruthEvents] = useState<TruthEvent[]>([]);
  const [reports, setReports] = useState<TraineeReport[]>([]);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // View Layer Mode: "GROUND_TRUTH" vs specific trainee perceived view
  const [viewLayer, setViewLayer] = useState<string>('GROUND_TRUTH');

  // Inject Form State
  const [injectType, setInjectType] = useState<string>('TRUTH_EVENT');
  const [injectTitle, setInjectTitle] = useState<string>('');
  const [injectDetail, setInjectDetail] = useState<string>('');
  const [injectLat, setInjectLat] = useState<number>(25.4358);
  const [injectLon, setInjectLon] = useState<number>(81.8463);
  const [injectTargetRole, setInjectTargetRole] = useState<string>('LAND');
  const [isInjecting, setIsInjecting] = useState<boolean>(false);

  // Realtime WS Client
  const realtimeRef = useRef<RealtimeClient | null>(null);

  // Poll monitor snapshot every 2.5s for sync
  const fetchMonitor = async () => {
    if (!exerciseId) return;
    try {
      const data = await api.getExerciseMonitor(exerciseId);
      setExerciseStatus(data.status);
      setElapsedSec(data.elapsed_sec);
      setIntensity(data.intensity);
      setParticipants(data.participants);
      setLinks(data.links);
      setJammingZones(data.jamming_zones);
      setTruthEvents(data.truth_events);
      setReports(data.reports);
      setDecisions(data.decisions);
    } catch (_) {}
  };

  useEffect(() => {
    api.getExercise(exerciseId)
      .then((ex) => {
        setJoinCode(ex.join_code);
        setScenarioTitle(typeof ex.scenario === 'object' ? ex.scenario.title : (ex.scenario_title || ''));
        return fetchMonitor();
      })
      .finally(() => setIsLoading(false));

    const pollInterval = setInterval(fetchMonitor, 2500);

    // Setup Realtime WS Client for instant push
    if (tokens.access) {
      const client = new RealtimeClient({
        wsUrl: WS_BASE_URL,
        exerciseId: exerciseId,
        getToken: () => tokens.access,
        onTruthEvent: (ev) => setTruthEvents((prev) => [ev, ...prev]),
        onDecision: (dec) => {
          setDecisions((prev) => [dec, ...prev]);
          toast(`Trainee Decision: ${dec.participant_role} - ${dec.action_type}`, 'info');
        },
        onParticipantJoined: (p) => {
          setParticipants((prev) => [...prev.filter(x => x.id !== p.id), p]);
          toast(`Participant Joined: ${p.role} (${p.username})`, 'success');
        },
      });
      realtimeRef.current = client;
      client.connect();
    }

    return () => {
      clearInterval(pollInterval);
      realtimeRef.current?.disconnect();
    };
  }, [exerciseId, tokens.access]);

  // Elapsed clock timer when RUNNING
  useEffect(() => {
    let t: any;
    if (exerciseStatus === 'RUNNING') {
      t = setInterval(() => setElapsedSec((s) => s + 1), 1000);
    }
    return () => clearInterval(t);
  }, [exerciseStatus]);

  // Exercise Lifecycle Controls
  const handleStart = async () => {
    const res = await api.startExercise(exerciseId);
    setExerciseStatus(res.status);
    toast('Exercise Started!', 'success');
  };

  const handlePause = async () => {
    const res = await api.pauseExercise(exerciseId);
    setExerciseStatus(res.status);
    toast('Exercise Paused', 'warning');
  };

  const handleResume = async () => {
    const res = await api.resumeExercise(exerciseId);
    setExerciseStatus(res.status);
    toast('Exercise Resumed', 'success');
  };

  const handleEnd = async () => {
    if (window.confirm('Are you sure you want to conclude this exercise and proceed to After-Action Review?')) {
      const res = await api.endExercise(exerciseId);
      setExerciseStatus(res.status);
      toast('Exercise Concluded. Reviewing AAR...', 'info');
      navigate(`/instructor/exercises/${exerciseId}/aar`);
    }
  };

  const handleIntensityChange = async (newVal: number) => {
    setIntensity(newVal);
    await api.setExerciseIntensity(exerciseId, newVal);
  };

  const handleToggleLink = async (link: CommLink) => {
    await api.updateExerciseLink(exerciseId, {
      source_role: link.source_role,
      target_role: link.target_role,
      is_up: !link.is_up,
      quality: link.quality,
    });
    fetchMonitor();
    toast(`Link ${link.source_role} -> ${link.target_role} is now ${!link.is_up ? 'UP' : 'DOWN'}`, 'info');
  };

  const handleInject = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsInjecting(true);
    try {
      if (injectType === 'TRUTH_EVENT') {
        await api.injectEvent(exerciseId, {
          type: 'TRUTH_EVENT',
          title: injectTitle || 'Tactical Inject Contact',
          detail: injectDetail,
          lat: injectLat,
          lon: injectLon,
          visible_to: [injectTargetRole],
          expected_actions: ['FIRE_SUPPORT', 'MOVE'],
        });
        toast('Ground Truth Event Injected!', 'success');
      } else if (injectType === 'FAKE_REPORT') {
        await api.injectEvent(exerciseId, {
          type: 'FAKE_REPORT',
          target_role: injectTargetRole,
          title: injectTitle || 'INTERCEPTED INTEL SPOOF',
          detail: injectDetail || 'Hostile deception transmission intercepted.',
          lat: injectLat,
          lon: injectLon,
        });
        toast(`Spoofed Report dispatched to ${injectTargetRole}`, 'warning');
      } else if (injectType === 'JAM_ZONE') {
        await api.injectEvent(exerciseId, {
          type: 'JAM_ZONE',
          lat: injectLat,
          lon: injectLon,
          radius_m: 5500,
          intensity: 0.85,
        });
        toast('Jamming Zone Deployed on Sector!', 'warning');
      }

      setInjectTitle('');
      setInjectDetail('');
      fetchMonitor();
    } catch (err: any) {
      toast(err.message || 'Injection failed', 'danger');
    } finally {
      setIsInjecting(false);
    }
  };

  const handleMapClick = (coords: { lat: number; lon: number }) => {
    setInjectLat(coords.lat);
    setInjectLon(coords.lon);
    toast(`Target coordinates set: ${coords.lat}N, ${coords.lon}E`, 'info');
  };

  const formatElapsed = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Filter map reports depending on Layer Switcher
  const displayedReports = viewLayer === 'GROUND_TRUTH'
    ? reports
    : reports.filter((r) => r.participant_role === viewLayer);

  return (
    <div className="flex-1 flex flex-col lg:h-[calc(100vh-3.5rem)] lg:overflow-hidden">
      {/* Top Exercise Command Strip */}
      <div className="h-12 px-4 border-b border-border bg-surface flex items-center justify-between text-xs shrink-0">
        <div className="flex items-center gap-3">
          <span className="font-mono text-base font-bold tracking-widest text-primary px-2.5 py-0.5 rounded-chip bg-primary/10 border border-primary/20">
            ROOM: {joinCode}
          </span>
          <Badge variant={exerciseStatus === 'RUNNING' ? 'success' : exerciseStatus === 'PAUSED' ? 'warning' : 'default'}>
            {exerciseStatus}
          </Badge>
          <div className="font-mono text-fg font-semibold flex items-center gap-1.5 pl-2 border-l border-border">
            <Clock className="w-3.5 h-3.5 text-muted" />
            <span>T+{formatElapsed(elapsedSec)}</span>
          </div>
          <span className="hidden md:inline text-muted font-medium truncate max-w-xs">
            {scenarioTitle}
          </span>
        </div>

        {/* Playback Controls & AAR */}
        <div className="flex items-center gap-2">
          {exerciseStatus === 'LOBBY' && (
            <Button size="sm" variant="primary" onClick={handleStart} className="gap-1.5">
              <Play className="w-3.5 h-3.5" /> Start Exercise
            </Button>
          )}
          {exerciseStatus === 'RUNNING' && (
            <Button size="sm" variant="outline" onClick={handlePause} className="gap-1.5">
              <Pause className="w-3.5 h-3.5" /> Pause
            </Button>
          )}
          {exerciseStatus === 'PAUSED' && (
            <Button size="sm" variant="primary" onClick={handleResume} className="gap-1.5">
              <Play className="w-3.5 h-3.5" /> Resume
            </Button>
          )}
          {exerciseStatus !== 'ENDED' && (
            <Button size="sm" variant="danger" onClick={handleEnd} className="gap-1.5">
              <Square className="w-3.5 h-3.5" /> End & Review
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate(`/instructor/exercises/${exerciseId}/aar`)}
            className="gap-1.5"
          >
            <BarChart2 className="w-3.5 h-3.5" /> AAR
          </Button>
        </div>
      </div>

      {/* Lobby Guidance Banner */}
      {exerciseStatus === 'LOBBY' && (
        <div className="bg-primary/10 border-b border-primary/20 px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs text-primary shrink-0">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 animate-pulse shrink-0" />
            <span>
              <strong>Simulation Standing By:</strong> Trainees can join using room code <strong className="font-mono text-fg bg-surface px-1.5 py-0.5 rounded border border-border">{joinCode}</strong> (or via <strong>1-Click Join</strong> on their screen). When ready, click <strong>"Start Exercise"</strong>!
            </span>
          </div>
          <Button size="sm" variant="primary" onClick={handleStart} className="gap-1.5 shrink-0">
            <Play className="w-3.5 h-3.5" /> Start Exercise Now
          </Button>
        </div>
      )}

      {/* 3-Column Main Area */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-2 p-2 lg:overflow-hidden">
        {/* Left Column: Comms Matrix & Participants (3 Cols) */}
        <div className="lg:col-span-3 flex flex-col gap-2 lg:overflow-y-auto">
          {/* Contestation Intensity Slider */}
          <Card className="p-3 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span>Global Intensity:</span>
              <span className="font-mono text-accent">{Math.round(intensity * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={intensity}
              onChange={(e) => handleIntensityChange(Number(e.target.value))}
              className="w-full accent-primary h-1.5 bg-border rounded-lg appearance-none cursor-pointer"
            />
          </Card>

          {/* Participants with Live Signal Bars */}
          <Card className="p-3 space-y-2 flex-1">
            <div className="flex items-center justify-between border-b border-border pb-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-fg flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-primary" /> Trainees ({participants.length})
              </span>
            </div>
            <div className="space-y-1.5 overflow-y-auto max-h-52">
              {participants.length === 0 ? (
                <p className="text-xs text-muted py-3 text-center italic">No trainees connected yet.</p>
              ) : (
                participants.map((p) => (
                  <div key={p.id} className="p-2 rounded-control bg-surface-2 border border-border flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold text-fg flex items-center gap-1.5">
                        <Badge size="sm" variant="primary">{p.role}</Badge>
                        <span>{p.username}</span>
                      </div>
                      <div className="text-[10px] text-muted font-mono mt-0.5">
                        {p.lat && p.lon ? `${p.lat.toFixed(2)}N, ${p.lon.toFixed(2)}E` : 'GPS Unset'}
                      </div>
                    </div>
                    <SignalBars bars={p.signal_bars || 4} quality={p.link_quality} showLabel={false} />
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Comm Links Matrix */}
          <Card className="p-3 space-y-2">
            <div className="flex items-center justify-between border-b border-border pb-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-fg flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-primary" /> Comms Links Matrix
              </span>
            </div>
            <div className="space-y-1 overflow-y-auto max-h-48 text-xs font-mono">
              {links.map((link) => (
                <div key={link.id} className="flex items-center justify-between p-1.5 rounded-control bg-surface-2/60 border border-border/60">
                  <span className="text-fg truncate">{link.source_role} → {link.target_role}</span>
                  <button
                    onClick={() => handleToggleLink(link)}
                    className={`px-2 py-0.5 rounded-chip text-[10px] font-semibold transition-colors ${
                      link.is_up ? 'bg-success/15 text-success hover:bg-success/25' : 'bg-danger/15 text-danger hover:bg-danger/25'
                    }`}
                  >
                    {link.is_up ? 'ONLINE' : 'DOWN'}
                  </button>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Center Column: Tactical Map with Layer Switcher (6 Cols) */}
        <div className="lg:col-span-6 flex flex-col gap-2 h-full min-h-[400px]">
          {/* Layer switcher bar */}
          <div className="px-3 py-1.5 rounded-card bg-surface border border-border flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-primary" />
              <span className="font-medium text-fg">Layer Projection:</span>
            </div>
            <div className="flex items-center gap-1 font-mono">
              <button
                onClick={() => setViewLayer('GROUND_TRUTH')}
                className={`px-2.5 py-1 rounded-control transition-colors ${
                  viewLayer === 'GROUND_TRUTH' ? 'bg-primary text-primary-fg font-semibold' : 'bg-surface-2 text-muted hover:text-fg'
                }`}
              >
                Ground Truth
              </button>
              {participants.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setViewLayer(p.role)}
                  className={`px-2 py-1 rounded-control transition-colors ${
                    viewLayer === p.role ? 'bg-primary text-primary-fg font-semibold' : 'bg-surface-2 text-muted hover:text-fg'
                  }`}
                >
                  What {p.role} Sees
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 relative min-h-0">
            <TacticalMap
              reports={displayedReports}
              jammingZones={jammingZones}
              participants={participants}
              isInstructor={true}
              onMapClick={handleMapClick}
              className="h-full w-full"
            />
          </div>
        </div>

        {/* Right Column: Injects & Live Decisions (3 Cols) */}
        <div className="lg:col-span-3 flex flex-col gap-2 lg:overflow-y-auto">
          {/* Dynamic Inject Panel */}
          <Card className="p-3 space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-fg flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-accent" /> Live Inject Panel
              </span>
            </div>

            <form onSubmit={handleInject} className="space-y-2.5">
              <Select
                label="Inject Type"
                value={injectType}
                onChange={(e) => setInjectType(e.target.value)}
                options={[
                  { value: 'TRUTH_EVENT', label: 'Ground Truth Event' },
                  { value: 'FAKE_REPORT', label: 'Spoofed / Deception Report' },
                  { value: 'JAM_ZONE', label: 'Electromagnetic Jamming Zone' },
                ]}
              />

              <Input
                label="Transmission Title"
                placeholder="e.g. Hostile Armor Breakthrough"
                value={injectTitle}
                onChange={(e) => setInjectTitle(e.target.value)}
              />

              {injectType !== 'JAM_ZONE' && (
                <>
                  <Input
                    label="Intelligence Detail"
                    placeholder="Payload remarks / intercept details..."
                    value={injectDetail}
                    onChange={(e) => setInjectDetail(e.target.value)}
                  />
                  <Select
                    label="Audience Role"
                    value={injectTargetRole}
                    onChange={(e) => setInjectTargetRole(e.target.value)}
                    options={[
                      { value: 'LAND', label: 'LAND Component' },
                      { value: 'AIR', label: 'AIR Component' },
                      { value: 'CYBER', label: 'CYBER Cell' },
                    ]}
                  />
                </>
              )}

              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div>
                  <span className="text-[10px] text-muted">LAT:</span>
                  <input
                    type="number"
                    step="0.001"
                    value={injectLat}
                    onChange={(e) => setInjectLat(Number(e.target.value))}
                    className="w-full bg-surface-2 border border-border px-1.5 py-1 rounded-control text-xs"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-muted">LON:</span>
                  <input
                    type="number"
                    step="0.001"
                    value={injectLon}
                    onChange={(e) => setInjectLon(Number(e.target.value))}
                    className="w-full bg-surface-2 border border-border px-1.5 py-1 rounded-control text-xs"
                  />
                </div>
              </div>

              <Button type="submit" variant="primary" size="sm" className="w-full gap-1.5" isLoading={isInjecting}>
                <Send className="w-3.5 h-3.5" /> Transmit Inject
              </Button>
            </form>
          </Card>

          {/* Realtime Decisions Feed */}
          <Card className="p-3 space-y-2 flex-1">
            <div className="flex items-center justify-between border-b border-border pb-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-fg flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-primary" /> Live Decisions ({decisions.length})
              </span>
            </div>
            <div className="space-y-2 overflow-y-auto max-h-56">
              {decisions.length === 0 ? (
                <p className="text-xs text-muted py-4 text-center italic">No trainee decisions logged yet.</p>
              ) : (
                decisions.map((d) => (
                  <div key={d.id} className="p-2 rounded-control bg-surface-2 border border-border text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-fg">{d.participant_role}</span>
                      <Badge size="sm" variant={d.correct ? 'success' : d.correct === false ? 'danger' : 'default'}>
                        {d.action_type}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-muted font-mono">
                      <span>Conf: {Math.round(d.self_confidence * 100)}%</span>
                      <span>Latency: {d.latency_sec}s</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Bottom Timeline Strip */}
      <div className="h-16 px-4 border-t border-border bg-surface flex items-center gap-4 overflow-x-auto shrink-0 text-xs font-mono">
        <span className="text-muted font-semibold uppercase shrink-0 text-[11px]">TIMELINE STRIP:</span>
        {truthEvents.map((te) => (
          <div key={te.id} className="p-1.5 px-2.5 rounded-control bg-surface-2 border border-border shrink-0 flex items-center gap-2">
            <span className="text-primary font-bold">+{Math.round(te.t_sec)}s</span>
            <span className="text-fg">{te.payload.title || te.kind}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
