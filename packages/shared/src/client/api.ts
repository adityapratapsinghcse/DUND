import {
  User, AuthTokens, Scenario, Exercise, TraineeReport, Decision,
  AARData, Scorecard, AdminStats, SystemSettings, AuditLog, CommLink, JammingZone
} from '../types/index.js';

export interface ApiClientConfig {
  baseUrl: string;
  getTokens?: () => { access: string | null; refresh: string | null };
  setTokens?: (tokens: { access: string; refresh: string }) => void;
  onUnauthorized?: () => void;
}

export class ApiClient {
  private baseUrl: string;
  private getTokens: () => { access: string | null; refresh: string | null };
  private setTokens: (tokens: { access: string; refresh: string }) => void;
  private onUnauthorized: () => void;
  private isRefreshing = false;

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, '');
    this.getTokens = config.getTokens || (() => ({ access: null, refresh: null }));
    this.setTokens = config.setTokens || (() => {});
    this.onUnauthorized = config.onUnauthorized || (() => {});
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
    const tokens = this.getTokens();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (tokens.access && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${tokens.access}`;
    }

    let response = await fetch(url, { ...options, headers });

    // Handle 401 token refresh retry
    if (response.status === 401 && tokens.refresh && !this.isRefreshing && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/refresh')) {
      this.isRefreshing = true;
      try {
        const refreshRes = await fetch(`${this.baseUrl}/api/auth/refresh/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh: tokens.refresh }),
        });

        if (refreshRes.ok) {
          const newTokens = await refreshRes.json();
          this.setTokens({ access: newTokens.access, refresh: tokens.refresh });
          headers['Authorization'] = `Bearer ${newTokens.access}`;
          response = await fetch(url, { ...options, headers });
        } else {
          this.onUnauthorized();
        }
      } catch (e) {
        this.onUnauthorized();
      } finally {
        this.isRefreshing = false;
      }
    }

    if (!response.ok) {
      let errorMsg = `HTTP Error ${response.status}`;
      try {
        const errJson = await response.json();
        errorMsg = errJson.error || errJson.detail || JSON.stringify(errJson);
      } catch (_) {}
      throw new Error(errorMsg);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  // --- Auth Endpoints ---
  async login(credentials: { username: string; password: string }): Promise<AuthTokens> {
    return this.request<AuthTokens>('/api/auth/login/', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async register(data: Record<string, any>): Promise<User> {
    return this.request<User>('/api/auth/register/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getMe(): Promise<User> {
    return this.request<User>('/api/auth/me/');
  }

  async updateMe(data: Partial<User>): Promise<User> {
    return this.request<User>('/api/auth/me/', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // --- Scenarios Endpoints ---
  async getScenarios(): Promise<Scenario[]> {
    return this.request<Scenario[]>('/api/scenarios/');
  }

  async getScenario(id: number): Promise<Scenario> {
    return this.request<Scenario>(`/api/scenarios/${id}/`);
  }

  async createScenario(scenario: Partial<Scenario>): Promise<Scenario> {
    return this.request<Scenario>('/api/scenarios/', {
      method: 'POST',
      body: JSON.stringify(scenario),
    });
  }

  async updateScenario(id: number, scenario: Partial<Scenario>): Promise<Scenario> {
    return this.request<Scenario>(`/api/scenarios/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(scenario),
    });
  }

  async deleteScenario(id: number): Promise<void> {
    return this.request<void>(`/api/scenarios/${id}/`, {
      method: 'DELETE',
    });
  }

  // --- Exercises Endpoints ---
  async getExercises(): Promise<Exercise[]> {
    return this.request<Exercise[]>('/api/exercises/');
  }

  async getExercise(id: number): Promise<Exercise> {
    return this.request<Exercise>(`/api/exercises/${id}/`);
  }

  async createExercise(data: { scenario: number; intensity?: number }): Promise<Exercise> {
    return this.request<Exercise>('/api/exercises/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async joinExercise(join_code: string, role: string): Promise<any> {
    return this.request<any>('/api/exercises/join/', {
      method: 'POST',
      body: JSON.stringify({ join_code, role }),
    });
  }

  async startExercise(id: number): Promise<{ status: string; elapsed_sec: number }> {
    return this.request<{ status: string; elapsed_sec: number }>(`/api/exercises/${id}/start/`, { method: 'POST' });
  }

  async pauseExercise(id: number): Promise<{ status: string; elapsed_sec: number }> {
    return this.request<{ status: string; elapsed_sec: number }>(`/api/exercises/${id}/pause/`, { method: 'POST' });
  }

  async resumeExercise(id: number): Promise<{ status: string; elapsed_sec: number }> {
    return this.request<{ status: string; elapsed_sec: number }>(`/api/exercises/${id}/resume/`, { method: 'POST' });
  }

  async endExercise(id: number): Promise<{ status: string; elapsed_sec: number }> {
    return this.request<{ status: string; elapsed_sec: number }>(`/api/exercises/${id}/end/`, { method: 'POST' });
  }

  async setExerciseIntensity(id: number, intensity: number): Promise<{ intensity: number }> {
    return this.request<{ intensity: number }>(`/api/exercises/${id}/intensity/`, {
      method: 'POST',
      body: JSON.stringify({ intensity }),
    });
  }

  async getExerciseLinks(id: number): Promise<CommLink[]> {
    return this.request<CommLink[]>(`/api/exercises/${id}/links/`);
  }

  async updateExerciseLink(id: number, linkData: Partial<CommLink>): Promise<CommLink> {
    return this.request<CommLink>(`/api/exercises/${id}/links/`, {
      method: 'POST',
      body: JSON.stringify(linkData),
    });
  }

  async getExerciseJamming(id: number): Promise<JammingZone[]> {
    return this.request<JammingZone[]>(`/api/exercises/${id}/jamming/`);
  }

  async addJammingZone(id: number, zoneData: Partial<JammingZone>): Promise<JammingZone> {
    return this.request<JammingZone>(`/api/exercises/${id}/jamming/`, {
      method: 'POST',
      body: JSON.stringify(zoneData),
    });
  }

  async injectEvent(id: number, injectData: Record<string, any>): Promise<any> {
    return this.request<any>(`/api/exercises/${id}/inject/`, {
      method: 'POST',
      body: JSON.stringify(injectData),
    });
  }

  async getExerciseMonitor(id: number): Promise<any> {
    return this.request<any>(`/api/exercises/${id}/monitor/`);
  }

  async getTraineeFeed(id: number, sinceId?: number): Promise<{ status: string; elapsed_sec: number; bars: number; quality: number; reports: TraineeReport[] }> {
    const query = sinceId ? `?since=${sinceId}` : '';
    return this.request<any>(`/api/exercises/${id}/feed/${query}`);
  }

  async setPosition(id: number, lat: number, lon: number): Promise<{ status: string; lat: number; lon: number }> {
    return this.request<{ status: string; lat: number; lon: number }>(`/api/exercises/${id}/position/`, {
      method: 'POST',
      body: JSON.stringify({ lat, lon }),
    });
  }

  async getDecisions(id: number): Promise<Decision[]> {
    return this.request<Decision[]>(`/api/exercises/${id}/decisions/`);
  }

  async submitDecision(id: number, data: { action_type: string; self_confidence: number; truth_event?: number; details?: Record<string, any> }): Promise<Decision> {
    return this.request<Decision>(`/api/exercises/${id}/decisions/`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getAAR(id: number): Promise<AARData> {
    return this.request<AARData>(`/api/exercises/${id}/aar/`);
  }

  async getScorecard(id: number): Promise<any> {
    return this.request<any>(`/api/exercises/${id}/scorecard/`);
  }

  // --- Admin Endpoints ---
  async getAdminStats(): Promise<AdminStats> {
    return this.request<AdminStats>('/api/admin/stats/');
  }

  async getAdminUsers(params?: { role?: string; search?: string; is_active?: boolean; page?: number }): Promise<any> {
    const searchParams = new URLSearchParams();
    if (params?.role) searchParams.set('role', params.role);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.is_active !== undefined) searchParams.set('is_active', String(params.is_active));
    if (params?.page) searchParams.set('page', String(params.page));
    const qs = searchParams.toString();
    return this.request<any>(`/api/admin/users/${qs ? `?${qs}` : ''}`);
  }

  async createAdminUser(userData: Partial<User> & { password?: string }): Promise<User & { _raw_password?: string }> {
    return this.request<any>('/api/admin/users/', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async updateAdminUser(id: number, userData: Partial<User>): Promise<User> {
    return this.request<User>(`/api/admin/users/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(userData),
    });
  }

  async resetUserPassword(id: number): Promise<{ temporary_password: string }> {
    return this.request<{ temporary_password: string }>(`/api/admin/users/${id}/reset-password/`, {
      method: 'POST',
    });
  }

  async toggleUserActive(id: number): Promise<{ is_active: boolean }> {
    return this.request<{ is_active: boolean }>(`/api/admin/users/${id}/toggle-active/`, {
      method: 'POST',
    });
  }

  async getAdminExercises(params?: { status?: string; instructor?: number; page?: number }): Promise<any> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.instructor) searchParams.set('instructor', String(params.instructor));
    if (params?.page) searchParams.set('page', String(params.page));
    const qs = searchParams.toString();
    return this.request<any>(`/api/admin/exercises/${qs ? `?${qs}` : ''}`);
  }

  async forceEndExercise(id: number): Promise<any> {
    return this.request<any>(`/api/admin/exercises/${id}/force-end/`, {
      method: 'POST',
    });
  }

  async getAdminAuditLogs(params?: { action?: string; page?: number }): Promise<any> {
    const searchParams = new URLSearchParams();
    if (params?.action) searchParams.set('action', params.action);
    if (params?.page) searchParams.set('page', String(params.page));
    const qs = searchParams.toString();
    return this.request<any>(`/api/admin/audit/${qs ? `?${qs}` : ''}`);
  }

  async getSystemSettings(): Promise<SystemSettings> {
    return this.request<SystemSettings>('/api/admin/settings/');
  }

  async updateSystemSettings(settings: Partial<SystemSettings>): Promise<SystemSettings> {
    return this.request<SystemSettings>('/api/admin/settings/', {
      method: 'PATCH',
      body: JSON.stringify(settings),
    });
  }
}
