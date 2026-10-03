import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { useToast } from '../../components/ui/Toast.js';
import { Button } from '../../components/ui/Button.js';
import { Input } from '../../components/ui/Input.js';
import { Card } from '../../components/ui/Card.js';
import { SystemSettings } from '@degrade/shared';
import { Settings, Save, ShieldCheck } from 'lucide-react';

export const AdminSettings: React.FC = () => {
  const { api } = useAuth();
  const { toast } = useToast();

  const [maxDelaySec, setMaxDelaySec] = useState<number>(300);
  const [defaultIntensity, setDefaultIntensity] = useState<number>(0.35);
  const [allowSelfReg, setAllowSelfReg] = useState<boolean>(true);
  const [maxParticipants, setMaxParticipants] = useState<number>(12);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  useEffect(() => {
    api.getSystemSettings()
      .then((s) => {
        setMaxDelaySec(s.max_delay_sec);
        setDefaultIntensity(s.default_intensity);
        setAllowSelfReg(s.allow_self_registration);
        setMaxParticipants(s.max_participants_per_exercise);
      })
      .catch((err) => toast(err.message || 'Failed to load settings.', 'danger'))
      .finally(() => setIsLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await api.updateSystemSettings({
        max_delay_sec: Number(maxDelaySec),
        default_intensity: Number(defaultIntensity),
        allow_self_registration: Boolean(allowSelfReg),
        max_participants_per_exercise: Number(maxParticipants),
      });
      toast('Global system settings updated and propagated to degradation engine!', 'success');
    } catch (err: any) {
      toast(err.message || 'Failed to update settings.', 'danger');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="border-b border-border pb-4">
        <h1 className="text-2xl font-semibold text-fg">Global System Parameters</h1>
        <p className="text-xs text-muted mt-0.5">
          Tune degradation pipeline ceilings, self-registration rules, and participant capacity.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <Card className="p-6 space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-fg uppercase tracking-wider flex items-center gap-2 border-b border-border pb-2">
              <Settings className="w-4 h-4 text-primary" /> Degradation Engine Limits
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Maximum Report Delay Ceiling (Seconds)"
                type="number"
                min="10"
                max="1800"
                value={maxDelaySec}
                onChange={(e) => setMaxDelaySec(Number(e.target.value))}
                hint="Controls max potential delay applied by comms loss (default: 300s)"
                required
              />

              <Input
                label="Max Participants Per Exercise Lobby"
                type="number"
                min="2"
                max="100"
                value={maxParticipants}
                onChange={(e) => setMaxParticipants(Number(e.target.value))}
                hint="Hard cap on joined trainees per single room (default: 12)"
                required
              />
            </div>

            <div className="space-y-1.5 pt-2">
              <div className="flex items-center justify-between text-xs font-medium">
                <span>Default Exercise Contestation Intensity:</span>
                <span className="font-mono text-primary font-bold">{Math.round(defaultIntensity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={defaultIntensity}
                onChange={(e) => setDefaultIntensity(Number(e.target.value))}
                className="w-full accent-primary h-2 bg-border rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <h3 className="text-sm font-semibold text-fg uppercase tracking-wider flex items-center gap-2 border-b border-border pb-2">
              <ShieldCheck className="w-4 h-4 text-primary" /> Security & Registration
            </h3>

            <label className="flex items-start gap-3 cursor-pointer p-3 rounded-control bg-surface-2 border border-border">
              <input
                type="checkbox"
                checked={allowSelfReg}
                onChange={(e) => setAllowSelfReg(e.target.checked)}
                className="mt-0.5 accent-primary h-4 w-4 rounded"
              />
              <div>
                <span className="text-sm font-medium text-fg block">
                  Permit Trainee Self-Registration
                </span>
                <span className="text-xs text-muted block mt-0.5">
                  When enabled, officers can freely register new trainee accounts from the sign-in portal. When disabled, accounts must be created by administrators.
                </span>
              </div>
            </label>
          </div>

          <div className="flex justify-end pt-4 border-t border-border">
            <Button type="submit" variant="primary" isLoading={isSaving} className="gap-2">
              <Save className="w-4 h-4" /> Save System Settings
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
};
