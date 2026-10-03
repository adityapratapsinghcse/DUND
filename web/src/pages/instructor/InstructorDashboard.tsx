import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import { useToast } from '../../components/ui/Toast.js';
import { Button } from '../../components/ui/Button.js';
import { Card } from '../../components/ui/Card.js';
import { Badge } from '../../components/ui/Badge.js';
import { Modal } from '../../components/ui/Modal.js';
import { Select } from '../../components/ui/Input.js';
import { Exercise, Scenario } from '@degrade/shared';
import { Radio, Plus, Play, Pause, Square, BarChart3, Users, Clock, ShieldAlert } from 'lucide-react';

export const InstructorDashboard: React.FC = () => {
  const { api } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // New Exercise Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedScenarioId, setSelectedScenarioId] = useState<number | string>('');
  const [intensity, setIntensity] = useState<number>(0.35);
  const [isCreating, setIsCreating] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [exList, scList] = await Promise.all([
        api.getExercises(),
        api.getScenarios(),
      ]);
      setExercises(exList);
      setScenarios(scList);
      if (scList.length > 0 && !selectedScenarioId) {
        setSelectedScenarioId(scList[0].id);
      }
    } catch (err: any) {
      toast(err.message || 'Failed to load exercises.', 'danger');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateExercise = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedScenarioId) return;
    setIsCreating(true);

    try {
      const created = await api.createExercise({
        scenario: Number(selectedScenarioId),
        intensity: Number(intensity),
      });
      toast(`Exercise created! Room Code: ${created.join_code}`, 'success');
      setIsModalOpen(false);
      navigate(`/instructor/exercises/${created.id}`);
    } catch (err: any) {
      toast(err.message || 'Failed to launch exercise session.', 'danger');
    } finally {
      setIsCreating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'RUNNING': return <Badge variant="success">RUNNING</Badge>;
      case 'PAUSED': return <Badge variant="warning">PAUSED</Badge>;
      case 'ENDED': return <Badge variant="default">ENDED</Badge>;
      default: return <Badge variant="info">LOBBY</Badge>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-semibold text-fg">Tactical Command Center</h1>
          <p className="text-xs text-muted mt-1">
            Conduct multi-domain exercises under degraded communications, monitor participant feeds, and inject real-time events.
          </p>
        </div>
        <Button variant="primary" onClick={() => setIsModalOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" /> New Exercise Session
        </Button>
      </div>

      {/* Exercises Table / List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-fg uppercase tracking-wider">
            Active & Past Exercises ({exercises.length})
          </h3>
          <Button variant="ghost" size="sm" onClick={loadData}>
            Refresh
          </Button>
        </div>

        {exercises.length === 0 ? (
          <Card className="p-12 text-center text-xs text-muted">
            <Radio className="w-8 h-8 mx-auto mb-3 opacity-40 text-primary" />
            No simulation exercises conducted yet.
            <div className="mt-3">
              <Button size="sm" variant="primary" onClick={() => setIsModalOpen(true)}>
                Launch First Exercise
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {exercises.map((ex) => (
              <Card key={ex.id} className="flex flex-col justify-between hover:border-primary/50 transition-colors">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-base font-bold tracking-widest text-primary px-2.5 py-0.5 rounded-chip bg-primary/10 border border-primary/20">
                      {ex.join_code}
                    </span>
                    {getStatusBadge(ex.status)}
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-fg line-clamp-1">{ex.scenario_title}</h4>
                    <p className="text-xs text-muted mt-0.5">
                      Coordinator: {ex.instructor_name}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs font-mono text-muted bg-surface-2 p-2.5 rounded-control">
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-primary" />
                      <span>{ex.participants_count || 0} Trainees</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-muted" />
                      <span>{Math.round(ex.elapsed_sec || 0)}s elapsed</span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-border flex items-center gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    className="flex-1"
                    onClick={() => navigate(`/instructor/exercises/${ex.id}`)}
                  >
                    Control Room
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/instructor/exercises/${ex.id}/aar`)}
                    title="After-Action Review"
                  >
                    <BarChart3 className="w-3.5 h-3.5" /> AAR
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* New Exercise Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Launch Tactical Simulation Exercise"
      >
        <form onSubmit={handleCreateExercise} className="space-y-4">
          <Select
            label="Tactical Scenario"
            value={selectedScenarioId}
            onChange={(e) => setSelectedScenarioId(e.target.value)}
            required
            options={scenarios.map((s) => ({
              value: String(s.id),
              label: `${s.title} (${s.difficulty} - ${s.domains.join(', ')})`,
            }))}
          />

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-medium">
              <span>Baseline Comms Contestation (Intensity):</span>
              <span className="font-mono text-primary font-semibold">{Math.round(intensity * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={intensity}
              onChange={(e) => setIntensity(Number(e.target.value))}
              className="w-full accent-primary h-1.5 bg-border rounded-lg appearance-none cursor-pointer"
            />
            <p className="text-[11px] text-muted">
              Higher intensity increases probability of dropped packets, latency ceilings, and coordinates distortion.
            </p>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isCreating}>
              Launch Session
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
