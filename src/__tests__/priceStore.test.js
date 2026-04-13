import { describe, it, expect, beforeEach } from 'vitest'
import {
  fetchPricesForStations,
  reportPrice,
  confirmPrice,
  hasConfirmed,
  localReportCount,
  getReporterName,
  setReporterName,
  isSupabaseConfigured,
} from '../services/priceStore.js'

// Uses localStorage mock from setup.js
beforeEach(() => {
  localStorage.clear()
})

// ── isSupabaseConfigured ──────────────────────────────────────────────────────
describe('isSupabaseConfigured', () => {
  it('returns false when env vars are empty', () => {
    expect(isSupabaseConfigured()).toBe(false)
  })
})

// ── getReporterName / setReporterName ─────────────────────────────────────────
describe('reporter name', () => {
  it('defaults to Anonymous', () => {
    expect(getReporterName()).toBe('Anonymous')
  })

  it('saves and retrieves a name', () => {
    setReporterName('Klaus')
    expect(getReporterName()).toBe('Klaus')
  })

  it('falls back to Anonymous for empty string', () => {
    setReporterName('')
    expect(getReporterName()).toBe('Anonymous')
  })
})

// ── reportPrice ───────────────────────────────────────────────────────────────
describe('reportPrice (localStorage mode)', () => {
  it('stores a price report', async () => {
    await reportPrice({ stationId: 'osm_1', fuelType: 'e5', price: 1.899 })

    const result = await fetchPricesForStations(['osm_1'])
    expect(result['osm_1']).toBeDefined()
    expect(result['osm_1']['e5'].price).toBe(1.899)
  })

  it('stores the reporter name', async () => {
    await reportPrice({ stationId: 'osm_2', fuelType: 'diesel', price: 1.599, reporterName: 'Hans' })
    const result = await fetchPricesForStations(['osm_2'])
    expect(result['osm_2']['diesel'].reporterName).toBe('Hans')
  })

  it('stores a reportedAt timestamp', async () => {
    const before = Date.now()
    await reportPrice({ stationId: 'osm_3', fuelType: 'e10', price: 1.879 })
    const after  = Date.now()

    const result    = await fetchPricesForStations(['osm_3'])
    const reported  = new Date(result['osm_3']['e10'].reportedAt).getTime()

    expect(reported).toBeGreaterThanOrEqual(before)
    expect(reported).toBeLessThanOrEqual(after)
  })

  it('overwrites an older report for the same station+fuel', async () => {
    await reportPrice({ stationId: 'osm_4', fuelType: 'e5', price: 1.899 })
    await reportPrice({ stationId: 'osm_4', fuelType: 'e5', price: 1.829 })
    const result = await fetchPricesForStations(['osm_4'])
    expect(result['osm_4']['e5'].price).toBe(1.829)
  })

  it('stores multiple fuel types independently', async () => {
    await reportPrice({ stationId: 'osm_5', fuelType: 'e5',  price: 1.899 })
    await reportPrice({ stationId: 'osm_5', fuelType: 'e10', price: 1.879 })
    const result = await fetchPricesForStations(['osm_5'])
    expect(result['osm_5']['e5'].price).toBe(1.899)
    expect(result['osm_5']['e10'].price).toBe(1.879)
  })
})

// ── fetchPricesForStations ────────────────────────────────────────────────────
describe('fetchPricesForStations', () => {
  it('returns empty object for unknown stations', async () => {
    const result = await fetchPricesForStations(['osm_unknown'])
    expect(result).toEqual({})
  })

  it('returns empty object for empty array', async () => {
    const result = await fetchPricesForStations([])
    expect(result).toEqual({})
  })

  it('fetches prices for multiple stations', async () => {
    await reportPrice({ stationId: 'osm_a', fuelType: 'e5',     price: 1.899 })
    await reportPrice({ stationId: 'osm_b', fuelType: 'diesel',  price: 1.599 })

    const result = await fetchPricesForStations(['osm_a', 'osm_b', 'osm_c'])

    expect(result['osm_a']).toBeDefined()
    expect(result['osm_b']).toBeDefined()
    expect(result['osm_c']).toBeUndefined()
  })
})

// ── confirmPrice ──────────────────────────────────────────────────────────────
describe('confirmPrice', () => {
  it('returns true on first confirmation', async () => {
    await reportPrice({ stationId: 'osm_10', fuelType: 'e5', price: 1.899 })
    const result = confirmPrice('osm_10', 'e5')
    expect(result).toBe(true)
  })

  it('returns false on duplicate confirmation', async () => {
    await reportPrice({ stationId: 'osm_11', fuelType: 'e5', price: 1.899 })
    confirmPrice('osm_11', 'e5')
    const second = confirmPrice('osm_11', 'e5')
    expect(second).toBe(false)
  })

  it('increments the confirmations counter', async () => {
    await reportPrice({ stationId: 'osm_12', fuelType: 'diesel', price: 1.599 })
    confirmPrice('osm_12', 'diesel')

    const result = await fetchPricesForStations(['osm_12'])
    expect(result['osm_12']['diesel'].confirmations).toBe(1)
  })

  it('returns false when no price exists to confirm', () => {
    const result = confirmPrice('osm_99', 'e5')
    expect(result).toBe(false)
  })
})

// ── hasConfirmed ──────────────────────────────────────────────────────────────
describe('hasConfirmed', () => {
  it('returns false before confirming', async () => {
    await reportPrice({ stationId: 'osm_20', fuelType: 'e5', price: 1.899 })
    expect(hasConfirmed('osm_20', 'e5')).toBe(false)
  })

  it('returns true after confirming', async () => {
    await reportPrice({ stationId: 'osm_21', fuelType: 'e5', price: 1.899 })
    confirmPrice('osm_21', 'e5')
    expect(hasConfirmed('osm_21', 'e5')).toBe(true)
  })
})

// ── localReportCount ──────────────────────────────────────────────────────────
describe('localReportCount', () => {
  it('returns 0 when no prices reported', () => {
    expect(localReportCount()).toBe(0)
  })

  it('counts individual fuel type reports', async () => {
    await reportPrice({ stationId: 'osm_30', fuelType: 'e5',    price: 1.899 })
    await reportPrice({ stationId: 'osm_30', fuelType: 'diesel', price: 1.599 })
    await reportPrice({ stationId: 'osm_31', fuelType: 'e10',   price: 1.879 })

    expect(localReportCount()).toBe(3)
  })
})
