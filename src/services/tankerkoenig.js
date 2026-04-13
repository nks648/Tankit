/**
 * Tankerkoenig API service.
 * Fetches real-time fuel prices for German petrol stations.
 * Free API: https://creativecommons.tankerkoenig.de/
 *
 * IMPORTANT: For production use, proxy API calls through a backend to protect
 * your API key. For personal/demo use, VITE_TANKERKOENIG_API_KEY in .env is fine.
 */

const BASE_URL = '/api/tankerkoenig'
const DEMO_KEY = '00000000-0000-0000-0000-000000000002'

function getApiKey() {
  return import.meta.env.VITE_TANKERKOENIG_API_KEY || DEMO_KEY
}

/**
 * Fetch all stations with prices within a radius.
 *
 * @param {object} params
 * @param {number} params.lat     Latitude of search centre
 * @param {number} params.lng     Longitude of search centre
 * @param {number} params.radius  Search radius in km (1–25)
 * @returns {Promise<Station[]>}
 */
export async function fetchStations({ lat, lng, radius = 10 }) {
  const apiKey = getApiKey()

  // type=all returns e5, e10, diesel fields per station
  const url = `${BASE_URL}/list.php?lat=${lat}&lng=${lng}&rad=${radius}&sort=dist&type=all&apikey=${apiKey}`

  const res = await fetch(url)

  if (!res.ok) {
    throw new Error(`API request failed: ${res.status} ${res.statusText}`)
  }

  const data = await res.json()

  if (!data.ok) {
    if (data.message?.toLowerCase().includes('apikey')) {
      throw new Error('INVALID_API_KEY')
    }
    throw new Error(data.message || 'Unknown API error')
  }

  return (data.stations || []).map(normalizeStation)
}

/**
 * Normalise a raw station object from the API.
 * Converts false prices to null for easier handling.
 */
function normalizeStation(raw) {
  return {
    id:          raw.id,
    name:        raw.name || 'Unknown Station',
    brand:       raw.brand || raw.name || '',
    street:      raw.street || '',
    houseNumber: raw.houseNumber || '',
    postCode:    raw.postCode || '',
    place:       raw.place || '',
    lat:         raw.lat,
    lng:         raw.lng,
    dist:        raw.dist,
    isOpen:      raw.isOpen,
    e5:          raw.e5   === false ? null : raw.e5,
    e10:         raw.e10  === false ? null : raw.e10,
    diesel:      raw.diesel === false ? null : raw.diesel,
  }
}

/**
 * Format a price value for display.
 * German style: "1,99⁹" – large digits + superscript last digit.
 *
 * @param {number|null} price
 * @param {boolean} superscript  Whether to split the last digit
 * @returns {{ main: string, super: string } | null}
 */
export function formatPrice(price, superscript = true) {
  if (price === null || price === undefined || price === false) return null
  const str = price.toFixed(3) // e.g. "1.899"
  const [euros, cents] = str.split('.')
  if (!superscript) {
    return { main: `${euros},${cents}`, super: '' }
  }
  const main  = `${euros},${cents.slice(0, 2)}`
  const sup   = cents.slice(2)
  return { main, super: sup }
}

/**
 * Get the price for a given fuel type from a station object.
 * @param {object} station
 * @param {'e5'|'e10'|'diesel'} fuelType
 * @returns {number|null}
 */
export function getPrice(station, fuelType) {
  if (fuelType === 'all') {
    // Return the lowest available price
    const prices = [station.e5, station.e10, station.diesel].filter(Boolean)
    return prices.length ? Math.min(...prices) : null
  }
  return station[fuelType] ?? null
}

/**
 * Sort and filter stations by a given fuel type.
 * @param {Station[]} stations
 * @param {'e5'|'e10'|'diesel'|'all'} fuelType
 * @param {'price'|'dist'} sortBy
 * @returns {Station[]}
 */
export function sortStations(stations, fuelType, sortBy) {
  const filtered = stations.filter((s) => {
    if (fuelType === 'all') return s.e5 || s.e10 || s.diesel
    return s[fuelType] !== null && s[fuelType] !== undefined
  })

  return [...filtered].sort((a, b) => {
    if (sortBy === 'price') {
      const pa = getPrice(a, fuelType) ?? 999
      const pb = getPrice(b, fuelType) ?? 999
      return pa - pb
    }
    return (a.dist ?? 999) - (b.dist ?? 999)
  })
}

/**
 * Simple heuristic: should the user fill up now or wait?
 * In Germany, fuel is typically cheapest:
 *  - Late afternoon / evening (18:00–21:00)
 *  - On weekends
 * Based on ADAC & MTS-K observations.
 *
 * @returns {'fillUp' | 'wait'}
 */
export function getPriceTip() {
  const now  = new Date()
  const hour = now.getHours()
  const day  = now.getDay() // 0=Sun, 6=Sat

  const isWeekend   = day === 0 || day === 6
  const isEvening   = hour >= 18 && hour < 21
  const isMorning   = hour >= 6  && hour < 10

  if (isEvening || isWeekend) return 'fillUp'
  if (isMorning) return 'wait'
  return hour < 18 ? 'wait' : 'fillUp'
}

/**
 * Build a Google Maps directions URL for a station.
 * @param {object} station
 * @returns {string}
 */
export function getDirectionsUrl(station) {
  const dest = encodeURIComponent(
    `${station.street} ${station.houseNumber}, ${station.postCode} ${station.place}`
  )
  return `https://www.google.com/maps/dir/?api=1&destination=${dest}`
}

/**
 * Format station address into a single string.
 */
export function formatAddress(station) {
  const parts = []
  if (station.street)  parts.push(`${station.street}${station.houseNumber ? ' ' + station.houseNumber : ''}`)
  if (station.postCode || station.place) {
    parts.push(`${station.postCode || ''} ${station.place || ''}`.trim())
  }
  return parts.join(', ')
}
