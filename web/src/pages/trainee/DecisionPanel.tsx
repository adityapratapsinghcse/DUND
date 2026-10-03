import React, { useState } from 'react';
import { Button } from '../../components/ui/Button.js';
import { Card } from '../../components/ui/Card.js';
import { ActionType, TraineeReport } from '@degrade/shared';
import { Navigation, ShieldAlert, Crosshair, Eye, ShieldCheck, Radio, X } from 'lucide-react';

export interface DecisionPanelProps {
  selectedReport?: TraineeReport | null;
  onClearSelectedReport: () => void;
  onSubmitDecision: (data: {
    action_type: ActionType;
    self_confidence: number;
    truth_event?: number;
    details?: Record<string, any>;
  }) => Promise<void>;
  disabled?: boolean;
}

const ACTION_BUTTONS: Array<{ type: ActionType; label: string; icon: React.ReactNode; desc: string }> = [
  { type: 'MOVE', label: 'Move / Reposition', icon: <Navigation className="w-4 h-4" />, desc: 'Displace unit to alternate grid' },
  { type: 'HOLD', label: 'Hold Ground', icon: <ShieldAlert className="w-4 h-4" />, desc: 'Maintain current defense sector' },
  { type: 'FIRE_SUPPORT', label: 'Fire Support', icon: <Crosshair className="w-4 h-4" />, desc: 'Call artillery / air strike' },
  { type: 'REQUEST_ISR', label: 'Request ISR', icon: <Eye className="w-4 h-4" />, desc: 'Direct UAV / radar scan' },
  { type: 'VERIFY', label: 'Cross-Verify Intel', icon: <ShieldCheck className="w-4 h-4" />, desc: 'Challenge questionable report' },
  { type: 'FALLBACK_COMMS', label: 'Fallback Comms', icon: <Radio className="w-4 h-4" />, desc: 'Switch to HF / courier relay' },
];

export const DecisionPanel: React.FC<DecisionPanelProps> = ({
  selectedReport,
  onClearSelectedReport,
  onSubmitDecision,
  disabled = false,
}) => {
  const [selectedAction, setSelectedAction] = useState<ActionType>('MOVE');
  const [confidence, setConfidence] = useState<number>(75);
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmitDecision({
        action_type: selectedAction,
        self_confidence: confidence / 100.0,
        truth_event: selectedReport?.id,
        details: { notes, responding_to_title: selectedReport?.payload?.title },
      });
      setNotes('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="flex flex-col gap-3 p-4 bg-surface/95 backdrop-blur-sm">
      <div className="flex items-center justify-between border-b border-border/80 pb-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted">
          Tactical Command Orders
        </span>
        {selectedReport ? (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-chip bg-primary/10 text-primary text-[11px] font-mono">
            <span>Responding to: {selectedReport.payload.title.slice(0, 22)}...</span>
            <button onClick={onClearSelectedReport} className="hover:text-danger">
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <span className="text-[11px] text-muted italic">Click a map report or submit general command</span>
        )}
      </div>

      {/* Action Buttons Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
        {ACTION_BUTTONS.map((btn) => {
          const isSelected = selectedAction === btn.type;
          return (
            <button
              key={btn.type}
              type="button"
              disabled={disabled}
              onClick={() => setSelectedAction(btn.type)}
              className={`flex flex-col items-center justify-center p-2 rounded-control text-xs font-medium border transition-all text-center ${
                isSelected
                  ? 'bg-primary text-primary-fg border-primary shadow-sm scale-[1.02]'
                  : 'bg-surface-2 text-fg border-border/70 hover:bg-border/60 hover:text-fg'
              }`}
            >
              <div className="mb-1">{btn.icon}</div>
              <span className="leading-tight">{btn.label}</span>
            </button>
          );
        })}
      </div>

      {/* Confidence Slider & Notes Input */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-1 items-center">
        <div className="md:col-span-5 space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted font-medium">Confidence Calibration:</span>
            <span className="font-mono font-semibold text-primary">{confidence}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={confidence}
            disabled={disabled}
            onChange={(e) => setConfidence(Number(e.target.value))}
            className="w-full accent-primary h-1.5 bg-border rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-muted/80 font-mono">
            <span>0% (Guess)</span>
            <span>50% (Tentative)</span>
            <span>100% (Certain)</span>
          </div>
        </div>

        <div className="md:col-span-5">
          <input
            type="text"
            value={notes}
            disabled={disabled}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Command notes / Sector remarks (optional)..."
            className="w-full rounded-control bg-surface-2 border border-border px-3 py-1.5 text-xs text-fg placeholder:text-muted/60 focus:outline-none focus:border-primary"
          />
        </div>

        <div className="md:col-span-2">
          <Button
            type="button"
            variant="primary"
            size="md"
            className="w-full"
            isLoading={isSubmitting}
            disabled={disabled}
            onClick={handleSubmit}
          >
            Execute Order
          </Button>
        </div>
      </div>
    </Card>
  );
};
