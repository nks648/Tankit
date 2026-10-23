import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchOfficialStations, normalizeOfficial, clearOfficialCache } from '../services/tankerkoenig.js'
import { mergePrices } from '../utils/formatters.js'

const KEY = '00000000-0000-0000-0000-000000000000' // placeholder, not a real key
const RAW = {
  id: 'abc', name: 'ARAL TANKSTELLE', brand: 'ARAL', street: 'LINDWURMSTR.', houseNumber: '5 ',
  postCode: 8337, place: 'MÜNCHEN', lat: 48.14, lng: 11.58, dist: 0.6,
  e5: 1.799, e10: 1.739, diesel: false, isOpen: true,
}
const ok = (stations) => ({ ok: true, json: async () => ({ ok: true, stations }) })

describe('normalizeOfficial', () => {
  it('maps a Tankerkönig station and tidies capitals', () => {
    expect(normalizeOfficial(RAW)).toEqual({
      id: 'tk_abc', name: 'Aral Tankstelle', brand: 'ARAL', street: 'Lindwurmstr.', houseNumber: '5',
      postCode: '08337', place: 'München', lat: 48.14, lng: 11.58, dist: 0.6, isOpen: true,
      official: { e5: 1.799, e10: 1.739, diesel: null },
    })
  })
})

describe('fetchOfficialStations', () => {
  beforeEach(() => clearOfficialCache())

  it('asks for the full 25 km area once and caches it for 5 minutes', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(ok([RAW]))
    const a = await fetchOfficialStations({ lat: 48.137, lng: 11.575 }, { apiKey: KEY, fetchImpl, now: 0 })
    await fetchOfficialStations({ lat: 48.137, lng: 11.575 }, { apiKey: KEY, fetchImpl, now: 4 * 60e3 })
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    expect(fetchImpl.mock.calls[0][0]).toContain('rad=25')
    expect(fetchImpl.mock.calls[0][0]).toContain('type=all')
    expect(a[0].id).toBe('tk_abc')

    await fetchOfficialStations({ lat: 48.137, lng: 11.575 }, { apiKey: KEY, fetchImpl, now: 6 * 60e3 })
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it('throws OFFICIAL_UNAVAILABLE when the API reports an error', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: false, message: 'apikey invalid' }) })
    await expect(fetchOfficialStations({ lat: 1, lng: 2 }, { apiKey: KEY, fetchImpl })).rejects.toThrow('OFFICIAL_UNAVAILABLE')
  })

  it('throws OFFICIAL_UNAVAILABLE on HTTP errors', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 503 })
    await expect(fetchOfficialStations({ lat: 1, lng: 2 }, { apiKey: KEY, fetchImpl })).rejects.toThrow('OFFICIAL_UNAVAILABLE')
  })
})

describe('mergePrices', () => {
  const NOW = Date.parse('2026-10-23T12:00:00Z')
  const station = { id: 'tk_abc', official: { e5: 1.799, e10: 1.739, diesel: null } }
  const report  = (price, minutesAgo) => ({ price, reportedAt: new Date(NOW - minutesAgo * 60e3).toISOString(), confirmations: 0 })

  it('uses official prices when there are no reports', () => {
    expect(mergePrices([station], {}, NOW).tk_abc).toEqual({
      e5: { price: 1.799, source: 'official' }, e10: { price: 1.739, source: 'official' },
    })
  })

  it('a community report newer than 1 h wins over the official price', () => {
    const merged = mergePrices([station], { tk_abc: { e5: report(1.759, 10) } }, NOW).tk_abc
    expect(merged.e5).toMatchObject({ price: 1.759, source: 'community' })
  })

  it('an older community report does not override the official price', () => {
    const merged = mergePrices([station], { tk_abc: { e5: report(1.759, 90) } }, NOW).tk_abc
    expect(merged.e5).toEqual({ price: 1.799, source: 'official' })
  })

  it('uses any community report when there is no official price', () => {
    const merged = mergePrices([station], { tk_abc: { diesel: report(1.659, 600) } }, NOW).tk_abc
    expect(merged.diesel).toMatchObject({ price: 1.659, source: 'community' })
  })

  it('works for stations without official data (OSM list)', () => {
    const osm = { id: 'osm_n1' }
    expect(mergePrices([osm], {}, NOW)).toEqual({})
    expect(mergePrices([osm], { osm_n1: { e5: report(1.8, 5) } }, NOW).osm_n1.e5.source).toBe('community')
  })
})
