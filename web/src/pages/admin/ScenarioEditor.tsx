import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { useToast } from '../../components/ui/Toast.js';
import { Button } from '../../components/ui/Button.js';
import { Input, Select } from '../../components/ui/Input.js';
import { Card } from '../../components/ui/Card.js';
import { Badge } from '../../components/ui/Badge.js';
import { Tabs } from '../../components/ui/Tabs.js';
import { Table } from '../../components/ui/Tabs.js';
import { TacticalMap } from '../../components/map/TacticalMap.js';
import { Scenario, ScenarioEvent } from '@degrade/shared';
import { Plus, Trash2, Edit3, Code, MapPin, Save, Radio, ArrowLeft } from 'lucide-react';

export const ScenarioEditor: React.FC = () => {
  const { api } = useAuth();
  const { toast } = useToast();

  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [activeTab, setActiveTab] = useState<'form' | 'json'>('form');
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD' | 'EXTREME'>('MEDIUM');
  const [centerLat, setCenterLat] = useState(25.4358);
  const [centerLon, setCenterLon] = useState(81.8463);
  const [defaultIntensity, setDefaultIntensity] = useState(0.35);
  const [selectedDomains, setSelectedDomains] = useState<string[]>(['LAND', 'AIR']);
  const [selectedRoles, setSelectedRoles] = useState<string[]>(['LAND', 'AIR']);
  const [events, setEvents] = useState<ScenarioEvent[]>([]);

  const loadScenarios = async () => {
    try {
      const data = await api.getScenarios();
      setScenarios(data);
      if (data.length > 0 && !selectedScenario) {
        selectScenario(data[0]);
      }
    } catch (_) {}
  };

  useEffect(() => {
    loadScenarios();
  }, []);

  const selectScenario = async (sc: Scenario) => {
    try {
      const full = await api.getScenario(sc.id);
      setSelectedScenario(full);
      setTitle(full.title);
      setDescription(full.description);
      setDifficulty(full.difficulty);
      setCenterLat(full.center_lat);
      setCenterLon(full.center_lon);
      setDefaultIntensity(full.default_intensity);
      setSelectedDomains(full.domains || []);
      setSelectedRoles(full.roles || []);
      setEvents(full.events || []);
    } catch (_) {}
  };

  const handleCreateNew = () => {
    setSelectedScenario(null);
    setTitle('New Multi-Domain Scenario');
    setDescription('Tactical scenario description...');
    setDifficulty('MEDIUM');
    setCenterLat(25.4358);
    setCenterLon(81.8463);
    setDefaultIntensity(0.35);
    setSelectedDomains(['LAND', 'AIR', 'CYBER']);
    setSelectedRoles(['LAND', 'AIR', 'CYBER']);
    setEvents([
      {
        t_offset_sec: 10,
        event_type: 'TRUTH',
        kind: 'SURVEILLANCE_CONTACT',
        source_role: 'HQ',
        payload: {
          title: 'Initial Recon Contact',
          detail: 'Air patrol isolations confirmed.',
          lat: 25.45,
          lon: 81.85,
          visible_to: ['AIR'],
          expected_actions: ['VERIFY'],
        },
      },
    ]);
  };

  const toggleDomain = (d: string) => {
    setSelectedDomains((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
    );
  };

  const toggleRole = (r: string) => {
    setSelectedRoles((prev) =>
      prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]
    );
  };

  const addEvent = () => {
    setEvents((prev) => [
      ...prev,
      {
        t_offset_sec: prev.length > 0 ? prev[prev.length - 1].t_offset_sec + 20 : 10,
        event_type: 'TRUTH',
        kind: 'TACTICAL_EVENT',
        source_role: 'HQ',
        payload: {
          title: 'New Timed Event',
          detail: 'Event details...',
          lat: centerLat,
          lon: centerLon,
          visible_to: ['LAND'],
          expected_actions: ['MOVE'],
        },
      },
    ]);
  };

  const deleteEvent = (index: number) => {
    setEvents((prev) => prev.filter((_, i) => i !== index));
  };

  const updateEvent = (index: number, field: string, value: any) => {
    setEvents((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleSave = async () => {
    if (!title) return;
    setIsSaving(true);
    try {
      const payload: Partial<Scenario> = {
        title,
        description,
        difficulty,
        center_lat: centerLat,
        center_lon: centerLon,
        default_intensity: defaultIntensity,
        domains: selectedDomains,
        roles: selectedRoles,
        events,
      };

      if (selectedScenario?.id) {
        const updated = await api.updateScenario(selectedScenario.id, payload);
        toast('Scenario updated successfully!', 'success');
        selectScenario(updated);
      } else {
        const created = await api.createScenario(payload);
        toast('Scenario created successfully!', 'success');
        selectScenario(created);
      }
      loadScenarios();
    } catch (err: any) {
      toast(err.message || 'Failed to save scenario.', 'danger');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-semibold text-fg">Scenario Intelligence Editor</h1>
          <p className="text-xs text-muted mt-0.5">
            Design multi-domain scenarios, timed truth injections, link disruption schedules, and jamming coordinates.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleCreateNew} className="gap-1.5">
            <Plus className="w-4 h-4" /> New Scenario
          </Button>
          <Button variant="primary" size="sm" onClick={handleSave} isLoading={isSaving} className="gap-1.5">
            <Save className="w-4 h-4" /> Save Scenario
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Scenario Selection Library (3 cols) */}
        <div className="lg:col-span-3 space-y-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted block">
            Scenario Library ({scenarios.length})
          </span>
          <div className="space-y-2">
            {scenarios.map((sc) => {
              const isSelected = selectedScenario?.id === sc.id;
              return (
                <div
                  key={sc.id}
                  onClick={() => selectScenario(sc)}
                  className={`p-3 rounded-card border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-surface-2 border-primary shadow-sm'
                      : 'bg-surface border-border hover:bg-surface-2/60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-sm text-fg line-clamp-1">{sc.title}</span>
                    <Badge size="sm" variant="default">{sc.difficulty}</Badge>
                  </div>
                  <p className="text-xs text-muted line-clamp-2 leading-relaxed">{sc.description}</p>
                  <div className="mt-2 text-[10px] font-mono text-muted flex gap-2">
                    <span>{sc.events_count ?? sc.events?.length ?? 0} Events</span>
                    <span>• {sc.domains.join(', ')}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Editor Main Canvas (9 cols) */}
        <div className="lg:col-span-9 space-y-4">
          <Tabs
            tabs={[
              { id: 'form', label: 'Visual Timeline Editor' },
              { id: 'json', label: 'Raw JSON Specification' },
            ]}
            activeTab={activeTab}
            onChange={(id: any) => setActiveTab(id)}
          />

          {activeTab === 'form' ? (
            <div className="space-y-4">
              {/* Scenario Metadata Card */}
              <Card className="p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Scenario Title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                  <Select
                    label="Difficulty Grading"
                    value={difficulty}
                    onChange={(e: any) => setDifficulty(e.target.value)}
                    options={[
                      { value: 'EASY', label: 'EASY' },
                      { value: 'MEDIUM', label: 'MEDIUM' },
                      { value: 'HARD', label: 'HARD' },
                      { value: 'EXTREME', label: 'EXTREME' },
                    ]}
                  />
                </div>

                <Input
                  label="Mission Description & Tactical Objectives"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />

                {/* Domain & Role Chips */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                  <div>
                    <label className="block text-xs font-medium text-fg/80 mb-1.5">
                      Operational Domains Involved:
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {['LAND', 'AIR', 'CYBER', 'EW'].map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => toggleDomain(d)}
                          className={`px-2.5 py-1 text-xs rounded-chip border transition-all ${
                            selectedDomains.includes(d)
                              ? 'bg-primary text-primary-fg border-primary font-medium'
                              : 'bg-surface-2 text-muted border-border'
                          }`}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-fg/80 mb-1.5">
                      Playable Trainee Roles:
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {['LAND', 'AIR', 'CYBER', 'EW'].map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => toggleRole(r)}
                          className={`px-2.5 py-1 text-xs rounded-chip border transition-all ${
                            selectedRoles.includes(r)
                              ? 'bg-primary text-primary-fg border-primary font-medium'
                              : 'bg-surface-2 text-muted border-border'
                          }`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Map Center Coordinates & Intensity */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 text-xs font-mono">
                  <Input
                    label="Center Latitude"
                    type="number"
                    step="0.001"
                    value={centerLat}
                    onChange={(e) => setCenterLat(Number(e.target.value))}
                  />
                  <Input
                    label="Center Longitude"
                    type="number"
                    step="0.001"
                    value={centerLon}
                    onChange={(e) => setCenterLon(Number(e.target.value))}
                  />
                  <div>
                    <label className="block text-xs font-medium text-fg/80 mb-1 font-sans">
                      Default Intensity: {Math.round(defaultIntensity * 100)}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={defaultIntensity}
                      onChange={(e) => setDefaultIntensity(Number(e.target.value))}
                      className="w-full accent-primary h-2 bg-border rounded-lg mt-2 appearance-none cursor-pointer"
                    />
                  </div>
                </div>
              </Card>

              {/* Timed Scenario Events Timeline Table */}
              <Card className="p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <div className="flex items-center gap-2">
                    <Radio className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-semibold text-fg">
                      Timed Scenario Events Sequence ({events.length})
                    </h3>
                  </div>
                  <Button size="sm" variant="outline" onClick={addEvent} className="gap-1.5">
                    <Plus className="w-3.5 h-3.5" /> Add Timed Event
                  </Button>
                </div>

                <div className="space-y-2">
                  {events.map((ev, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-control bg-surface-2/60 border border-border flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="font-mono text-primary font-bold flex items-center gap-1">
                          <span>+</span>
                          <input
                            type="number"
                            value={ev.t_offset_sec}
                            onChange={(e) => updateEvent(idx, 't_offset_sec', Number(e.target.value))}
                            className="w-14 bg-surface border border-border rounded px-1 py-0.5 text-center font-mono"
                          />
                          <span>s</span>
                        </div>
                        <Badge size="sm" variant={ev.event_type === 'TRUTH' ? 'primary' : 'warning'}>
                          {ev.event_type}
                        </Badge>
                      </div>

                      <div className="flex-1 px-2 space-y-1 w-full md:w-auto">
                        <input
                          type="text"
                          value={ev.payload.title || ''}
                          onChange={(e) => updateEvent(idx, 'payload', { ...ev.payload, title: e.target.value })}
                          placeholder="Event Title..."
                          className="w-full bg-surface border border-border rounded px-2 py-1 font-semibold text-fg"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="font-mono text-muted text-[11px]">{ev.source_role}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteEvent(idx)}
                          className="text-danger hover:bg-danger/10 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Coordinates Visual Verification Map */}
              <div className="h-64 rounded-card overflow-hidden border border-border">
                <TacticalMap center={[centerLon, centerLat]} zoom={10} className="h-full w-full" />
              </div>
            </div>
          ) : (
            <Card className="p-4">
              <pre className="p-4 rounded-control bg-surface-2 text-fg font-mono text-xs overflow-x-auto border border-border">
                {JSON.stringify(
                  {
                    title,
                    description,
                    difficulty,
                    center_lat: centerLat,
                    center_lon: centerLon,
                    default_intensity: defaultIntensity,
                    domains: selectedDomains,
                    roles: selectedRoles,
                    events,
                  },
                  null,
                  2
                )}
              </pre>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
