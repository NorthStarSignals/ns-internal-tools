-- NS Time Tracker Schema

CREATE TABLE tt_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  pay_type TEXT CHECK (pay_type IN ('hourly', 'retainer', 'milestone')),
  hourly_rate DECIMAL,
  retainer_amount DECIMAL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE tt_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  client TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE tt_time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES tt_users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES tt_projects(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  hours DECIMAL NOT NULL,
  notes TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE tt_pay_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_tt_users_clerk ON tt_users(clerk_user_id);
CREATE INDEX idx_tt_time_entries_user ON tt_time_entries(user_id);
CREATE INDEX idx_tt_time_entries_project ON tt_time_entries(project_id);
CREATE INDEX idx_tt_time_entries_date ON tt_time_entries(date);
CREATE INDEX idx_tt_time_entries_status ON tt_time_entries(status);

-- RLS (permissive for MVP)
ALTER TABLE tt_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tt_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tt_time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE tt_pay_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all" ON tt_users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON tt_projects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON tt_time_entries FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON tt_pay_periods FOR ALL USING (true) WITH CHECK (true);

-- Seed projects
INSERT INTO tt_projects (name, client) VALUES
  ('SeatSignals', NULL),
  ('Mayo Clinic', 'Mayo Clinic'),
  ('Zendesk', 'Zendesk'),
  ('Ouroboros', NULL),
  ('LinkedIn Engine', NULL),
  ('Email Engine', NULL),
  ('Polaris', NULL),
  ('SmartHead', 'Tonya'),
  ('Outbound Ops', NULL),
  ('North Star Admin', NULL),
  ('North Star Legal', NULL),
  ('Internal Tools', NULL),
  ('Colibri Group', 'Colibri Group');

-- Seed contractors (clerk_user_id will be linked on first login)
INSERT INTO tt_users (name, email, role, pay_type, hourly_rate, retainer_amount) VALUES
  ('Malik Alexander', 'malik@northstarsignals.com', 'admin', NULL, NULL, NULL),
  ('Alison Cordoba', 'alison@northstarsignals.com', 'member', 'retainer', NULL, 2000),
  ('Saif', 'saif@northstarsignals.com', 'member', 'hourly', 30, NULL),
  ('Keerthana Adamana', 'keerthana@northstarsignals.com', 'member', 'hourly', 40, NULL),
  ('Gourav Kumar Singh', 'gourav@northstarsignals.com', 'member', 'milestone', NULL, NULL),
  ('Kaylie Johnson', 'kaylie@northstarsignals.com', 'member', 'hourly', 30, NULL),
  ('Taylor Hardy', 'gunner@northstarsignals.com', 'member', 'hourly', 30, NULL),
  ('Aaron Ghosh', 'aaron@northstarsignals.com', 'member', 'hourly', 30, NULL),
  ('Matthew Pieti', 'matthew@northstarsignals.com', 'member', 'hourly', 30, NULL),
  ('Abdirahman Sheikh', 'abdirahman@northstarsignals.com', 'member', 'hourly', 30, NULL),
  ('Pranav Vunnam', 'pranav@northstarsignals.com', 'member', 'hourly', 30, NULL),
  ('Nishita', 'nishita@northstarsignals.com', 'member', 'hourly', NULL, NULL);
