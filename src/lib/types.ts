// ============ RFP ENGINE ============

export interface RfpProject {
  project_id: string;
  clerk_user_id: string;
  name: string;
  client_name: string | null;
  industry: string | null;
  contract_type: string | null;
  due_date: string | null;
  status: "active" | "submitted" | "won" | "lost";
  profile_id: string | null;
  created_at: string;
  updated_at: string;
  // computed
  requirement_count?: number;
  response_count?: number;
  approved_count?: number;
}

export interface RfpDocument {
  document_id: string;
  project_id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  page_count: number | null;
  extracted_text: { page: number; text: string }[] | null;
  processing_status: "pending" | "processing" | "completed" | "failed";
  created_at: string;
}

export interface RfpRequirement {
  requirement_id: string;
  project_id: string;
  document_id: string | null;
  section: string | null;
  requirement_text: string;
  requirement_type: "narrative" | "technical" | "compliance" | "pricing";
  word_limit: number | null;
  page_number: number | null;
  sort_order: number;
  created_at: string;
}

export interface RfpResponse {
  response_id: string;
  requirement_id: string;
  project_id: string;
  draft_text: string | null;
  edited_text: string | null;
  status: "draft" | "reviewed" | "approved" | "needs_client";
  ai_confidence: number | null;
  kb_source_id: string | null;
  edited_by: string | null;
  edited_at: string | null;
  created_at: string;
  // joined
  requirement?: RfpRequirement;
}

export interface CompanyProfile {
  profile_id: string;
  clerk_user_id: string;
  company_name: string;
  industry: string | null;
  description: string | null;
  capabilities: string[];
  certifications: string[];
  past_performance: PastPerformance[];
  key_personnel: KeyPerson[];
  boilerplate: Record<string, string>;
  created_at: string;
  updated_at: string;
}

export interface PastPerformance {
  project_name: string;
  client: string;
  value: string;
  description: string;
}

export interface KeyPerson {
  name: string;
  title: string;
  bio: string;
}

export interface KnowledgeBaseEntry {
  entry_id: string;
  clerk_user_id: string;
  requirement_text: string;
  response_text: string;
  requirement_type: string | null;
  industry: string | null;
  win_status: "won" | "lost" | "pending" | null;
  source_project_id: string | null;
  times_used: number;
  created_at: string;
}

// ============ DEAL SCREENER ============

export interface Deal {
  deal_id: string;
  clerk_user_id: string;
  deal_name: string;
  business_type: string | null;
  asking_price: number | null;
  client_name: string | null;
  status: "uploading" | "processing" | "review" | "completed";
  created_at: string;
  updated_at: string;
  // computed
  file_count?: number;
  critical_count?: number;
  warning_count?: number;
  note_count?: number;
}

export interface DataRoomFile {
  file_id: string;
  deal_id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  file_type: string | null;
  document_category: DocumentCategory | null;
  classification_confidence: number | null;
  extracted_text: string | null;
  processing_status: "pending" | "extracting" | "classifying" | "completed" | "failed";
  page_count: number | null;
  created_at: string;
}

export type DocumentCategory =
  | "tax_return"
  | "bank_statement"
  | "pnl"
  | "balance_sheet"
  | "cash_flow"
  | "lease"
  | "vendor_contract"
  | "customer_contract"
  | "employee_agreement"
  | "insurance"
  | "license_permit"
  | "operating_agreement"
  | "other";

export interface FinancialExtract {
  extract_id: string;
  deal_id: string;
  file_id: string | null;
  period: string;
  revenue: number | null;
  cogs: number | null;
  gross_margin: number | null;
  operating_expenses: Record<string, number> | null;
  net_income: number | null;
  ebitda: number | null;
  cash_balance: number | null;
  debt_outstanding: number | null;
  created_at: string;
}

export interface LegalExtract {
  extract_id: string;
  deal_id: string;
  file_id: string | null;
  document_type: string | null;
  counterparty: string | null;
  effective_date: string | null;
  expiration_date: string | null;
  key_terms: Record<string, string> | null;
  change_of_control_clause: string | null;
  termination_provisions: string | null;
  unusual_provisions: string | null;
  risk_level: "critical" | "warning" | "note";
  created_at: string;
}

export interface RedFlag {
  flag_id: string;
  deal_id: string;
  file_id: string | null;
  severity: "critical" | "warning" | "note";
  category: "financial" | "legal" | "operational" | "concentration";
  title: string;
  description: string;
  source_reference: string | null;
  recommendation: string | null;
  analyst_notes: string | null;
  analyst_override_severity: string | null;
  is_dismissed: boolean;
  created_at: string;
}

export interface DealBenchmark {
  benchmark_id: string;
  deal_id: string;
  metric_name: string;
  deal_value: number | null;
  benchmark_median: number | null;
  benchmark_p25: number | null;
  benchmark_p75: number | null;
  sample_size: number | null;
  created_at: string;
}
