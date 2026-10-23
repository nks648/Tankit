/**
 * TankIT – Community Price Store
 *
 * "By people, for people." – Prices are reported and confirmed by real users.
 *
 * Storage backends:
 *  1. Supabase     – shared with everyone (VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY).
 *                    Reads the view latest_prices; writes via the functions
 *                    report_price / confirm_price, which enforce spam protection
 *                    (see supabase/schema.sql).
 *  2. localStorage – no backend configured: prices stay on this device.
 *
 * Data model returned to the app:
 *  prices[stationId][fuelType] = {
 *    price, reportedAt, confirmations, reporterName, reportId?
 *  }
 */

const LS_PRICES_KEY    = 'tankit_community_prices_v2'
const LS_CONFIRMED_KEY = 'tankit_confirmed_v2'
const LS_REPORTER_KEY  = 'tankit_reporter_name'
const LS_CLIENT_KEY    = 'tankit_client_id'

let config = {
  url: import.meta.env.VITE_SUPABASE_URL?.trim().replace(/\/$/, '') || '',
  key: import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() || '',
}

/** For tests: point the store at a (fake) backend, or {} to switch it off. */
export function configureBackend({ url = '', key = '' } = {}) {
  config = { url: url.replace(/\/$/, ''), key }
}

// ── Backend detection ──────────────────────────────────────────────────────

export function isSupabaseConfigured() {
  return !!(config.url && config.key && config.url.startsWith('https://') && !config.url.includes('placeholder'))
}

function headers(extra = {}) {
  const h = { apikey: config.key, ...extra }
  // Legacy anon keys are JWTs and also go in Authorization; new sb_publishable_ keys don't
  if (!config.key.startsWith('sb_')) h.Authorization = `Bearer ${config.key}`
  return h
}

async function rpc(name, args) {
  const res = await fetch(`${config.url}/rest/v1/rpc/${name}`, {
    method:  'POST',
    headers: headers({ 'Content-Type': 'application/json' }),
    body:    JSON.stringify(args),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const msg  = String(body.message || '')
    // Errors raised by the database functions carry a short code
    const code = ['RATE_LIMIT', 'IMPLAUSIBLE', 'OWN_REPORT'].find((c) => msg.includes(c))
    throw new Error(code || `BACKEND_ERROR ${res.status}`)
  }
  return res.json()
}

// ── LocalStorage helpers ───────────────────────────────────────────────────

function readLS(key, fallback = {}) {
  try { return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback }
  catch { return fallback }
}

function writeLS(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch {}
}

/** Random, anonymous id for this browser – used only for spam protection. */
export function getClientId() {
  let id = readLS(LS_CLIENT_KEY, null)
  if (!id) {
    id = crypto.randomUUID()
    writeLS(LS_CLIENT_KEY, id)
  }
  return id
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
 * Latest community price per station and fuel.
 * @param {string[]} stationIds
 * @returns {Promise<Record<string, StationPrices>>}
 */
export async function fetchPricesForStations(stationIds) {
  if (!stationIds.length) return {}
  if (isSupabaseConfigured()) {
    try {
      return await fetchFromSupabase(stationIds)
    } catch (err) {
      console.warn('TankIT: shared prices unavailable, showing this device only', err.message)
    }
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
  const list = stationIds.map((id) => `"${id}"`).join(',')
  const url  = `${config.url}/rest/v1/latest_prices` +
    `?select=id,station_id,fuel_type,price,reporter_name,reported_at,confirmations` +
    `&station_id=in.(${encodeURIComponent(list)})`

  const res = await fetch(url, { headers: headers() })
  if (!res.ok) throw new Error(`BACKEND_ERROR ${res.status}`)

  const result = {}
  for (const row of await res.json()) {
    result[row.station_id] ??= {}
    result[row.station_id][row.fuel_type] = {
      price:         Number(row.price),
      reportedAt:    row.reported_at,
      confirmations: row.confirmations ?? 0,
      reporterName:  row.reporter_name ?? 'Anonymous',
      reportId:      row.id,
    }
  }
  return result
}

// ── Report a price ─────────────────────────────────────────────────────────

/**
 * Submit a community price report.
 * Throws RATE_LIMIT / IMPLAUSIBLE / BACKEND_ERROR when the shared backend refuses it.
 */
export async function reportPrice({ stationId, fuelType, price, reporterName }) {
  const name = reporterName || getReporterName()

  if (isSupabaseConfigured()) {
    await rpc('report_price', {
      p_station_id:    stationId,
      p_fuel_type:     fuelType,
      p_price:         price,
      p_reporter_name: name,
      p_client_id:     getClientId(),
    })
    return
  }

  const all = readLS(LS_PRICES_KEY)
  all[stationId] ??= {}
  all[stationId][fuelType] = {
    price,
    reportedAt:    new Date().toISOString(),
    confirmations: 0,
    reporterName:  name,
  }
  writeLS(LS_PRICES_KEY, all)
}

// ── Confirm an existing price ──────────────────────────────────────────────

/**
 * Confirm the current price of a station + fuel ("the price is right").
 * @param {string} stationId
 * @param {'e5'|'e10'|'diesel'} fuelType
 * @param {string} [reportId]  required for the shared backend
 * @returns {Promise<boolean>} true if a new confirmation was recorded
 */
export async function confirmPrice(stationId, fuelType, reportId) {
  const confirmed = readLS(LS_CONFIRMED_KEY)
  const key       = reportId || `${stationId}_${fuelType}`
  if (confirmed[key]) return false

  if (isSupabaseConfigured() && reportId) {
    try {
      await rpc('confirm_price', { p_report_id: reportId, p_client_id: getClientId() })
    } catch (err) {
      if (err.message !== 'OWN_REPORT') throw err
      return false // you can't confirm your own report
    }
  } else {
    const all = readLS(LS_PRICES_KEY)
    if (!all[stationId]?.[fuelType]) return false
    all[stationId][fuelType].confirmations = (all[stationId][fuelType].confirmations ?? 0) + 1
    writeLS(LS_PRICES_KEY, all)
  }

  confirmed[key] = true
  writeLS(LS_CONFIRMED_KEY, confirmed)
  return true
}

/** Has this device already confirmed this price? */
export function hasConfirmed(stationId, fuelType, reportId) {
  return !!readLS(LS_CONFIRMED_KEY)[reportId || `${stationId}_${fuelType}`]
}

// ── Stats ──────────────────────────────────────────────────────────────────

/** Number of price reports saved on this device (local mode). */
export function localReportCount() {
  let count = 0
  for (const station of Object.values(readLS(LS_PRICES_KEY))) {
    count += Object.keys(station).length
  }
  return count
}
