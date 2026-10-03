import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import { useToast } from '../../components/ui/Toast.js';
import { StatCard } from '../../components/ui/StatCard.js';
import { Card } from '../../components/ui/Card.js';
import { Badge } from '../../components/ui/Badge.js';
import { Button } from '../../components/ui/Button.js';
import { AdminStats, Exercise } from '@degrade/shared';
import { Users, Activity, Target, Radio, Clock, ShieldCheck, ArrowRight } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';

export const AdminOverview: React.FC = () => {
  const { api } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [activeExercises, setActiveExercises] = useState<Exercise[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getAdminStats(),
      api.getAdminExercises({ status: 'RUNNING' }),
    ])
      .then(([statsData, exData]) => {
        setStats(statsData);
        setActiveExercises(exData.results || exData);
      })
      .catch((err) => toast(err.message || 'Failed to load system stats.', 'danger'))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading || !stats) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <span className="text-xs text-muted font-mono">LOADING SYSTEM METRICS...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="border-b border-border pb-4">
        <h1 className="text-2xl font-semibold text-fg">System Administration Overview</h1>
        <p className="text-xs text-muted mt-0.5">
          Global platform health, live simulation exercises, officer roster metrics, and telemetry audit.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Personnel"
          value={stats.total_users}
          subtitle={`Instructors: ${stats.users_by_role['INSTRUCTOR'] || 0} • Trainees: ${stats.users_by_role['TRAINEE'] || 0}`}
          icon={<Users className="w-4 h-4" />}
        />
        <StatCard
          title="Active Exercises"
          value={stats.active_sessions_now}
          subtitle={`${stats.exercises_by_status['RUNNING'] || 0} running right now`}
          icon={<Radio className="w-4 h-4 text-success" />}
        />
        <StatCard
          title="Decisions Today"
          value={stats.decisions_today}
          subtitle="Tactical command actions"
          icon={<Target className="w-4 h-4" />}
        />
        <StatCard
          title="Avg Degradation"
          value={`${Math.round(stats.avg_intensity * 100)}%`}
          subtitle="Network loss intensity"
          icon={<Activity className="w-4 h-4" />}
        />
      </div>

      {/* 14-Day Simulation Activity Chart */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-fg">14-Day Tactical Simulation Trend</h3>
            <p className="text-xs text-muted">Daily volume of multi-domain exercises conducted across units.</p>
          </div>
          <Badge variant="primary">LAST 14 DAYS</Badge>
        </div>

        <div className="h-64 w-full pt-3">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={stats.exercises_per_day_14d}>
              <defs>
                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--color-surface)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-fg)',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <Area type="monotone" dataKey="count" name="Exercises" stroke="var(--color-primary)" strokeWidth={2} fillOpacity={1} fill="url(#colorCount)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Live Running Sessions */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-border pb-2">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-success animate-pulse" />
            <h3 className="text-sm font-semibold text-fg">Active Exercises Currently in Progress</h3>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/admin/exercises')}>
            View All Sessions <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>

        {activeExercises.length === 0 ? (
          <p className="text-xs text-muted py-6 text-center italic">No exercises currently running.</p>
        ) : (
          <div className="space-y-2">
            {activeExercises.map((ex) => (
              <div key={ex.id} className="p-3 rounded-control bg-surface-2 border border-border flex items-center justify-between text-xs">
                <div>
                  <div className="font-semibold text-fg flex items-center gap-2">
                    <span className="font-mono text-primary font-bold">{ex.join_code}</span>
                    <span>{ex.scenario_title}</span>
                  </div>
                  <div className="text-[11px] text-muted font-mono mt-0.5">
                    Instructor: {ex.instructor_name} • Duration: {Math.round(ex.elapsed_sec)}s
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant="success">RUNNING</Badge>
                  <Button size="sm" variant="outline" onClick={() => navigate(`/instructor/exercises/${ex.id}`)}>
                    Monitor
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
