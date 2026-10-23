/**
 * TankIT – official fuel prices (MTS-K) via the free Tankerkönig API
 * https://creativecommons.tankerkoenig.de – data licence CC BY 4.0
 *
 * Key for the free Tankerkönig fuel-price API.
 * Register for your own key at https://creativecommons.tankerkoenig.de
 * The key is injected at build time (VITE_TANKERKOENIG_API_KEY, a GitHub
 * Actions secret in production) and must never be committed to the repo.
 *
 * Usage rules we follow:
 *  - requests only on user action (a search), never in the background
 *  - one radius search (max 25 km) per location, cached for 5 minutes;
 *    smaller radii are filtered locally, so changing the radius is free
 *  - all stations in the radius are shown (no hidden filtering)
 */

const API_URL     = 'https://creativecommons.tankerkoenig.de/json/list.php'
const MAX_RAD     = 25
const CACHE_MS    = 5 * 60 * 1000
const COOLDOWN_MS = 60 * 1000 // free keys allow ~1 request per minute

const cache = new Map() // "lat,lng" → { at, stations }
let cooldownUntil = 0   // after an error, don't call the API again for a minute

export function getApiKey() {
  return (import.meta.env.VITE_TANKERKOENIG_API_KEY || '').trim()
}

export function isOfficialConfigured() {
  return /^[0-9a-f-]{36}$/i.test(getApiKey())
}

/** For tests */
export function clearOfficialCache() {
  cache.clear()
  cooldownUntil = 0
}

/**
 * All MTS-K stations within 25 km of a point, with live prices.
 * @returns {Promise<Station[]>} sorted by distance
 */
export async function fetchOfficialStations({ lat, lng }, { apiKey = getApiKey(), fetchImpl = fetch, now = Date.now() } = {}) {
  const key = `${lat.toFixed(3)},${lng.toFixed(3)}`
  const hit = cache.get(key)
  if (hit && now - hit.at < CACHE_MS) return hit.stations
  if (now < cooldownUntil) throw new Error('OFFICIAL_UNAVAILABLE cooldown')

  const url = `${API_URL}?lat=${lat}&lng=${lng}&rad=${MAX_RAD}&type=all&sort=dist&apikey=${encodeURIComponent(apiKey)}`
  let data
  try {
    const res = await fetchImpl(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    data = await res.json()
    if (!data.ok) throw new Error(data.message || 'not ok')
  } catch (err) {
    cooldownUntil = now + COOLDOWN_MS
    throw new Error(`OFFICIAL_UNAVAILABLE ${err.message}`)
  }

  const stations = (data.stations || []).map(normalizeOfficial)
  cache.set(key, { at: now, stations })
  return stations
}

const cleanPrice = (p) => (typeof p === 'number' && p > 0 ? p : null)
const titleCase  = (s = '') =>
  s.toLowerCase().replace(/(^|[\s\-/(])([a-zäöüß])/g, (m, sep, ch) => sep + ch.toUpperCase())

/** Tankerkönig station → TankIT station (addresses arrive in CAPITALS). */
export function normalizeOfficial(raw) {
  return {
    id:          `tk_${raw.id}`,
    name:        titleCase(raw.name || ''),
    brand:       (raw.brand || '').trim() || titleCase(raw.name || ''),
    street:      titleCase(raw.street || ''),
    houseNumber: (raw.houseNumber || '').trim(),
    postCode:    raw.postCode ? String(raw.postCode).padStart(5, '0') : '',
    place:       titleCase(raw.place || ''),
    lat:         raw.lat,
    lng:         raw.lng,
    dist:        raw.dist,
    isOpen:      raw.isOpen,
    official: {
      e5:     cleanPrice(raw.e5),
      e10:    cleanPrice(raw.e10),
      diesel: cleanPrice(raw.diesel),
    },
  }
}
