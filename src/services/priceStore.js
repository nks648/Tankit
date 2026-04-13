/**
 * TankIT – Community Price Store
 *
 * "By people, for people." – Prices are reported and confirmed by real users.
 *
 * Storage backends (automatic fallback):
 *  1. Supabase  – shared globally across all users (configure VITE_SUPABASE_* env vars)
 *  2. localStorage – per-browser demo mode (works instantly, no setup needed)
 *
 * Data model:
 *  prices[stationId][fuelType] = {
 *    price:        number,   // e.g. 1.899
 *    reportedAt:   string,   // ISO date
 *    confirmations: number,  // how many others confirmed this price
 *    reporterName: string,   // "Anonymous" or user's nickname
 *  }
 */

const LS_PRICES_KEY    = 'tankit_community_prices_v2'
const LS_CONFIRMED_KEY = 'tankit_confirmed_v2'
const LS_REPORTER_KEY  = 'tankit_reporter_name'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '')
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

// ── Backend detection ──────────────────────────────────────────────────────

export function isSupabaseConfigured() {
  return !!(
    SUPABASE_URL &&
    SUPABASE_KEY &&
    SUPABASE_URL.startsWith('https://') &&
    !SUPABASE_URL.includes('placeholder')
  )
}

// ── LocalStorage helpers ───────────────────────────────────────────────────

function readLS(key, fallback = {}) {
  try { return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback }
  catch { return fallback }
}

function writeLS(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch {}
}

// ── Reporter name (persisted nickname) ────────────────────────────────────

export function getReporterName() {
  return readLS(LS_REPORTER_KEY, 'Anonymous') || 'Anonymous'
}

export function setReporterName(name) {
  writeLS(LS_REPORTER_KEY, name.trim() || 'Anonymous')
}

// ── Fetch prices for multiple stations ────────────────────────────────────

/**
 * Returns the latest community price for each station id.
 * @param {string[]} stationIds
 * @returns {Promise<Record<string, StationPrices>>}
 *   { "osm_123": { e5: { price, reportedAt, confirmations }, ... }, ... }
 */
export async function fetchPricesForStations(stationIds) {
  if (!stationIds.length) return {}

  if (isSupabaseConfigured()) {
    return fetchFromSupabase(stationIds)
  }
  return fetchFromLS(stationIds)
}

function fetchFromLS(stationIds) {
  const all    = readLS(LS_PRICES_KEY)
  const result = {}
  for (const id of stationIds) {
    if (all[id]) result[id] = all[id]
  }
  return result
}

async function fetchFromSupabase(stationIds) {
  // Encode the list for the `in` filter: (osm_1,osm_2,...)
  const list = stationIds.map((id) => `"${id}"`).join(',')
  const url  = `${SUPABASE_URL}/rest/v1/price_reports` +
    `?station_id=in.(${list})&order=reported_at.desc&limit=1000`

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${SUPABASE_KEY}`,
      apikey:        SUPABASE_KEY,
    },
  })

  if (!res.ok) {
    console.warn('TankIT: Supabase fetch failed, falling back to localStorage')
    return fetchFromLS(stationIds)
  }

  const rows = await res.json()

  // Group by station_id; keep the latest report per (station, fuelType)
  const result = {}
  for (const row of rows) {
    if (!result[row.station_id]) result[row.station_id] = {}
    if (!result[row.station_id][row.fuel_type]) {
      result[row.station_id][row.fuel_type] = {
        price:         row.price,
        reportedAt:    row.reported_at,
        confirmations: row.confirmations ?? 0,
        reporterName:  row.reporter_name ?? 'Anonymous',
      }
    }
  }
  return result
}

// ── Report a price ─────────────────────────────────────────────────────────

/**
 * Submit a community price report.
 * @param {object} params
 * @param {string} params.stationId   e.g. "osm_123456"
 * @param {'e5'|'e10'|'diesel'} params.fuelType
 * @param {number} params.price       e.g. 1.899
 * @param {string} [params.reporterName]
 */
export async function reportPrice({ stationId, fuelType, price, reporterName }) {
  const name = reporterName || getReporterName()

  if (isSupabaseConfigured()) {
    try {
      await reportToSupabase({ stationId, fuelType, price, reporterName: name })
      // Also update localStorage cache for instant UI feedback
      updateLS(stationId, fuelType, { price, reportedAt: new Date().toISOString(), confirmations: 0, reporterName: name })
      return
    } catch (err) {
      console.warn('TankIT: Supabase report failed, saving locally', err.message)
    }
  }

  updateLS(stationId, fuelType, {
    price,
    reportedAt:    new Date().toISOString(),
    confirmations: 0,
    reporterName:  name,
  })
}

function updateLS(stationId, fuelType, data) {
  const all = readLS(LS_PRICES_KEY)
  if (!all[stationId]) all[stationId] = {}
  all[stationId][fuelType] = data
  writeLS(LS_PRICES_KEY, all)
}

async function reportToSupabase({ stationId, fuelType, price, reporterName }) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/price_reports`, {
    method:  'POST',
    headers: {
      Authorization:   `Bearer ${SUPABASE_KEY}`,
      apikey:          SUPABASE_KEY,
      'Content-Type':  'application/json',
      Prefer:          'return=minimal',
    },
    body: JSON.stringify({
      station_id:    stationId,
      fuel_type:     fuelType,
      price,
      reporter_name: reporterName,
    }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Supabase error ${res.status}: ${body}`)
  }
}

// ── Confirm an existing price ──────────────────────────────────────────────

/**
 * Mark an existing price report as confirmed by this user.
 * Returns false if the user already confirmed this price.
 * @param {string} stationId
 * @param {'e5'|'e10'|'diesel'} fuelType
 * @returns {boolean}  true if confirmation was recorded
 */
export function confirmPrice(stationId, fuelType) {
  // Can only confirm if a price report exists
  const all = readLS(LS_PRICES_KEY)
  if (!all[stationId]?.[fuelType]) return false

  const confirmed = readLS(LS_CONFIRMED_KEY)
  const key       = `${stationId}_${fuelType}`

  if (confirmed[key]) return false // already confirmed by this user

  confirmed[key] = true
  writeLS(LS_CONFIRMED_KEY, confirmed)

  // Increment the confirmation counter
  all[stationId][fuelType].confirmations =
    (all[stationId][fuelType].confirmations ?? 0) + 1
  writeLS(LS_PRICES_KEY, all)

  return true
}

/**
 * Check if the current user has already confirmed a price.
 */
export function hasConfirmed(stationId, fuelType) {
  return !!readLS(LS_CONFIRMED_KEY)[`${stationId}_${fuelType}`]
}

// ── Stats ──────────────────────────────────────────────────────────────────

/**
 * Count how many price reports exist in localStorage.
 * Used to show community activity.
 */
export function localReportCount() {
  const all = readLS(LS_PRICES_KEY)
  let count = 0
  for (const station of Object.values(all)) {
    count += Object.keys(station).length
  }
  return count
}
