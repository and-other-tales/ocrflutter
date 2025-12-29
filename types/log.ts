export interface LookupLog {
  id: string;
  timestamp: string;
  line1: string;
  line2: string;
  line3: string;
  matched_novel_id?: string;
  matched_novel_title?: string;
  success: boolean;
  response_time_ms: number;
  ip_address?: string;
  user_agent?: string;
  request_id?: string;
  geolocation?: {
    country?: string;
    city?: string;
  };
}

export interface LogRequest {
  lines: string[][];
  headers: Record<string, string>;
}

export interface LogResponse {
  url?: string;
  match: boolean;
  title?: string;
}

export interface LogDetail extends LookupLog {
  request: LogRequest;
  response: LogResponse;
}
