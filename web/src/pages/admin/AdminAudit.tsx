import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { useToast } from '../../components/ui/Toast.js';
import { Button } from '../../components/ui/Button.js';
import { Select } from '../../components/ui/Input.js';
import { Table } from '../../components/ui/Tabs.js';
import { AuditLog } from '@degrade/shared';
import { FileText, Download, Shield } from 'lucide-react';

export const AdminAudit: React.FC = () => {
  const { api } = useAuth();
  const { toast } = useToast();

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [actionFilter, setActionFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const loadAuditLogs = async () => {
    setIsLoading(true);
    try {
      const data = await api.getAdminAuditLogs({ action: actionFilter || undefined });
      setLogs(data.results || data);
    } catch (_) {}
    finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAuditLogs();
  }, [actionFilter]);

  const exportCSV = () => {
    if (logs.length === 0) return;
    const headers = ['ID', 'Timestamp', 'Actor', 'Action', 'TargetType', 'TargetID', 'Metadata'];
    const rows = logs.map((l) => [
      l.id,
      new Date(l.created_at).toISOString(),
      l.actor_name || 'SYSTEM',
      l.action,
      l.target_type,
      l.target_id,
      JSON.stringify(l.meta).replace(/"/g, '""'),
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map(r => r.map(x => `"${x}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `degrade_audit_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast('Audit log exported to CSV', 'success');
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-semibold text-fg">Platform Audit Logs</h1>
          <p className="text-xs text-muted mt-0.5">
            Cryptographically audited trails of user logins, scenario edits, exercise injections, and access modifications.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="w-48 text-xs py-1.5"
            options={[
              { value: '', label: 'All Actions' },
              { value: 'LOGIN', label: 'User Logins' },
              { value: 'USER_CREATE', label: 'User Creates' },
              { value: 'SCENARIO_CREATE', label: 'Scenario Creates' },
              { value: 'EXERCISE_START', label: 'Exercise Starts' },
              { value: 'EXERCISE_END', label: 'Exercise Ends' },
              { value: 'SETTINGS_UPDATE', label: 'Settings Updates' },
            ]}
          />
          <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1.5">
            <Download className="w-3.5 h-3.5" /> Export CSV
          </Button>
        </div>
      </div>

      <Table>
        <thead className="bg-surface-2 border-b border-border text-muted font-medium text-[11px] uppercase tracking-wider">
          <tr>
            <th className="p-3">Timestamp</th>
            <th className="p-3">Officer / Actor</th>
            <th className="p-3">Action</th>
            <th className="p-3">Target Entity</th>
            <th className="p-3">Context Metadata</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60 text-xs">
          {logs.map((log) => (
            <tr key={log.id} className="hover:bg-surface-2/40 transition-colors">
              <td className="p-3 font-mono text-[11px] text-muted">
                {new Date(log.created_at).toLocaleString()}
              </td>
              <td className="p-3 font-semibold text-fg">
                {log.actor_name || 'SYSTEM'}
              </td>
              <td className="p-3 font-mono font-bold text-primary">
                {log.action}
              </td>
              <td className="p-3 text-muted font-mono">
                {log.target_type} {log.target_id && `(#${log.target_id})`}
              </td>
              <td className="p-3 font-mono text-[11px] text-muted max-w-xs truncate">
                {JSON.stringify(log.meta)}
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
};
