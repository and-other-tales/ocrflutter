export interface ApiKey {
  id: string;
  name: string;
  key: string;
  user_id?: string;
  app_name?: string;
  rate_limit: number;
  usage_count: number;
  last_used_at?: string;
  created_at: string;
  expires_at?: string;
  is_active: boolean;
}

export interface ApiKeyFormData {
  name: string;
  app_name?: string;
  rate_limit: number;
  expires_at?: string;
}

export interface ApiKeyUsage {
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  rate_limit_hits: number;
  avg_response_time_ms: number;
}

export interface ApiKeyUsageTimeline {
  date: string;
  requests: number;
  successful: number;
  failed: number;
}
