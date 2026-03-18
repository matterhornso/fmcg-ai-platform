export interface Audit {
  id: string;
  title: string;
  type: string;
  product: string | null;
  supplier: string | null;
  location: string | null;
  status: string;
  checklist: string | null;  // JSON string
  findings: string | null;   // JSON string
  corrective_actions: string | null; // JSON string
  score: number | null;
  ai_analysis: string | null; // JSON string
  created_at: string;
  updated_at: string;
}

export interface Complaint {
  id: string;
  complaint_ref: string;
  customer_name: string;
  customer_country: string;
  product: string;
  batch_number: string | null;
  complaint_date: string;
  description: string;
  category: string | null;
  priority: string | null;
  status: string;
  root_cause: string | null;
  resolution: string | null;
  response_draft: string | null;
  ai_analysis: string | null;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  customer_name: string;
  destination_country: string;
  invoice_date: string;
  items: string; // JSON string
  total_amount: number | null;
  currency: string;
  payment_terms: string | null;
  incoterms: string | null;
  status: string;
  compliance_check: string | null;
  ai_analysis: string | null;
  documents_required: string | null;
  created_at: string;
  updated_at: string;
}

export interface BatchTrace {
  id: string;
  batch_number: string;
  product: string;
  plant: string;
  production_date: string;
  raw_materials: string | null;
  quality_checks: string | null;
  process_log: string | null;
  shipments: string | null;
  created_at: string;
}

export interface HealthResponse {
  status: string;
  timestamp: string;
  aiEnabled: boolean;
  message: string;
  database?: string;
  uptime?: number;
  memory?: { rss: number; heapUsed: number; heapTotal: number };
  cache?: { size: number; maxSize: number };
}

export interface DashboardAuditStats {
  total: number;
  completed: number;
  in_progress: number;
  pending: number;
  avg_score: number | null;
}

export interface DashboardComplaintStats {
  total: number;
  open: number;
  resolved: number;
  critical: number;
}

export interface DashboardFinanceStats {
  total: number;
  approved_value: number | null;
  pending_review: number;
  countries: number;
}

export interface CountRow {
  c: number;
  t?: number | null;
}
