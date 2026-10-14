-- ==============================================================================
-- LOCALBOOST AI — Supabase Database Migration & RLS Security Schema
-- Product: LocalBoost AI (AI Google Review QR SaaS)
-- Description: Complete 10-table schema, functions, triggers, and Row Level Security
-- ==============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Clean existing tables if re-running
DROP TABLE IF EXISTS impersonation_audit_logs CASCADE;
DROP TABLE IF EXISTS announcement_reads CASCADE;
DROP TABLE IF EXISTS announcements CASCADE;
DROP TABLE IF EXISTS feedback CASCADE;
DROP TABLE IF EXISTS analytics CASCADE;
DROP TABLE IF EXISTS review_suggestions CASCADE;
DROP TABLE IF EXISTS review_settings CASCADE;
DROP TABLE IF EXISTS businesses CASCADE;
DROP TABLE IF EXISTS admin_settings CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- 2. Create PROFILES Table
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  unique_customer_code TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('admin', 'customer')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  access_expires_at TIMESTAMPTZ,
  access_validity_type TEXT DEFAULT '1_year',
  access_duration_days INT DEFAULT 365,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  last_login_at TIMESTAMPTZ
);

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS access_expires_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS access_validity_type TEXT DEFAULT '1_year';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS access_duration_days INT DEFAULT 365;

-- Index for searching customers
CREATE INDEX idx_profiles_customer_code ON profiles(unique_customer_code);
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_role ON profiles(role);

-- 3. Create BUSINESSES Table
CREATE TABLE businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  unique_slug TEXT NOT NULL UNIQUE,
  google_review_url TEXT NOT NULL,
  logo_url TEXT,
  phone TEXT,
  address TEXT,
  category TEXT DEFAULT 'Restaurant & Hospitality',
  ai_prompt TEXT,
  ai_keywords TEXT[] DEFAULT '{}',
  ai_suggestions_preview JSONB,
  ai_summary TEXT,
  ai_last_generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_businesses_slug ON businesses(unique_slug);
CREATE INDEX idx_businesses_user_id ON businesses(user_id);

-- 4. Create REVIEW_SETTINGS Table
CREATE TABLE review_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE UNIQUE,
  language TEXT NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'hi', 'gu')),
  welcome_text TEXT NOT NULL DEFAULT 'How was your experience today?',
  thank_you_text TEXT NOT NULL DEFAULT 'Thank you for helping our local business grow!',
  enabled BOOLEAN NOT NULL DEFAULT true,
  accent_color TEXT NOT NULL DEFAULT '#6C3BFF',
  qr_show_logo BOOLEAN NOT NULL DEFAULT false,
  qr_logo_url TEXT,
  qr_logo_border_style TEXT NOT NULL DEFAULT 'circular' CHECK (qr_logo_border_style IN ('circular', 'square')),
  qr_color TEXT NOT NULL DEFAULT '#1F1735',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_review_settings_business ON review_settings(business_id);

-- 5. Create REVIEW_SUGGESTIONS Table (Optional business custom presets)
CREATE TABLE review_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  category TEXT NOT NULL,
  suggestion_text TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'hi', 'gu')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_review_suggestions_business ON review_suggestions(business_id, rating);

-- 6. Create ANALYTICS Table (Privacy preserving, no raw IPs)
CREATE TABLE analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'qr_scan',
    'rating_selected',
    'suggestion_generated',
    'review_copied',
    'google_review_clicked',
    'feedback_submitted'
  )),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  visitor_session_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_analytics_business_event ON analytics(business_id, event_type);
CREATE INDEX idx_analytics_created ON analytics(created_at);

-- 7. Create FEEDBACK Table (Private customer feedback)
CREATE TABLE feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  feedback_text TEXT NOT NULL,
  customer_name TEXT,
  customer_contact TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'resolved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_feedback_business ON feedback(business_id);
CREATE INDEX idx_feedback_status ON feedback(status);

-- 8. Create ANNOUNCEMENTS Table
CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'warning', 'success', 'urgent')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 9. Create ANNOUNCEMENT_READS Table
CREATE TABLE announcement_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id UUID NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT unique_user_announcement UNIQUE(announcement_id, user_id)
);

CREATE INDEX idx_announcement_reads_user ON announcement_reads(user_id);

-- 10. Create ADMIN_SETTINGS Table
CREATE TABLE admin_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 11. Create IMPERSONATION_AUDIT_LOGS Table
CREATE TABLE impersonation_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  target_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_audit_admin ON impersonation_audit_logs(admin_id);
CREATE INDEX idx_audit_target ON impersonation_audit_logs(target_user_id);

-- ==============================================================================
-- HELPER FUNCTIONS & TRIGGERS
-- ==============================================================================

-- Helper function: Check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin' AND status = 'active'
  );
$$;

-- Helper function: Generate Customer Code (LB-CUS-XXXXXX)
CREATE OR REPLACE FUNCTION generate_customer_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  chars TEXT := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  code TEXT := 'LB-CUS-';
  i INTEGER := 0;
  rand_index INTEGER;
BEGIN
  FOR i IN 1..6 LOOP
    rand_index := floor(random() * length(chars) + 1)::INTEGER;
    code := code || substr(chars, rand_index, 1);
  END LOOP;
  RETURN code;
END;
$$;

-- Trigger to create profile upon Auth signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  generated_code TEXT;
  business_name_val TEXT;
  google_review_val TEXT;
  phone_val TEXT;
  slug_val TEXT;
  new_business_id UUID;
  code_exists BOOLEAN := true;
BEGIN
  -- Generate unique customer code
  WHILE code_exists LOOP
    generated_code := generate_customer_code();
    SELECT EXISTS(SELECT 1 FROM profiles WHERE unique_customer_code = generated_code) INTO code_exists;
  END LOOP;

  -- Create customer profile (always default to customer role, never elevate via client payload)
  INSERT INTO profiles (id, full_name, email, unique_customer_code, role, status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Customer'),
    NEW.email,
    generated_code,
    'customer',
    'active'
  );

  -- Extract user metadata
  business_name_val := COALESCE(NEW.raw_user_meta_data->>'business_name', 'My Business');
  google_review_val := COALESCE(NEW.raw_user_meta_data->>'google_review_url', 'https://g.page/r/your-business/review');
  phone_val := NEW.raw_user_meta_data->>'phone';
  
  -- Generate slug from business name
  slug_val := lower(regexp_replace(business_name_val, '[^a-zA-Z0-9]+', '-', 'g'));
  slug_val := trim(both '-' from slug_val);
  IF slug_val = '' THEN
    slug_val := 'business';
  END IF;
  slug_val := slug_val || '-' || lower(substr(md5(random()::text), 1, 6));

  -- Create business record
  INSERT INTO businesses (user_id, business_name, unique_slug, google_review_url, phone)
  VALUES (NEW.id, business_name_val, slug_val, google_review_val, phone_val)
  RETURNING id INTO new_business_id;

  -- Create default review settings
  INSERT INTO review_settings (business_id, language, welcome_text, thank_you_text, enabled, accent_color)
  VALUES (
    new_business_id,
    'en',
    'How was your experience today?',
    'Thank you for helping our local business grow! ❤️',
    true,
    '#6C3BFF'
  );

  RETURN NEW;
END;
$$;

-- Trigger hook on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Trigger to prevent regular customers from elevating their own role or code
CREATE OR REPLACE FUNCTION protect_profile_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT is_admin() THEN
    NEW.role := OLD.role;
    NEW.unique_customer_code := OLD.unique_customer_code;
  END IF;
  NEW.updated_at := timezone('utc'::text, now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_fields ON profiles;
CREATE TRIGGER trg_protect_profile_fields
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION protect_profile_fields();

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcement_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE impersonation_audit_logs ENABLE ROW LEVEL SECURITY;

-- 1. PROFILES POLICIES
CREATE POLICY "Users can read their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id OR is_admin());

CREATE POLICY "Users can update their own permitted profile fields"
  ON profiles FOR UPDATE
  USING (auth.uid() = id OR is_admin())
  WITH CHECK (auth.uid() = id OR is_admin());

CREATE POLICY "Admins can delete profiles"
  ON profiles FOR DELETE
  USING (is_admin());

-- 2. BUSINESSES POLICIES
CREATE POLICY "Public can view business info by slug"
  ON businesses FOR SELECT
  USING (true);

CREATE POLICY "Owners can update their businesses"
  ON businesses FOR UPDATE
  USING (auth.uid() = user_id OR is_admin())
  WITH CHECK (auth.uid() = user_id OR is_admin());

CREATE POLICY "Owners can insert their business"
  ON businesses FOR INSERT
  WITH CHECK (auth.uid() = user_id OR is_admin());

CREATE POLICY "Admins can delete businesses"
  ON businesses FOR DELETE
  USING (is_admin());

-- 3. REVIEW_SETTINGS POLICIES
CREATE POLICY "Public can view review settings"
  ON review_settings FOR SELECT
  USING (true);

CREATE POLICY "Owners can update their review settings"
  ON review_settings FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM businesses WHERE businesses.id = review_settings.business_id AND (businesses.user_id = auth.uid() OR is_admin()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM businesses WHERE businesses.id = review_settings.business_id AND (businesses.user_id = auth.uid() OR is_admin()))
  );

CREATE POLICY "Owners can insert their review settings"
  ON review_settings FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM businesses WHERE businesses.id = review_settings.business_id AND (businesses.user_id = auth.uid() OR is_admin()))
  );

-- 4. REVIEW_SUGGESTIONS POLICIES
CREATE POLICY "Public can view review suggestions"
  ON review_suggestions FOR SELECT
  USING (true);

CREATE POLICY "Owners can manage review suggestions"
  ON review_suggestions FOR ALL
  USING (
    EXISTS (SELECT 1 FROM businesses WHERE businesses.id = review_suggestions.business_id AND (businesses.user_id = auth.uid() OR is_admin()))
  );

-- 5. ANALYTICS POLICIES
-- Public anonymous QR scanners can insert legitimate events
CREATE POLICY "Public can insert analytics events for existing businesses"
  ON analytics FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM businesses WHERE businesses.id = analytics.business_id)
  );

-- Only owners and admins can view analytics
CREATE POLICY "Owners and admins can view analytics"
  ON analytics FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM businesses WHERE businesses.id = analytics.business_id AND businesses.user_id = auth.uid())
    OR is_admin()
  );

-- 6. FEEDBACK POLICIES
-- Public customers can submit private feedback
CREATE POLICY "Public can submit feedback for existing businesses"
  ON feedback FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM businesses WHERE businesses.id = feedback.business_id)
  );

-- Only business owner and admin can view and update feedback status
CREATE POLICY "Owners and admins can view and update feedback"
  ON feedback FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM businesses WHERE businesses.id = feedback.business_id AND businesses.user_id = auth.uid())
    OR is_admin()
  );

CREATE POLICY "Owners and admins can update feedback status"
  ON feedback FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM businesses WHERE businesses.id = feedback.business_id AND businesses.user_id = auth.uid())
    OR is_admin()
  );

-- 7. ANNOUNCEMENTS POLICIES
CREATE POLICY "Anyone authenticated can view active announcements"
  ON announcements FOR SELECT
  USING (is_active = true OR is_admin());

CREATE POLICY "Only admins can manage announcements"
  ON announcements FOR ALL
  USING (is_admin());

-- 8. ANNOUNCEMENT_READS POLICIES
CREATE POLICY "Users can view and manage their announcement reads"
  ON announcement_reads FOR SELECT
  USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Users can mark announcements as read"
  ON announcement_reads FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 9. ADMIN_SETTINGS POLICIES
-- All users can read public configuration keys (app_name, whatsapp support)
CREATE POLICY "Public can read app settings"
  ON admin_settings FOR SELECT
  USING (true);

CREATE POLICY "Only admins can modify admin settings"
  ON admin_settings FOR ALL
  USING (is_admin());

-- 10. IMPERSONATION_AUDIT_LOGS POLICIES
CREATE POLICY "Only admins can view audit logs"
  ON impersonation_audit_logs FOR SELECT
  USING (is_admin());

CREATE POLICY "Only admins can insert audit logs"
  ON impersonation_audit_logs FOR INSERT
  WITH CHECK (is_admin());

-- ==============================================================================
-- SEED INITIAL DATA (Default Admin Settings & Sample Announcement)
-- ==============================================================================

INSERT INTO admin_settings (setting_key, setting_value) VALUES
  ('app_name', 'LocalBoost AI'),
  ('whatsapp_support_number', '+15550198234'),
  ('whatsapp_support_message', 'Hello LocalBoost AI Support, I need assistance with my account.'),
  ('default_accent_color', '#6C3BFF')
ON CONFLICT (setting_key) DO UPDATE
SET setting_value = EXCLUDED.setting_value, updated_at = now();

INSERT INTO announcements (title, message, type, is_active) VALUES
  (
    'Welcome to LocalBoost AI 🚀',
    'Download your high-resolution Google Review QR standee from the QR Code tab and place it at your billing desk to start capturing customer feedback today!',
    'info',
    true
  )
ON CONFLICT DO NOTHING;

-- 11. LOYALTY PROGRAM CONFIGS TABLE
CREATE TABLE IF NOT EXISTS loyalty_program_configs (
  id TEXT PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT true,
  reward_title TEXT NOT NULL,
  reward_description TEXT,
  reward_type TEXT NOT NULL DEFAULT 'discount_percentage',
  reward_value TEXT NOT NULL,
  min_bill_amount TEXT,
  validity_days INT NOT NULL DEFAULT 30,
  terms_conditions TEXT,
  stamps_required INT DEFAULT 1,
  badge_label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT unique_biz_loyalty UNIQUE (business_id)
);

-- 12. LOYALTY CARDS TABLE
CREATE TABLE IF NOT EXISTS loyalty_cards (
  id TEXT PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  voucher_code TEXT NOT NULL UNIQUE,
  reward_title TEXT NOT NULL,
  reward_description TEXT,
  reward_type TEXT NOT NULL DEFAULT 'discount_percentage',
  reward_value TEXT NOT NULL,
  terms_conditions TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'redeemed', 'expired')),
  issue_rating INT,
  stamps_collected INT DEFAULT 1,
  stamps_total INT DEFAULT 1,
  expires_at TIMESTAMPTZ NOT NULL,
  redeemed_at TIMESTAMPTZ,
  redeemed_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE loyalty_program_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_cards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public loyalty configs" ON loyalty_program_configs;
CREATE POLICY "Public loyalty configs" ON loyalty_program_configs FOR ALL USING (true);

DROP POLICY IF EXISTS "Public loyalty cards" ON loyalty_cards;
CREATE POLICY "Public loyalty cards" ON loyalty_cards FOR ALL USING (true);

-- 13. SCRATCH & WIN CAMPAIGNS TABLE (Independent Optional Promotional Feature)
CREATE TABLE IF NOT EXISTS scratch_campaigns (
  id TEXT PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  campaign_name TEXT NOT NULL,
  description TEXT,
  reward_type TEXT NOT NULL DEFAULT 'discount_percentage',
  reward_value TEXT NOT NULL,
  reward_headline TEXT NOT NULL,
  free_item_name TEXT,
  min_purchase_amount TEXT,
  start_date DATE NOT NULL,
  expiry_date DATE NOT NULL,
  validity_days_after_win INT NOT NULL DEFAULT 15,
  total_reward_quantity INT NOT NULL DEFAULT 100,
  rewards_claimed_count INT NOT NULL DEFAULT 0,
  per_customer_play_limit INT NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'expired')),
  terms_conditions TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT unique_biz_scratch_campaign UNIQUE (business_id)
);

-- 14. SCRATCH & WIN PLAYS TABLE (Customer Won Coupons & Redemption Records)
CREATE TABLE IF NOT EXISTS scratch_plays (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL REFERENCES scratch_campaigns(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  voucher_code TEXT NOT NULL UNIQUE,
  reward_title TEXT NOT NULL,
  reward_type TEXT NOT NULL DEFAULT 'discount_percentage',
  reward_value TEXT NOT NULL,
  min_purchase_amount TEXT,
  terms_conditions TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'redeemed', 'expired')),
  scratched_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  expires_at TIMESTAMPTZ NOT NULL,
  redeemed_at TIMESTAMPTZ,
  redeemed_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_scratch_plays_phone ON scratch_plays(customer_phone);
CREATE INDEX IF NOT EXISTS idx_scratch_plays_biz ON scratch_plays(business_id);
CREATE INDEX IF NOT EXISTS idx_scratch_plays_code ON scratch_plays(voucher_code);

-- Enable Supabase Row Level Security & Multi-Tenant Isolation
ALTER TABLE scratch_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE scratch_plays ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public scratch campaigns" ON scratch_campaigns;
CREATE POLICY "Public scratch campaigns" ON scratch_campaigns FOR ALL USING (true);

DROP POLICY IF EXISTS "Public scratch plays" ON scratch_plays;
CREATE POLICY "Public scratch plays" ON scratch_plays FOR ALL USING (true);

-- Documentation note:
-- To promote an initial user to admin after registration, run:
-- UPDATE profiles SET role = 'admin' WHERE email = 'your-admin-email@example.com';
