-- Ad Spy Tables for Mission Control
-- Run this in Supabase SQL Editor

-- 1. Brands table
CREATE TABLE spy_brands (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_name TEXT NOT NULL,
  website_url TEXT,
  ad_library_url TEXT NOT NULL,
  page_id TEXT NOT NULL,
  vertical TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused')),
  last_scraped TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Ads table
CREATE TABLE spy_ads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ad_id TEXT NOT NULL UNIQUE,
  brand_id UUID REFERENCES spy_brands(id) ON DELETE CASCADE,
  rank INTEGER,
  creative_type TEXT CHECK (creative_type IN ('video', 'image')),
  creative_url TEXT,
  video_url TEXT,
  ad_copy TEXT,
  headline TEXT,
  cta_type TEXT,
  start_date TEXT,
  ad_library_link TEXT,
  asset_type TEXT,
  visual_format TEXT,
  messaging_angle TEXT,
  hook_tactic TEXT,
  offer_type TEXT,
  first_seen TIMESTAMPTZ DEFAULT now(),
  last_seen TIMESTAMPTZ DEFAULT now(),
  weeks_in_top10 INTEGER DEFAULT 1,
  bookmarked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Weekly snapshots
CREATE TABLE spy_weekly_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID REFERENCES spy_brands(id) ON DELETE CASCADE,
  ad_id TEXT NOT NULL,
  week_start TEXT NOT NULL,
  rank INTEGER,
  UNIQUE (brand_id, ad_id, week_start)
);

-- 4. Intel reports
CREATE TABLE spy_intel_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  report TEXT NOT NULL,
  ads_analyzed INTEGER DEFAULT 0,
  generated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_spy_ads_brand_id ON spy_ads(brand_id);
CREATE INDEX idx_spy_ads_ad_id ON spy_ads(ad_id);
CREATE INDEX idx_spy_ads_bookmarked ON spy_ads(bookmarked);
CREATE INDEX idx_spy_ads_weeks ON spy_ads(weeks_in_top10);
CREATE INDEX idx_spy_weekly_brand ON spy_weekly_snapshots(brand_id);

-- RLS: Permissive policies (personal tool, no auth)
ALTER TABLE spy_brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE spy_ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE spy_weekly_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE spy_intel_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on spy_brands" ON spy_brands FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on spy_ads" ON spy_ads FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on spy_weekly_snapshots" ON spy_weekly_snapshots FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on spy_intel_reports" ON spy_intel_reports FOR ALL USING (true) WITH CHECK (true);
