import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  formatPrice,
  getPrice,
  formatAddress,
  getDirectionsUrl,
  getPriceTip,
  timeAgo,
  freshnessColor,
  sortStations,
  validatePrice,
} from '../utils/formatters.js'

// ── formatPrice ─────────────────────────────────────────────────────────────
describe('formatPrice', () => {
  it('returns null for null input', () => {
    expect(formatPrice(null)).toBeNull()
    expect(formatPrice(undefined)).toBeNull()
    expect(formatPrice(false)).toBeNull()
    expect(formatPrice(0)).toBeNull()
  })

  it('returns null for NaN', () => {
    expect(formatPrice('abc')).toBeNull()
  })

  it('formats a typical fuel price with superscript', () => {
    const result = formatPrice(1.899)
    expect(result).toEqual({ main: '1,89', super: '9' })
  })

  it('formats without superscript', () => {
    const result = formatPrice(1.899, false)
    expect(result).toEqual({ main: '1,899', super: '' })
  })

  it('formats a round price', () => {
    const result = formatPrice(2.0)
    expect(result).toEqual({ main: '2,00', super: '0' })
  })

  it('handles three decimal places correctly', () => {
    expect(formatPrice(1.539)).toEqual({ main: '1,53', super: '9' })
    expect(formatPrice(1.999)).toEqual({ main: '1,99', super: '9' })
  })
})

// ── getPrice ────────────────────────────────────────────────────────────────
describe('getPrice', () => {
  const prices = {
    e5:     { price: 1.899, reportedAt: new Date().toISOString(), confirmations: 2 },
    e10:    { price: 1.879, reportedAt: new Date().toISOString(), confirmations: 1 },
    diesel: { price: 1.599, reportedAt: new Date().toISOString(), confirmations: 0 },
  }

  it('returns null for null prices', () => {
    expect(getPrice(null, 'e5')).toBeNull()
    expect(getPrice(undefined, 'e5')).toBeNull()
  })

  it('returns the correct price for a fuel type', () => {
    expect(getPrice(prices, 'e5')).toBe(1.899)
    expect(getPrice(prices, 'e10')).toBe(1.879)
    expect(getPrice(prices, 'diesel')).toBe(1.599)
  })

  it('returns the cheapest price for fuelType "all"', () => {
    expect(getPrice(prices, 'all')).toBe(1.599)
  })

  it('returns null if the fuel type is not available', () => {
    const partial = { e5: { price: 1.899 } }
    expect(getPrice(partial, 'diesel')).toBeNull()
  })

  it('returns null for invalid price value 0', () => {
    const zeroPrices = { e5: { price: 0 } }
    expect(getPrice(zeroPrices, 'e5')).toBeNull()
  })
})

// ── formatAddress ───────────────────────────────────────────────────────────
describe('formatAddress', () => {
  it('formats a full address', () => {
    const station = {
      street: 'Hauptstraße', houseNumber: '5',
      postCode: '80331', place: 'München',
    }
    expect(formatAddress(station)).toBe('Hauptstraße 5, 80331 München')
  })

  it('handles missing house number', () => {
    const station = {
      street: 'Bahnhofstr.', houseNumber: '',
      postCode: '10115', place: 'Berlin',
    }
    expect(formatAddress(station)).toBe('Bahnhofstr., 10115 Berlin')
  })

  it('handles missing street', () => {
    const station = { street: '', houseNumber: '', postCode: '20095', place: 'Hamburg' }
    expect(formatAddress(station)).toBe('20095 Hamburg')
  })

  it('returns empty string for empty station', () => {
    const station = { street: '', houseNumber: '', postCode: '', place: '' }
    expect(formatAddress(station)).toBe('')
  })
})

// ── getDirectionsUrl ────────────────────────────────────────────────────────
describe('getDirectionsUrl', () => {
  it('generates a Google Maps URL with address', () => {
    const station = { street: 'Musterstr.', houseNumber: '1', postCode: '12345', place: 'Berlin' }
    const url     = getDirectionsUrl(station)
    expect(url).toContain('google.com/maps/dir')
    expect(url).toContain('destination=')
    expect(url).toContain('Musterstr')
  })

  it('falls back to lat/lng when address is empty', () => {
    const station = { street: '', houseNumber: '', postCode: '', place: '', lat: 52.52, lng: 13.4 }
    const url     = getDirectionsUrl(station)
    expect(url).toContain('52.52')
    expect(url).toContain('13.4')
  })
})

// ── validatePrice ───────────────────────────────────────────────────────────
describe('validatePrice', () => {
  it('returns valid for typical fuel prices', () => {
    expect(validatePrice('1.899')).toMatchObject({ valid: true, value: 1.899 })
    expect(validatePrice('1,899')).toMatchObject({ valid: true, value: 1.899 })
    expect(validatePrice('2.159')).toMatchObject({ valid: true, value: 2.159 })
  })

  it('returns invalid=false with no error for empty input', () => {
    expect(validatePrice('')).toMatchObject({ valid: false, error: null })
    expect(validatePrice('  ')).toMatchObject({ valid: false, error: null })
  })

  it('returns error for price too low', () => {
    expect(validatePrice('0.3')).toMatchObject({ valid: false, error: 'priceTooLow' })
    expect(validatePrice('0.1')).toMatchObject({ valid: false, error: 'priceTooLow' })
  })

  it('returns error for price too high', () => {
    expect(validatePrice('6.0')).toMatchObject({ valid: false, error: 'priceTooHigh' })
    expect(validatePrice('99')).toMatchObject({ valid: false, error: 'priceTooHigh' })
  })

  it('returns error for non-numeric input', () => {
    expect(validatePrice('abc')).toMatchObject({ valid: false, error: 'invalidPrice' })
  })
})

// ── sortStations ────────────────────────────────────────────────────────────
describe('sortStations', () => {
  const makeStation = (id, dist) => ({ id, dist, lat: 0, lng: 0, name: id })
  const makePrices  = (e5, diesel) => ({
    e5:     e5     ? { price: e5 }     : undefined,
    diesel: diesel ? { price: diesel } : undefined,
  })

  const stations = [
    makeStation('A', 3.0),
    makeStation('B', 1.0),
    makeStation('C', 2.0),
  ]

  const prices = {
    A: makePrices(1.999, 1.699),
    B: makePrices(1.799, 1.599),
    C: makePrices(1.899, 1.649),
  }

  it('sorts by distance', () => {
    const sorted = sortStations(stations, prices, 'e5', 'dist')
    expect(sorted.map((s) => s.id)).toEqual(['B', 'C', 'A'])
  })

  it('sorts by price for e5', () => {
    const sorted = sortStations(stations, prices, 'e5', 'price')
    expect(sorted.map((s) => s.id)).toEqual(['B', 'C', 'A'])
  })

  it('sorts by price for diesel', () => {
    const sorted = sortStations(stations, prices, 'diesel', 'price')
    expect(sorted.map((s) => s.id)).toEqual(['B', 'C', 'A'])
  })

  it('pushes stations with no price to the end when sorting by price', () => {
    const pricelessStation = makeStation('D', 0.5)
    const sorted = sortStations(
      [...stations, pricelessStation],
      prices,
      'e5',
      'price'
    )
    expect(sorted[sorted.length - 1].id).toBe('D')
  })
})

// ── getPriceTip ─────────────────────────────────────────────────────────────
describe('getPriceTip', () => {
  it('returns "fillUp" or "wait"', () => {
    const result = getPriceTip()
    expect(['fillUp', 'wait']).toContain(result)
  })

  it('returns "fillUp" in the evening (18-21h)', () => {
    vi.setSystemTime(new Date('2024-06-12T19:00:00'))
    expect(getPriceTip()).toBe('fillUp')
    vi.useRealTimers()
  })

  it('returns "wait" in the morning (6-10h)', () => {
    vi.setSystemTime(new Date('2024-06-12T08:00:00'))
    expect(getPriceTip()).toBe('wait')
    vi.useRealTimers()
  })

  it('returns "fillUp" on a weekend', () => {
    vi.setSystemTime(new Date('2024-06-15T10:00:00')) // Saturday
    expect(getPriceTip()).toBe('fillUp')
    vi.useRealTimers()
  })
})

// ── freshnessColor ──────────────────────────────────────────────────────────
describe('freshnessColor', () => {
  it('returns muted color for null', () => {
    expect(freshnessColor(null)).toBe('var(--text-muted)')
  })

  it('returns green for very recent report (< 2h)', () => {
    const recent = new Date(Date.now() - 30 * 60 * 1000).toISOString()
    expect(freshnessColor(recent)).toBe('#06d6a0')
  })

  it('returns yellow for 3-hour-old report', () => {
    const old = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
    expect(freshnessColor(old)).toBe('#ffd60a')
  })

  it('returns orange for 12-hour-old report', () => {
    const stale = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
    expect(freshnessColor(stale)).toBe('#fb8500')
  })

  it('returns gray for > 24 hours old', () => {
    const veryOld = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
    expect(freshnessColor(veryOld)).toBe('#9b9bb4')
  })
})
