export interface DashboardMetrics {
  total_novels: number;
  total_lookups: number;
  total_lookups_today: number;
  successful_lookups: number;
  failed_lookups: number;
  success_rate: number;
  avg_response_time_ms: number;
  unique_novels_scanned: number;
}

export interface MetricTrends {
  lookups_change_percent: number;
  success_rate_change_percent: number;
  response_time_change_percent: number;
}

export interface TimelineData {
  timestamp: string;
  lookups: number;
  successful: number;
  failed: number;
  avg_response_time: number;
}

export interface TopNovel {
  novel_id: string;
  title: string;
  language: string;
  scan_count: number;
  success_count: number;
  success_rate: number;
}

export interface FailedPattern {
  line1: string;
  line2: string;
  line3: string;
  count: number;
  last_attempt: string;
}
