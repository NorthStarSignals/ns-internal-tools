-- NS Internal Tools - Initial Schema
-- RFP Engine + Deal Screener

-- ============ COMPANY PROFILES (shared) ============
CREATE TABLE company_profiles (
  profile_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT NOT NULL,
  company_name TEXT NOT NULL,
  industry TEXT,
  description TEXT,
  capabilities JSONB DEFAULT '[]',
  certifications JSONB DEFAULT '[]',
  past_performance JSONB DEFAULT '[]',
  key_personnel JSONB DEFAULT '[]',
  boilerplate JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============ RFP ENGINE ============
CREATE TABLE rfp_projects (
  project_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  client_name TEXT,
  industry TEXT,
  contract_type TEXT,
  due_date DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'submitted', 'won', 'lost')),
  profile_id UUID REFERENCES company_profiles(profile_id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE rfp_documents (
  document_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES rfp_projects(project_id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INT,
  page_count INT,
  extracted_text JSONB,
  processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE rfp_requirements (
  requirement_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES rfp_projects(project_id) ON DELETE CASCADE,
  document_id UUID REFERENCES rfp_documents(document_id) ON DELETE SET NULL,
  section TEXT,
  requirement_text TEXT NOT NULL,
  requirement_type TEXT DEFAULT 'narrative' CHECK (requirement_type IN ('narrative', 'technical', 'compliance', 'pricing')),
  word_limit INT,
  page_number INT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE rfp_responses (
  response_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requirement_id UUID REFERENCES rfp_requirements(requirement_id) ON DELETE CASCADE,
  project_id UUID REFERENCES rfp_projects(project_id) ON DELETE CASCADE,
  draft_text TEXT,
  edited_text TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'reviewed', 'approved', 'needs_client')),
  ai_confidence NUMERIC,
  kb_source_id UUID,
  edited_by TEXT,
  edited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE rfp_knowledge_base (
  entry_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT NOT NULL,
  requirement_text TEXT NOT NULL,
  response_text TEXT NOT NULL,
  requirement_type TEXT,
  industry TEXT,
  win_status TEXT CHECK (win_status IN ('won', 'lost', 'pending')),
  source_project_id UUID REFERENCES rfp_projects(project_id) ON DELETE SET NULL,
  times_used INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============ DEAL SCREENER ============
CREATE TABLE deals (
  deal_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT NOT NULL,
  deal_name TEXT NOT NULL,
  business_type TEXT,
  asking_price NUMERIC,
  client_name TEXT,
  status TEXT DEFAULT 'uploading' CHECK (status IN ('uploading', 'processing', 'review', 'completed')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE data_room_files (
  file_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES deals(deal_id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INT,
  file_type TEXT,
  document_category TEXT,
  classification_confidence NUMERIC,
  extracted_text TEXT,
  processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'extracting', 'classifying', 'completed', 'failed')),
  page_count INT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE financial_extracts (
  extract_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES deals(deal_id) ON DELETE CASCADE,
  file_id UUID REFERENCES data_room_files(file_id) ON DELETE SET NULL,
  period TEXT,
  revenue NUMERIC,
  cogs NUMERIC,
  gross_margin NUMERIC,
  operating_expenses JSONB,
  net_income NUMERIC,
  ebitda NUMERIC,
  cash_balance NUMERIC,
  debt_outstanding NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE legal_extracts (
  extract_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES deals(deal_id) ON DELETE CASCADE,
  file_id UUID REFERENCES data_room_files(file_id) ON DELETE SET NULL,
  document_type TEXT,
  counterparty TEXT,
  effective_date DATE,
  expiration_date DATE,
  key_terms JSONB,
  change_of_control_clause TEXT,
  termination_provisions TEXT,
  unusual_provisions TEXT,
  risk_level TEXT DEFAULT 'note' CHECK (risk_level IN ('critical', 'warning', 'note')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE red_flags (
  flag_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES deals(deal_id) ON DELETE CASCADE,
  file_id UUID REFERENCES data_room_files(file_id) ON DELETE SET NULL,
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'warning', 'note')),
  category TEXT CHECK (category IN ('financial', 'legal', 'operational', 'concentration')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  source_reference TEXT,
  recommendation TEXT,
  analyst_notes TEXT,
  analyst_override_severity TEXT,
  is_dismissed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE deal_benchmarks (
  benchmark_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES deals(deal_id) ON DELETE CASCADE,
  metric_name TEXT NOT NULL,
  deal_value NUMERIC,
  benchmark_median NUMERIC,
  benchmark_p25 NUMERIC,
  benchmark_p75 NUMERIC,
  sample_size INT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============ INDEXES ============
CREATE INDEX idx_company_profiles_user ON company_profiles(clerk_user_id);
CREATE INDEX idx_rfp_projects_user ON rfp_projects(clerk_user_id);
CREATE INDEX idx_rfp_documents_project ON rfp_documents(project_id);
CREATE INDEX idx_rfp_requirements_project ON rfp_requirements(project_id);
CREATE INDEX idx_rfp_responses_project ON rfp_responses(project_id);
CREATE INDEX idx_rfp_responses_requirement ON rfp_responses(requirement_id);
CREATE INDEX idx_rfp_kb_user ON rfp_knowledge_base(clerk_user_id);
CREATE INDEX idx_deals_user ON deals(clerk_user_id);
CREATE INDEX idx_data_room_files_deal ON data_room_files(deal_id);
CREATE INDEX idx_financial_extracts_deal ON financial_extracts(deal_id);
CREATE INDEX idx_legal_extracts_deal ON legal_extracts(deal_id);
CREATE INDEX idx_red_flags_deal ON red_flags(deal_id);
CREATE INDEX idx_deal_benchmarks_deal ON deal_benchmarks(deal_id);

-- ============ RLS (permissive for MVP) ============
ALTER TABLE company_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE rfp_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE rfp_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE rfp_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE rfp_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE rfp_knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_room_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_extracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_extracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE red_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_benchmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all" ON company_profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON rfp_projects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON rfp_documents FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON rfp_requirements FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON rfp_responses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON rfp_knowledge_base FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON deals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON data_room_files FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON financial_extracts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON legal_extracts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON red_flags FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON deal_benchmarks FOR ALL USING (true) WITH CHECK (true);
