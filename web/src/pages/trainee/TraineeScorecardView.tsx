import React from 'react';
import { Scorecard } from '@degrade/shared';
import { Card } from '../../components/ui/Card.js';
import { StatCard } from '../../components/ui/StatCard.js';
import { Button } from '../../components/ui/Button.js';
import { Award, Target, Clock, ShieldCheck, Radio, CheckCircle, ArrowLeft } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

export interface TraineeScorecardViewProps {
  scorecard: Scorecard;
  scenarioTitle?: string;
  onExit: () => void;
}

export const TraineeScorecardView: React.FC<TraineeScorecardViewProps> = ({
  scorecard,
  scenarioTitle = 'Simulation Exercise',
  onExit,
}) => {
  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="text-xs font-mono text-primary uppercase tracking-wider mb-1">
            EXERCISE CONCLUDED • PERFORMANCE AUDIT
          </div>
          <h1 className="text-2xl font-semibold text-fg">Tactical Scorecard</h1>
          <p className="text-xs text-muted mt-0.5">
            Officer {scorecard.user} ({scorecard.role}) • {scenarioTitle}
          </p>
        </div>
        <Button variant="outline" onClick={onExit} className="gap-2">
          <ArrowLeft className="w-4 h-4" /> Exit to Station
        </Button>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Accuracy"
          value={`${scorecard.accuracy}%`}
          subtitle={`${scorecard.decisions} total decisions`}
          icon={<Target className="w-4 h-4" />}
        />
        <StatCard
          title="Avg Latency"
          value={`${scorecard.avg_latency}s`}
          subtitle="Decision delay"
          icon={<Clock className="w-4 h-4" />}
        />
        <StatCard
          title="Brier Calibration"
          value={scorecard.calibration_error.toFixed(3)}
          subtitle="0.000 is perfect calibration"
          icon={<Award className="w-4 h-4" />}
        />
        <StatCard
          title="Fallback Comms"
          value={scorecard.used_fallback_comms}
          subtitle={`${scorecard.verified_info} verifications`}
          icon={<Radio className="w-4 h-4" />}
        />
      </div>

      {/* Confidence Calibration Chart */}
      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-fg">Confidence Calibration Profile</h3>
            <p className="text-xs text-muted">
              Compares self-reported confidence against actual accuracy across confidence ranges.
            </p>
          </div>
          <div className="text-xs font-mono px-2.5 py-1 rounded-chip bg-surface-2 border border-border text-fg">
            Brier Error: {scorecard.calibration_error.toFixed(3)}
          </div>
        </div>

        <div className="h-64 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={scorecard.calibration_curve || []}>
              <XAxis dataKey="bin" tick={{ fill: 'currentColor', fontSize: 11 }} />
              <YAxis tick={{ fill: 'currentColor', fontSize: 11 }} domain={[0, 100]} unit="%" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--color-surface)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-fg)',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              <Bar dataKey="expected_confidence" name="Expected Conf (%)" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="actual_accuracy" name="Actual Accuracy (%)" fill="var(--color-accent)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
};
