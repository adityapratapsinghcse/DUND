import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { useToast } from '../../components/ui/Toast.js';
import { Button } from '../../components/ui/Button.js';
import { Input, Select } from '../../components/ui/Input.js';
import { Card } from '../../components/ui/Card.js';
import { Badge } from '../../components/ui/Badge.js';
import { Modal } from '../../components/ui/Modal.js';
import { Table } from '../../components/ui/Tabs.js';
import { User, Role } from '@degrade/shared';
import { Users, Plus, KeyRound, Check, X, Search, Filter } from 'lucide-react';

export const AdminUsers: React.FC = () => {
  const { api } = useAuth();
  const { toast } = useToast();

  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Create User Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<Role>('TRAINEE');
  const [newRank, setNewRank] = useState('');
  const [newUnit, setNewUnit] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset Password Modal
  const [resetModalUser, setResetModalUser] = useState<User | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const data = await api.getAdminUsers({
        search: search || undefined,
        role: roleFilter || undefined,
      });
      setUsers(data.results || data);
    } catch (_) {}
    finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [roleFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadUsers();
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await api.createAdminUser({
        username: newUsername,
        email: newEmail,
        password: newPassword || undefined,
        role: newRole,
        rank: newRank,
        unit: newUnit,
        is_active: true,
      });
      toast(`User ${res.username} created successfully!`, 'success');
      setIsCreateOpen(false);
      setNewUsername('');
      setNewEmail('');
      setNewPassword('');
      loadUsers();
    } catch (err: any) {
      toast(err.message || 'Failed to create user.', 'danger');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (user: User) => {
    try {
      await api.toggleUserActive(user.id);
      toast(`User status toggled for ${user.username}`, 'info');
      loadUsers();
    } catch (err: any) {
      toast(err.message || 'Failed to update user status.', 'danger');
    }
  };

  const handleResetPassword = async (user: User) => {
    try {
      const res = await api.resetUserPassword(user.id);
      setResetModalUser(user);
      setTempPassword(res.temporary_password);
    } catch (err: any) {
      toast(err.message || 'Failed to reset password.', 'danger');
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-semibold text-fg">Officer Roster & Access Management</h1>
          <p className="text-xs text-muted mt-0.5">
            Manage instructors, trainees, roles, active clearances, and password resets.
          </p>
        </div>
        <Button variant="primary" onClick={() => setIsCreateOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Create Officer Account
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3 items-center">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-muted absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by username, rank, or unit..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-surface-2 border border-border rounded-control pl-9 pr-3 py-1.5 text-xs text-fg focus:outline-none focus:border-primary"
            />
          </div>
          <Select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full sm:w-44 text-xs py-1.5"
            options={[
              { value: '', label: 'All Roles' },
              { value: 'ADMIN', label: 'Admin' },
              { value: 'INSTRUCTOR', label: 'Instructor' },
              { value: 'TRAINEE', label: 'Trainee' },
            ]}
          />
          <Button type="submit" variant="secondary" size="sm">
            Filter
          </Button>
        </form>
      </Card>

      {/* Users Table */}
      <Table>
        <thead className="bg-surface-2 border-b border-border text-muted font-medium text-[11px] uppercase tracking-wider">
          <tr>
            <th className="p-3">Officer</th>
            <th className="p-3">Role</th>
            <th className="p-3">Rank & Unit</th>
            <th className="p-3">Status</th>
            <th className="p-3">Joined</th>
            <th className="p-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {users.map((u) => (
            <tr key={u.id} className="hover:bg-surface-2/40 transition-colors">
              <td className="p-3 font-semibold text-fg">
                <div>{u.username}</div>
                <div className="text-[11px] text-muted font-normal">{u.email || 'No email registered'}</div>
              </td>
              <td className="p-3">
                <Badge variant={u.role === 'ADMIN' ? 'accent' : u.role === 'INSTRUCTOR' ? 'info' : 'success'}>
                  {u.role}
                </Badge>
              </td>
              <td className="p-3 text-muted">
                {u.rank ? `${u.rank} • ` : ''}
                {u.unit || 'Standard Command'}
              </td>
              <td className="p-3">
                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-chip text-[11px] font-mono ${
                  u.is_active ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? 'bg-success' : 'bg-danger'}`} />
                  {u.is_active ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td className="p-3 text-muted font-mono text-[11px]">
                {new Date(u.date_joined).toLocaleDateString()}
              </td>
              <td className="p-3 text-right space-x-1">
                <Button size="sm" variant="ghost" onClick={() => handleToggleActive(u)} title="Toggle Active">
                  {u.is_active ? 'Deactivate' : 'Activate'}
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleResetPassword(u)} title="Reset Password">
                  <KeyRound className="w-3.5 h-3.5" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      {/* Create User Modal */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Create Officer Account">
        <form onSubmit={handleCreateUser} className="space-y-4">
          <Input
            label="Username"
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            required
          />
          <Input
            label="Email Address"
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
          />
          <Input
            label="Password (leave empty to auto-generate)"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <Select
            label="Role Assignment"
            value={newRole}
            onChange={(e: any) => setNewRole(e.target.value)}
            options={[
              { value: 'TRAINEE', label: 'TRAINEE (Simulation Participant)' },
              { value: 'INSTRUCTOR', label: 'INSTRUCTOR (Scenario Coordinator)' },
              { value: 'ADMIN', label: 'ADMIN (Full System Access)' },
            ]}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Military Rank"
              value={newRank}
              onChange={(e) => setNewRank(e.target.value)}
              placeholder="e.g. Major"
            />
            <Input
              label="Unit / Regiment"
              value={newUnit}
              onChange={(e) => setNewUnit(e.target.value)}
              placeholder="e.g. 14 Strike Corps"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Create Account
            </Button>
          </div>
        </form>
      </Modal>

      {/* Password Reset Modal displaying temporary password once */}
      <Modal isOpen={!!tempPassword} onClose={() => setTempPassword(null)} title="Temporary Password Generated">
        <div className="space-y-4">
          <p className="text-xs text-muted">
            A temporary single-use password was generated for officer <span className="font-semibold text-fg">{resetModalUser?.username}</span>. Share this securely:
          </p>
          <div className="p-3 rounded-control bg-surface-2 border border-border text-center font-mono text-base font-bold text-primary select-all">
            {tempPassword}
          </div>
          <div className="flex justify-end">
            <Button variant="primary" size="sm" onClick={() => setTempPassword(null)}>
              Done
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
