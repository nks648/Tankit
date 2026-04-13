-- TankIT – Supabase Schema
-- Run this in your Supabase project's SQL Editor.
-- Dashboard → SQL Editor → New Query → Paste & Run

-- ── price_reports ────────────────────────────────────────────────────────────
-- Stores every community price report.
-- One row per (station, fuel type, report time).

CREATE TABLE IF NOT EXISTS price_reports (
  id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  station_id     TEXT        NOT NULL,          -- e.g. "osm_123456"
  fuel_type      TEXT        NOT NULL CHECK (fuel_type IN ('e5', 'e10', 'diesel')),
  price          NUMERIC(5,3) NOT NULL CHECK (price > 0.5 AND price < 5.0),
  reporter_name  TEXT        DEFAULT 'Anonymous',
  confirmations  INTEGER     DEFAULT 0,
  reported_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups by station + time
CREATE INDEX IF NOT EXISTS idx_price_reports_station_time
  ON price_reports (station_id, reported_at DESC);

-- Index for fuel type filtering
CREATE INDEX IF NOT EXISTS idx_price_reports_fuel
  ON price_reports (fuel_type);

-- ── Row Level Security (RLS) ─────────────────────────────────────────────────
-- Anyone can read and insert price reports (no login required).
-- No-one can delete or update (immutable log).

ALTER TABLE price_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read prices"
  ON price_reports FOR SELECT
  USING (true);

CREATE POLICY "Anyone can report prices"
  ON price_reports FOR INSERT
  WITH CHECK (true);

-- ── View: latest prices per station+fuel ─────────────────────────────────────
-- Returns only the most recent report for each (station_id, fuel_type).
-- Use this view in production for faster reads.

CREATE OR REPLACE VIEW latest_prices AS
SELECT DISTINCT ON (station_id, fuel_type)
  id, station_id, fuel_type, price,
  reporter_name, confirmations, reported_at
FROM price_reports
ORDER BY station_id, fuel_type, reported_at DESC;

-- ── How to query from TankIT frontend ────────────────────────────────────────
--
-- GET /rest/v1/price_reports
--   ?station_id=in.("osm_123","osm_456")
--   &order=reported_at.desc
--   &limit=500
--
-- POST /rest/v1/price_reports
--   { "station_id": "osm_123", "fuel_type": "e5", "price": 1.899, "reporter_name": "Hans" }
