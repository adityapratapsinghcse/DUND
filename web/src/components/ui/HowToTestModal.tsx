import React, { useState } from 'react';
import { Modal } from './Modal.js';
import { Button } from './Button.js';
import { Badge } from './Badge.js';
import { Card } from './Card.js';
import { Tabs } from './Tabs.js';
import { useAuth } from '../../context/AuthContext.js';
import {
  Play, Radio, Shield, Users, CheckCircle2,
  Terminal, ArrowRight, Zap, Eye, AlertTriangle, KeyRound
} from 'lucide-react';

interface HowToTestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HowToTestModal: React.FC<HowToTestModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'flow' | 'roles' | 'commands'>('flow');
  const { login, api } = useAuth();

  const handleQuickLogin = async (username: string, pass: string) => {
    try {
      const tokens = await api.login({ username, password: pass });
      login(tokens);
      onClose();
      if (tokens.user.role === 'INSTRUCTOR') window.location.href = '/instructor';
      else if (tokens.user.role === 'ADMIN') window.location.href = '/admin';
      else window.location.href = '/play';
    } catch (_) {}
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="DHUND — Tactical Simulation & Testing Guide"
      maxWidth="xl"
    >
      <div className="space-y-4 text-xs">
        {/* Navigation Tabs */}
        <div className="flex border-b border-border pb-2 gap-2 font-medium">
          <button
            onClick={() => setActiveTab('flow')}
            className={`px-3 py-1.5 rounded-control transition-colors ${
              activeTab === 'flow'
                ? 'bg-primary text-white'
                : 'text-muted hover:text-fg hover:bg-surface-2'
            }`}
          >
            🎬 3-Minute Test Walkthrough
          </button>
          <button
            onClick={() => setActiveTab('roles')}
            className={`px-3 py-1.5 rounded-control transition-colors ${
              activeTab === 'roles'
                ? 'bg-primary text-white'
                : 'text-muted hover:text-fg hover:bg-surface-2'
            }`}
          >
            👥 Roles & 1-Click Switch
          </button>
          <button
            onClick={() => setActiveTab('commands')}
            className={`px-3 py-1.5 rounded-control transition-colors ${
              activeTab === 'commands'
                ? 'bg-primary text-white'
                : 'text-muted hover:text-fg hover:bg-surface-2'
            }`}
          >
            💻 Server Commands
          </button>
        </div>

        {/* Tab 1: Step by Step Flow */}
        {activeTab === 'flow' && (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            <div className="p-3 rounded-card bg-primary/10 border border-primary/20 text-primary">
              <span className="font-semibold block text-sm">How To Test in 2 Browser Windows:</span>
              Open Window A (Normal) as <strong>Instructor</strong> and Window B (Incognito) as <strong>Trainee</strong>.
            </div>

            <div className="space-y-2.5">
              <div className="p-3 rounded-card bg-surface border border-border space-y-1">
                <div className="flex items-center gap-2 font-semibold text-fg">
                  <Badge variant="primary">Step 1</Badge>
                  <span>Instructor Launches Session</span>
                </div>
                <p className="text-muted leading-relaxed">
                  Log in as <code>instructor</code> at <code>/instructor</code>. Click <strong>"New Exercise Session"</strong>, select <strong>"Operation Dhundh – Border Sector"</strong>, and click <strong>"Launch Session"</strong>. Notice the 6-character room code (e.g. <code>DHN404</code>).
                </p>
              </div>

              <div className="p-3 rounded-card bg-surface border border-border space-y-1">
                <div className="flex items-center gap-2 font-semibold text-fg">
                  <Badge variant="primary">Step 2</Badge>
                  <span>Trainee Joins via 1-Click Quick Join</span>
                </div>
                <p className="text-muted leading-relaxed">
                  In Window B (Incognito), log in as <code>land1</code> at <code>/play</code>. Under <strong>Active Simulation Sessions</strong>, click <strong>"Quick Join"</strong> (or type the code). The station enters the <strong>Lobby</strong> and connects via real-time WebSocket.
                </p>
              </div>

              <div className="p-3 rounded-card bg-surface border border-border space-y-1">
                <div className="flex items-center gap-2 font-semibold text-fg">
                  <Badge variant="success">Step 3</Badge>
                  <span>Instructor Clicks "Start Exercise"</span>
                </div>
                <p className="text-muted leading-relaxed">
                  Back in Window A, click <strong>"Start Exercise"</strong>. The simulation timer engages (<code>T+00:01s</code>). In Window B, the <strong>Tactical Map</strong> immediately activates, radar contacts appear, and telemetry reports begin flowing!
                </p>
              </div>

              <div className="p-3 rounded-card bg-surface border border-border space-y-1">
                <div className="flex items-center gap-2 font-semibold text-fg">
                  <Badge variant="danger">Step 4</Badge>
                  <span>Triggering the Degradation Engine</span>
                </div>
                <p className="text-muted leading-relaxed">
                  In Window A (Instructor), toggle <strong>HQ → LAND</strong> link to <strong>DOWN</strong> or drag <strong>Intensity</strong> up to 80%. In Window B, watch the trainee's <strong>Signal Bars drop to 0</strong>, the red <strong>"COMMS LOST"</strong> banner flash, and radar blips fade into translucent <strong>Ghost Markers</strong>!
                </p>
              </div>

              <div className="p-3 rounded-card bg-surface border border-border space-y-1">
                <div className="flex items-center gap-2 font-semibold text-fg">
                  <Badge variant="warning">Step 5</Badge>
                  <span>Trainee Logs Orders Under Uncertainty</span>
                </div>
                <p className="text-muted leading-relaxed">
                  In Window B, select <strong>Fallback Comms</strong>, <strong>Hold Ground</strong>, or <strong>Request ISR</strong>. Adjust the <strong>Confidence Slider</strong> (e.g. 65%) and click <strong>"Execute Order"</strong>. The instructor sees the decision in real time.
                </p>
              </div>

              <div className="p-3 rounded-card bg-surface border border-border space-y-1">
                <div className="flex items-center gap-2 font-semibold text-fg">
                  <Badge variant="info">Step 6</Badge>
                  <span>End & After-Action Review (AAR)</span>
                </div>
                <p className="text-muted leading-relaxed">
                  Instructor clicks <strong>"End Exercise"</strong>. Review the side-by-side <strong>"Ground Truth vs What Trainee Saw"</strong>, scrub the timeline replay, and view the <strong>Brier Calibration Scorecard</strong>.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Role Switcher */}
        {activeTab === 'roles' && (
          <div className="space-y-3">
            <p className="text-muted">
              Click any profile below to immediately switch accounts in this browser tab:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="p-3 rounded-card bg-surface border border-border flex flex-col justify-between space-y-2">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-fg">Colonel (Instructor)</span>
                    <Badge variant="primary">INSTRUCTOR</Badge>
                  </div>
                  <p className="text-[11px] text-muted mt-1">
                    Launches sessions, injects jamming bubbles, severs comms links, reviews AAR.
                  </p>
                  <span className="font-mono text-[10px] text-muted">User: instructor / instructor123</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleQuickLogin('instructor', 'instructor123')}
                >
                  Switch to Instructor
                </Button>
              </div>

              <div className="p-3 rounded-card bg-surface border border-border flex flex-col justify-between space-y-2">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-fg">Major (Land Trainee)</span>
                    <Badge variant="success">TRAINEE (LAND)</Badge>
                  </div>
                  <p className="text-[11px] text-muted mt-1">
                    Commands ground armor unit, experiences link delays, submits tactical decisions.
                  </p>
                  <span className="font-mono text-[10px] text-muted">User: land1 / trainee123</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleQuickLogin('land1', 'trainee123')}
                >
                  Switch to Land Trainee
                </Button>
              </div>

              <div className="p-3 rounded-card bg-surface border border-border flex flex-col justify-between space-y-2">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-fg">Sqn Ldr (Air Trainee)</span>
                    <Badge variant="info">TRAINEE (AIR)</Badge>
                  </div>
                  <p className="text-[11px] text-muted mt-1">
                    Monitors aerial UAV and radar telemetry under spoofing attacks.
                  </p>
                  <span className="font-mono text-[10px] text-muted">User: air1 / trainee123</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleQuickLogin('air1', 'trainee123')}
                >
                  Switch to Air Trainee
                </Button>
              </div>

              <div className="p-3 rounded-card bg-surface border border-border flex flex-col justify-between space-y-2">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-fg">Brigadier (Admin)</span>
                    <Badge variant="accent">ADMIN</Badge>
                  </div>
                  <p className="text-[11px] text-muted mt-1">
                    System health, user CRUD, audit logs, scenario editor with map picker.
                  </p>
                  <span className="font-mono text-[10px] text-muted">User: admin / admin12345</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleQuickLogin('admin', 'admin12345')}
                >
                  Switch to Admin
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Server Commands */}
        {activeTab === 'commands' && (
          <div className="space-y-3 font-mono text-[11px]">
            <p className="text-muted font-sans text-xs">
              Commands to start servers locally from your VS Code terminal:
            </p>

            <div className="p-3 rounded-card bg-surface-2 border border-border space-y-1">
              <span className="font-sans font-semibold text-fg text-xs block">1-Click Launch (Everything):</span>
              <div className="p-2 rounded bg-bg text-primary select-all">
                .\RUN_DHUND.bat
              </div>
              <span className="font-sans text-[10px] text-muted block">Runs database seed, backend ASGI, web frontend, and opens browser!</span>
            </div>

            <div className="p-3 rounded-card bg-surface-2 border border-border space-y-1">
              <span className="font-sans font-semibold text-fg text-xs block">Terminal 1: Backend ASGI (Daphne):</span>
              <div className="p-2 rounded bg-bg text-fg select-all">
                cd backend ; py -3.11 -m daphne -b 127.0.0.1 -p 8000 degrade.asgi:application
              </div>
            </div>

            <div className="p-3 rounded-card bg-surface-2 border border-border space-y-1">
              <span className="font-sans font-semibold text-fg text-xs block">Terminal 2: Web Client (Vite):</span>
              <div className="p-2 rounded bg-bg text-fg select-all">
                npm --workspace=web run dev
              </div>
            </div>
          </div>
        )}

        <div className="pt-2 border-t border-border flex justify-end">
          <Button variant="primary" size="sm" onClick={onClose}>
            Got it, Let's Test!
          </Button>
        </div>
      </div>
    </Modal>
  );
};
