import { ApiResponse, PaginationParams, ListResponse } from '@/types/api';
import { Novel, NovelFormData } from '@/types/novel';
import { LookupLog, LogDetail } from '@/types/log';
import { ApiKey, ApiKeyFormData, ApiKeyUsage } from '@/types/api-key';
import { DashboardMetrics, TimelineData, TopNovel, FailedPattern } from '@/types/analytics';

class ApiClient {
  private baseURL: string;
  private authToken?: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  setAuthToken(token: string) {
    this.authToken = token;
  }

  clearAuthToken() {
    this.authToken = undefined;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(this.authToken && {
        Authorization: `Bearer ${this.authToken}`,
      }),
      ...options.headers,
    };

    const response = await fetch(url, { ...options, headers });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        error: response.statusText,
      }));
      throw new Error(error.error || `API Error: ${response.statusText}`);
    }

    return response.json();
  }

  // Auth endpoints
  async login(email: string, password: string) {
    return this.request<ApiResponse>('/api/admin/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async logout() {
    return this.request<ApiResponse>('/api/admin/auth/logout', {
      method: 'POST',
    });
  }

  async verifyToken() {
    return this.request<ApiResponse>('/api/admin/auth/verify');
  }

  // Novel endpoints
  async getNovels(params?: PaginationParams & {
    search?: string;
    language?: string;
    sort?: string;
    order?: 'asc' | 'desc';
  }) {
    const query = new URLSearchParams(params as any).toString();
    return this.request<ApiResponse<{ novels: Novel[]; pagination: any }>>(
      `/api/admin/novels${query ? `?${query}` : ''}`
    );
  }

  async getNovel(id: string) {
    return this.request<ApiResponse<{ novel: Novel }>>(
      `/api/admin/novels/${id}`
    );
  }

  async createNovel(data: NovelFormData) {
    return this.request<ApiResponse<{ novel: Novel }>>('/api/admin/novels', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateNovel(id: string, data: Partial<NovelFormData>) {
    return this.request<ApiResponse<{ novel: Novel }>>(
      `/api/admin/novels/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      }
    );
  }

  async deleteNovel(id: string) {
    return this.request<ApiResponse>(`/api/admin/novels/${id}`, {
      method: 'DELETE',
    });
  }

  async bulkImportNovels(novels: NovelFormData[], options?: {
    skip_duplicates?: boolean;
    validate_only?: boolean;
  }) {
    return this.request<ApiResponse>('/api/admin/novels/bulk-import', {
      method: 'POST',
      body: JSON.stringify({ novels, options }),
    });
  }

  // Analytics endpoints
  async getAnalyticsOverview(params?: {
    start_date?: string;
    end_date?: string;
  }) {
    const query = new URLSearchParams(params as any).toString();
    return this.request<ApiResponse<{
      metrics: DashboardMetrics;
      trends: any;
    }>>(`/api/admin/analytics/overview${query ? `?${query}` : ''}`);
  }

  async getAnalyticsTimeline(params: {
    start_date: string;
    end_date: string;
    interval?: 'hour' | 'day' | 'week' | 'month';
  }) {
    const query = new URLSearchParams(params as any).toString();
    return this.request<ApiResponse<{ timeline: TimelineData[] }>>(
      `/api/admin/analytics/timeline?${query}`
    );
  }

  async getTopNovels(params?: {
    limit?: number;
    start_date?: string;
    end_date?: string;
  }) {
    const query = new URLSearchParams(params as any).toString();
    return this.request<ApiResponse<{ novels: TopNovel[] }>>(
      `/api/admin/analytics/top-novels${query ? `?${query}` : ''}`
    );
  }

  async getFailedPatterns(params?: { limit?: number }) {
    const query = new URLSearchParams(params as any).toString();
    return this.request<ApiResponse<{ patterns: FailedPattern[] }>>(
      `/api/admin/analytics/failed-patterns${query ? `?${query}` : ''}`
    );
  }

  // Logs endpoints
  async getLogs(params?: PaginationParams & {
    start_date?: string;
    end_date?: string;
    status?: 'success' | 'failure';
    novel_id?: string;
    ip_address?: string;
  }) {
    const query = new URLSearchParams(params as any).toString();
    return this.request<ApiResponse<{
      logs: LookupLog[];
      pagination: any;
    }>>(`/api/admin/logs${query ? `?${query}` : ''}`);
  }

  async getLog(id: string) {
    return this.request<ApiResponse<{ log: LogDetail }>>(
      `/api/admin/logs/${id}`
    );
  }

  // Test endpoint
  async testLookup(data: {
    line1: string[];
    line2: string[];
    line3: string[];
  }) {
    return this.request<ApiResponse>('/api/admin/test-lookup', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // API Key endpoints
  async getApiKeys() {
    return this.request<ApiResponse<{ api_keys: ApiKey[] }>>(
      '/api/admin/api-keys'
    );
  }

  async createApiKey(data: ApiKeyFormData) {
    return this.request<ApiResponse<{ api_key: ApiKey }>>(
      '/api/admin/api-keys',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  }

  async updateApiKey(id: string, data: Partial<ApiKeyFormData>) {
    return this.request<ApiResponse<{ api_key: ApiKey }>>(
      `/api/admin/api-keys/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      }
    );
  }

  async deleteApiKey(id: string) {
    return this.request<ApiResponse>(`/api/admin/api-keys/${id}`, {
      method: 'DELETE',
    });
  }

  async getApiKeyUsage(id: string, params?: {
    start_date?: string;
    end_date?: string;
  }) {
    const query = new URLSearchParams(params as any).toString();
    return this.request<ApiResponse<{ usage: ApiKeyUsage; timeline: any[] }>>(
      `/api/admin/api-keys/${id}/usage${query ? `?${query}` : ''}`
    );
  }
}

export const apiClient = new ApiClient(
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
);
