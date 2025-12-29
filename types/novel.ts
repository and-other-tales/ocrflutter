export interface Novel {
  id: string;
  title: string;
  isbn?: string;
  line1: string;          // "the storm was"
  line2: string;          // "unlike any other"
  line3: string;          // "felix had seen"
  line1_raw?: string;     // Full line for reference
  line2_raw?: string;
  line3_raw?: string;
  url: string;
  language: string;       // 'en', 'sv', 'it'
  chapter?: string;
  page_number?: number;
  unlock_content?: string;
  metadata?: Record<string, any>;
  created_at: Date;
  updated_at: Date;
  created_by?: string;
  scan_count?: number;
}

export interface NovelFormData {
  title: string;
  isbn?: string;
  line1: string;
  line2: string;
  line3: string;
  line1_raw?: string;
  line2_raw?: string;
  line3_raw?: string;
  url: string;
  language: string;
  chapter?: string;
  page_number?: number;
  unlock_content?: string;
  metadata?: Record<string, any>;
}

export interface NovelStats {
  total_scans: number;
  successful_scans: number;
  last_scanned?: string;
  first_scanned?: string;
}
