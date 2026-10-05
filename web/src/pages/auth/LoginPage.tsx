import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import { Button } from '../../components/ui/Button.js';
import { Input } from '../../components/ui/Input.js';
import { useToast } from '../../components/ui/Toast.js';
import { Shield, Radio, KeyRound, Sparkles } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { api, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('instructor');
  const [password, setPassword] = useState('instructor123');
  const [email, setEmail] = useState('');
  const [rank, setRank] = useState('');
  const [unit, setUnit] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const redirectAfterLogin = (role: string) => {
    const from = (location.state as any)?.from?.pathname;
    if (from && from !== '/login') {
      navigate(from, { replace: true });
      return;
    }
    if (role === 'TRAINEE') navigate('/play', { replace: true });
    else if (role === 'INSTRUCTOR') navigate('/instructor', { replace: true });
    else if (role === 'ADMIN') navigate('/admin', { replace: true });
    else navigate('/play', { replace: true });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isRegister) {
        await api.register({
          username,
          password,
          email,
          rank,
          unit,
        });
        toast('Registration successful! Signing you in...', 'success');
        // Auto-login registered trainee
        const tokens = await api.login({ username, password });
        login(tokens);
        redirectAfterLogin('TRAINEE');
      } else {
        const tokens = await api.login({ username, password });
        login(tokens);
        toast(`Welcome back, ${tokens.user.username}`, 'success');
        redirectAfterLogin(tokens.user.role);
      }
    } catch (err: any) {
      toast(err.message || 'Authentication failed. Please verify credentials.', 'danger');
    } finally {
      setIsLoading(false);
    }
  };

  const setDemoCredentials = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setIsRegister(false);
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-bg text-fg">
      {/* Left: Calm Architectural SVG Illustration */}
      <div className="relative flex-1 bg-surface-2 overflow-hidden flex flex-col justify-between p-8 md:p-14 border-b md:border-b-0 md:border-r border-border">
        {/* Topographic Lines & Fading Signal Arcs */}
        <div className="absolute inset-0 opacity-40 pointer-events-none select-none">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-border" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
            {/* Topographic contours */}
            <path d="M-100,200 Q200,80 500,220 T1100,180" fill="none" stroke="currentColor" strokeWidth="1" className="text-primary/20" />
            <path d="M-100,320 Q240,160 520,340 T1100,290" fill="none" stroke="currentColor" strokeWidth="1.2" className="text-primary/30" />
            <path d="M-100,440 Q280,240 560,460 T1100,400" fill="none" stroke="currentColor" strokeWidth="1" className="text-primary/25" />
            <path d="M-100,560 Q320,320 600,580 T1100,520" fill="none" stroke="currentColor" strokeWidth="0.8" className="text-primary/15" />
            {/* Fading signal arcs */}
            <circle cx="35%" cy="45%" r="60" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-primary/40 animate-pulse" />
            <circle cx="35%" cy="45%" r="130" fill="none" stroke="currentColor" strokeWidth="1.2" strokeDasharray="6 4" className="text-primary/30" />
            <circle cx="35%" cy="45%" r="210" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="4 6" className="text-primary/20" />
            <circle cx="35%" cy="45%" r="300" fill="none" stroke="currentColor" strokeWidth="0.8" strokeDasharray="3 8" className="text-primary/10" />
          </svg>
        </div>

        {/* Top Header */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex items-end gap-0.5 h-6 w-5 pb-0.5">
            <span className="w-1 h-2 bg-primary rounded-xs" />
            <span className="w-1 h-3.5 bg-primary rounded-xs" />
            <span className="w-1 h-5 bg-primary/70 rounded-xs" />
            <span className="w-1 h-6 bg-primary/30 rounded-xs" />
          </div>
          <div>
            <span className="font-semibold text-lg tracking-wider text-fg">DHUND</span>
            <span className="hidden sm:inline-block ml-2 text-[10px] font-mono text-muted">
              Decision-making Hub
            </span>
          </div>
        </div>

        {/* Core Problem Narrative */}
        <div className="relative z-10 my-auto py-8 max-w-lg">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-chip bg-primary/10 border border-primary/20 text-primary text-xs font-medium mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            SIH 2026 • PS ID 26248 • Ministry of Defence / DSSC
          </div>
          <h1 className="text-2xl md:text-3xl font-semibold text-fg tracking-tight leading-snug">
            DHUND — Decision-making Hub for Uncertain & Network-Denied Domains
          </h1>
          <p className="mt-3 text-xs md:text-sm text-muted leading-relaxed">
            The server holds the absolute ground truth. Every commander perceives degraded telemetry: delayed reports, electromagnetic jamming, dropped packets, and spoofed relays. Instructors inject disruptions live and evaluate decision calibration.
          </p>

          <div className="mt-6 grid grid-cols-2 gap-3 text-xs font-mono text-muted">
            <div className="p-2.5 rounded-control bg-surface border border-border/80">
              <span className="block text-fg font-semibold">DOMAINS</span>
              Land • Air • Cyber • EW
            </div>
            <div className="p-2.5 rounded-control bg-surface border border-border/80">
              <span className="block text-fg font-semibold">CALIBRATION</span>
              Brier Accuracy Scoring
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="relative z-10 text-xs text-muted/70 font-mono">
          Defence Services Staff College • Tactical Multi-Domain Simulation Platform
        </div>
      </div>

      {/* Right: Authentication Form */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 md:p-12 bg-surface">
        <div className="w-full max-w-sm space-y-5">
          <div>
            <h2 className="text-xl font-semibold text-fg">
              {isRegister ? 'Register Trainee Account' : 'Sign in to DHUND'}
            </h2>
            <p className="mt-1 text-xs text-muted">
              {isRegister
                ? 'Create a trainee profile to join simulation exercises.'
                : 'Enter your tactical credentials or use 1-click demo profiles below.'}
            </p>
          </div>

          {/* Quick Demo Pre-fills */}
          <div className="p-3 rounded-control bg-surface-2 border border-border space-y-2">
            <div className="text-[11px] font-medium text-muted uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <KeyRound className="w-3 h-3 text-primary" /> 1-Click Demo Profiles:
              </span>
              <span className="text-[10px] text-muted">Click to auto-fill</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 text-xs font-mono">
              <button
                type="button"
                onClick={() => setDemoCredentials('instructor', 'instructor123')}
                className="py-1 px-2 rounded-control bg-surface hover:bg-border text-fg text-left border border-border transition-colors truncate"
                title="Tactical Instructor"
              >
                🎖️ Instructor
              </button>
              <button
                type="button"
                onClick={() => setDemoCredentials('land1', 'trainee123')}
                className="py-1 px-2 rounded-control bg-surface hover:bg-border text-fg text-left border border-border transition-colors truncate"
                title="Trainee Land"
              >
                🛡️ Land Trainee
              </button>
              <button
                type="button"
                onClick={() => setDemoCredentials('air1', 'trainee123')}
                className="py-1 px-2 rounded-control bg-surface hover:bg-border text-fg text-left border border-border transition-colors truncate"
                title="Trainee Air"
              >
                ✈️ Air Trainee
              </button>
              <button
                type="button"
                onClick={() => setDemoCredentials('admin', 'admin12345')}
                className="py-1 px-2 rounded-control bg-surface hover:bg-border text-fg text-left border border-border transition-colors truncate"
                title="System Admin"
              >
                ⚙️ Admin
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. instructor or land1"
              required
            />

            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />

            {isRegister && (
              <>
                <Input
                  label="Email (optional)"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="officer@defence.gov.in"
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Rank"
                    value={rank}
                    onChange={(e) => setRank(e.target.value)}
                    placeholder="Major / Sqn Ldr"
                  />
                  <Input
                    label="Unit"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="14 Strike Corps"
                  />
                </div>
              </>
            )}

            <Button type="submit" variant="primary" className="w-full mt-2" isLoading={isLoading}>
              {isRegister ? 'Register & Enter' : 'Sign In'}
            </Button>
          </form>

          <div className="pt-2 text-center text-xs text-muted">
            {isRegister ? (
              <p>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => setIsRegister(false)}
                  className="text-primary font-medium hover:underline"
                >
                  Sign in
                </button>
              </p>
            ) : (
              <p>
                Need a trainee account?{' '}
                <button
                  type="button"
                  onClick={() => setIsRegister(true)}
                  className="text-primary font-medium hover:underline"
                >
                  Register here
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
