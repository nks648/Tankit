/**
 * TankIT – Shared formatter utilities
 * Pure functions, fully testable.
 */

/**
 * Format a fuel price for German-style display.
 * e.g. 1.899 → { main: "1,89", super: "9" }
 * @param {number|null} price
 * @param {boolean} superscript  Split last digit as superscript (true by default)
 * @returns {{ main: string, super: string } | null}
 */
export function formatPrice(price, superscript = true) {
  if (price === null || price === undefined || price === false) return null
  const num = parseFloat(price)
  if (isNaN(num) || num <= 0) return null
  const str = num.toFixed(3)           // "1.899"
  const [euros, cents] = str.split('.')
  if (!superscript) {
    return { main: `${euros},${cents}`, super: '' }
  }
  return {
    main:  `${euros},${cents.slice(0, 2)}`,
    super: cents.slice(2),
  }
}

/**
 * Get a numeric price from a station's prices object for a given fuel type.
 * @param {object|null} prices  e.g. { e5: { price: 1.899, ... }, ... }
 * @param {'e5'|'e10'|'diesel'|'all'} fuelType
 * @returns {number|null}
 */
export function getPrice(prices, fuelType) {
  if (!prices) return null
  if (fuelType === 'all') {
    const vals = ['e5', 'e10', 'diesel']
      .map((k) => prices[k]?.price)
      .filter((v) => v != null && v > 0)
    return vals.length ? Math.min(...vals) : null
  }
  const val = prices[fuelType]?.price
  return val != null && val > 0 ? val : null
}

/**
 * Format a station's address as a single string.
 * @param {object} station
 * @returns {string}
 */
export function formatAddress(station) {
  const parts = []
  if (station.street) {
    parts.push(
      station.houseNumber
        ? `${station.street} ${station.houseNumber}`
        : station.street
    )
  }
  const city = [station.postCode, station.place].filter(Boolean).join(' ')
  if (city) parts.push(city)
  return parts.join(', ')
}

/**
 * Build a Google Maps directions URL from a station.
 * @param {object} station
 * @returns {string}
 */
export function getDirectionsUrl(station) {
  const addr = formatAddress(station)
  if (addr) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addr)}`
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lng}`
}

/**
 * Time-of-day heuristic for fill-up advice.
 * German fuel is cheapest in the evening (18–21h) and on weekends.
 * Source: ADAC / MTS-K analysis.
 * @returns {'fillUp' | 'wait'}
 */
export function getPriceTip() {
  const hour = new Date().getHours()
  const day  = new Date().getDay() // 0=Sun, 6=Sat
  const isWeekend = day === 0 || day === 6
  const isEvening = hour >= 18 && hour < 21
  const isMorning = hour >= 6  && hour < 10
  if (isEvening || isWeekend) return 'fillUp'
  if (isMorning)              return 'wait'
  return hour < 15 ? 'wait' : 'fillUp'
}

/**
 * Format a timestamp as a human-readable "time ago" string.
 * @param {string|null} isoDate
 * @param {object} t  Translation object
 * @returns {string|null}
 */
export function timeAgo(isoDate, t) {
  if (!isoDate) return null
  const seconds = Math.floor((Date.now() - new Date(isoDate)) / 1000)
  if (seconds < 90)          return t.justNow
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60)          return `${minutes} ${t.minAgo}`
  const hours = Math.floor(minutes / 60)
  if (hours < 24)            return `${hours} ${t.hourAgo}`
  const days = Math.floor(hours / 24)
  return `${days}d`
}

/**
 * Get a CSS color string indicating how fresh a community price report is.
 * @param {string|null} isoDate
 * @returns {string}  CSS color value
 */
export function freshnessColor(isoDate) {
  if (!isoDate) return 'var(--text-muted)'
  const hours = (Date.now() - new Date(isoDate)) / 3_600_000
  if (hours < 2)   return '#06d6a0' // green   – very fresh
  if (hours < 6)   return '#ffd60a' // yellow  – getting old
  if (hours < 24)  return '#fb8500' // orange  – stale
  return '#9b9bb4'                  // gray    – very old
}

/**
 * Sort stations by price (using community prices) or by distance.
 * @param {object[]} stations
 * @param {object}   prices     Map of stationId → { e5, e10, diesel }
 * @param {'e5'|'e10'|'diesel'|'all'} fuelType
 * @param {'price'|'dist'} sortBy
 * @returns {object[]}
 */
export function sortStations(stations, prices, fuelType, sortBy) {
  return [...stations].sort((a, b) => {
    if (sortBy === 'price') {
      const pa = getPrice(prices[a.id], fuelType) ?? 9999
      const pb = getPrice(prices[b.id], fuelType) ?? 9999
      if (pa !== pb) return pa - pb
    }
    return (a.dist ?? 9999) - (b.dist ?? 9999)
  })
}

/**
 * Validate a price string entered by a user.
 * Accepts: "1.89", "1,89", "1.899", "189" (auto-formatted)
 * @param {string} raw
 * @returns {{ valid: boolean, value: number|null, error: string|null }}
 */
export function validatePrice(raw) {
  if (!raw || raw.trim() === '') return { valid: false, value: null, error: null }

  // Normalise: replace comma with dot, strip non-numeric except dot
  const normalised = raw.trim().replace(',', '.').replace(/[^0-9.]/g, '')
  const num = parseFloat(normalised)

  if (isNaN(num))       return { valid: false, value: null, error: 'invalidPrice' }
  if (num < 0.5)        return { valid: false, value: null, error: 'priceTooLow' }
  if (num > 5.0)        return { valid: false, value: null, error: 'priceTooHigh' }

  return { valid: true, value: Math.round(num * 1000) / 1000, error: null }
}
