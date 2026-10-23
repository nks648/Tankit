import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  configureBackend,
  isSupabaseConfigured,
  fetchPricesForStations,
  reportPrice,
  confirmPrice,
  hasConfirmed,
  getClientId,
} from '../services/priceStore.js'

const URL = 'https://demo-project.supabase.co'
const json = (body, status = 200) => ({ ok: status < 400, status, json: async () => body })

beforeEach(() => {
  localStorage.clear()
  configureBackend({ url: URL, key: 'sb_publishable_test' })
})
afterEach(() => {
  configureBackend({})
  vi.unstubAllGlobals()
})

describe('shared backend (Supabase)', () => {
  it('is detected when url + key are set', () => {
    expect(isSupabaseConfigured()).toBe(true)
  })

  it('reads the latest_prices view for the visible stations', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json([
      { id: 'r1', station_id: 'osm_n1', fuel_type: 'e5', price: '1.799', reporter_name: 'Anna',
        reported_at: '2026-10-23T10:00:00Z', confirmations: 2 },
    ]))
    vi.stubGlobal('fetch', fetchMock)

    const prices = await fetchPricesForStations(['osm_n1', 'osm_n2'])

    const [url, opts] = fetchMock.mock.calls[0]
    expect(url).toContain(`${URL}/rest/v1/latest_prices`)
    expect(decodeURIComponent(url)).toContain('station_id=in.("osm_n1","osm_n2")')
    expect(opts.headers.apikey).toBe('sb_publishable_test')
    expect(opts.headers.Authorization).toBeUndefined() // new-style keys aren't JWTs
    expect(prices.osm_n1.e5).toEqual({
      price: 1.799, reportedAt: '2026-10-23T10:00:00Z', confirmations: 2, reporterName: 'Anna', reportId: 'r1',
    })
  })

  it('sends legacy JWT anon keys as Bearer token too', async () => {
    configureBackend({ url: URL, key: 'eyJhbGciOi.legacy.jwt' })
    const fetchMock = vi.fn().mockResolvedValue(json([]))
    vi.stubGlobal('fetch', fetchMock)
    await fetchPricesForStations(['osm_n1'])
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer eyJhbGciOi.legacy.jwt')
  })

  it('falls back to this device when the backend is down', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(await fetchPricesForStations(['osm_n1'])).toEqual({})
  })

  it('reports via the report_price function with an anonymous device id', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json('new-uuid'))
    vi.stubGlobal('fetch', fetchMock)

    await reportPrice({ stationId: 'osm_n1', fuelType: 'diesel', price: 1.659, reporterName: 'Ben' })

    const [url, opts] = fetchMock.mock.calls[0]
    expect(url).toBe(`${URL}/rest/v1/rpc/report_price`)
    expect(JSON.parse(opts.body)).toEqual({
      p_station_id: 'osm_n1', p_fuel_type: 'diesel', p_price: 1.659, p_reporter_name: 'Ben',
      p_client_id: getClientId(),
    })
  })

  it('keeps the same device id across calls', () => {
    expect(getClientId()).toBe(getClientId())
    expect(getClientId()).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('surfaces RATE_LIMIT and IMPLAUSIBLE from the database', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ message: 'RATE_LIMIT' }, 400)))
    await expect(reportPrice({ stationId: 'osm_n1', fuelType: 'e5', price: 1.8 })).rejects.toThrow('RATE_LIMIT')

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ message: 'IMPLAUSIBLE' }, 400)))
    await expect(reportPrice({ stationId: 'osm_n1', fuelType: 'e5', price: 3.2 })).rejects.toThrow('IMPLAUSIBLE')
  })

  it('confirms by report id, once per device', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json(1))
    vi.stubGlobal('fetch', fetchMock)

    expect(await confirmPrice('osm_n1', 'e5', 'r1')).toBe(true)
    expect(hasConfirmed('osm_n1', 'e5', 'r1')).toBe(true)
    expect(await confirmPrice('osm_n1', 'e5', 'r1')).toBe(false)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ p_report_id: 'r1', p_client_id: getClientId() })
  })

  it("doesn't let you confirm your own report", async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ message: 'OWN_REPORT' }, 400)))
    expect(await confirmPrice('osm_n1', 'e5', 'r2')).toBe(false)
    expect(hasConfirmed('osm_n1', 'e5', 'r2')).toBe(false)
  })
})
