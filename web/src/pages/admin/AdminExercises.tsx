import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import { useToast } from '../../components/ui/Toast.js';
import { Button } from '../../components/ui/Button.js';
import { Card } from '../../components/ui/Card.js';
import { Badge } from '../../components/ui/Badge.js';
import { Select } from '../../components/ui/Input.js';
import { Table } from '../../components/ui/Tabs.js';
import { Exercise } from '@degrade/shared';
import { Radio, AlertTriangle, Square, Eye, BarChart2 } from 'lucide-react';

export const AdminExercises: React.FC = () => {
  const { api } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const loadExercises = async () => {
    setIsLoading(true);
    try {
      const data = await api.getAdminExercises({ status: statusFilter || undefined });
      setExercises(data.results || data);
    } catch (_) {}
    finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadExercises();
  }, [statusFilter]);

  const handleForceEnd = async (exercise: Exercise) => {
    if (window.confirm(`Force terminate exercise session ${exercise.join_code}?`)) {
      try {
        await api.forceEndExercise(exercise.id);
        toast(`Exercise ${exercise.join_code} terminated by administrator.`, 'warning');
        loadExercises();
      } catch (err: any) {
        toast(err.message || 'Failed to force end exercise.', 'danger');
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-semibold text-fg">Exercise Session Directory</h1>
          <p className="text-xs text-muted mt-0.5">
            Audit all simulation runs, monitor telemetry, or force-end rogue sessions.
          </p>
        </div>
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-44 text-xs py-1.5"
          options={[
            { value: '', label: 'All Statuses' },
            { value: 'LOBBY', label: 'LOBBY' },
            { value: 'RUNNING', label: 'RUNNING' },
            { value: 'PAUSED', label: 'PAUSED' },
            { value: 'ENDED', label: 'ENDED' },
          ]}
        />
      </div>

      <Table>
        <thead className="bg-surface-2 border-b border-border text-muted font-medium text-[11px] uppercase tracking-wider">
          <tr>
            <th className="p-3">Join Code</th>
            <th className="p-3">Scenario</th>
            <th className="p-3">Instructor</th>
            <th className="p-3">Status</th>
            <th className="p-3">Duration</th>
            <th className="p-3 text-right">Administrative Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {exercises.map((ex) => (
            <tr key={ex.id} className="hover:bg-surface-2/40 transition-colors">
              <td className="p-3 font-mono font-bold text-primary">{ex.join_code}</td>
              <td className="p-3 font-semibold text-fg">{ex.scenario_title}</td>
              <td className="p-3 text-muted">{ex.instructor_name}</td>
              <td className="p-3">
                <Badge variant={ex.status === 'RUNNING' ? 'success' : ex.status === 'PAUSED' ? 'warning' : 'default'}>
                  {ex.status}
                </Badge>
              </td>
              <td className="p-3 font-mono text-xs text-muted">
                {Math.round(ex.elapsed_sec || 0)}s
              </td>
              <td className="p-3 text-right space-x-1">
                <Button size="sm" variant="ghost" onClick={() => navigate(`/instructor/exercises/${ex.id}`)}>
                  Monitor
                </Button>
                <Button size="sm" variant="outline" onClick={() => navigate(`/instructor/exercises/${ex.id}/aar`)}>
                  AAR
                </Button>
                {ex.status !== 'ENDED' && (
                  <Button size="sm" variant="danger" onClick={() => handleForceEnd(ex)} title="Emergency Force End">
                    <Square className="w-3.5 h-3.5" />
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
};
