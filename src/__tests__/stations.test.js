import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  findStations,
  rowToStation,
  haversine,
  loadStationIndex,
  resetStationIndex,
} from '../services/stations.js'
import { toRow, isPublicStation } from '../../scripts/fetch-stations.mjs'

// Rows as stored in public/stations-de.json
const ROWS = [
  ['n1', 48.140, 11.580, 'Aral',  'Aral Tankstelle', 'Lindwurmstr.', '5', '80337', 'München'],
  ['n2', 48.130, 11.560, 'Shell', '',                '',             '',  '80339', 'München'],
  ['w3', 48.300, 11.700, 'Esso',  'Esso',            '',             '',  '85748', 'Garching'],
  ['n4', 52.520, 13.405, 'JET',   'JET',             '',             '',  '10115', 'Berlin'],
]
const MUNICH = { lat: 48.137, lng: 11.575 }

// ── haversine ────────────────────────────────────────────────────────────────
describe('haversine', () => {
  it('returns 0 for identical coordinates', () => {
    expect(haversine(48.137, 11.575, 48.137, 11.575)).toBe(0)
  })

  it('calculates Munich → Berlin (~504 km)', () => {
    const dist = haversine(48.137, 11.575, 52.52, 13.405)
    expect(dist).toBeGreaterThan(490)
    expect(dist).toBeLessThan(520)
  })

  it('calculates a short distance (~1.1 km)', () => {
    const dist = haversine(48.0, 11.0, 48.01, 11.0)
    expect(dist).toBeGreaterThan(1.0)
    expect(dist).toBeLessThan(1.2)
  })
})

// ── rowToStation ─────────────────────────────────────────────────────────────
describe('rowToStation', () => {
  it('maps a compact row to a station object', () => {
    const s = rowToStation(ROWS[0], 0.567)
    expect(s).toMatchObject({
      id: 'osm_n1', brand: 'Aral', name: 'Aral Tankstelle',
      street: 'Lindwurmstr.', houseNumber: '5', postCode: '80337', place: 'München',
      lat: 48.14, lng: 11.58, dist: 0.6,
    })
  })

  it('falls back between brand and name', () => {
    expect(rowToStation(ROWS[1]).name).toBe('Shell')
    expect(rowToStation(['n9', 1, 2, '', 'Freie Tankstelle', '', '', '', '']).brand).toBe('Freie Tankstelle')
    expect(rowToStation(['n9', 1, 2, '', '', '', '', '', '']).name).toBe('Tankstelle')
  })
})

// ── findStations ─────────────────────────────────────────────────────────────
describe('findStations', () => {
  it('returns only stations inside the radius, nearest first', async () => {
    const found = await findStations({ ...MUNICH, radius: 5 }, ROWS)
    expect(found.map((s) => s.id)).toEqual(['osm_n1', 'osm_n2'])
    expect(found[0].dist).toBeLessThan(found[1].dist)
  })

  it('includes farther stations with a larger radius', async () => {
    const found = await findStations({ ...MUNICH, radius: 25 }, ROWS)
    expect(found.map((s) => s.id)).toEqual(['osm_n1', 'osm_n2', 'osm_w3'])
  })

  it('returns an empty list when nothing is nearby', async () => {
    expect(await findStations({ lat: 54.5, lng: 6.5, radius: 10 }, ROWS)).toEqual([])
  })

  it('caps results at 60 stations', async () => {
    const many = Array.from({ length: 100 }, (_, i) => [`n${i}`, 48.137 + i * 1e-4, 11.575, 'X', '', '', '', '', ''])
    expect(await findStations({ ...MUNICH, radius: 5 }, many)).toHaveLength(60)
  })
})

// ── loadStationIndex ─────────────────────────────────────────────────────────
describe('loadStationIndex', () => {
  beforeEach(() => resetStationIndex())

  it('loads the static file once and caches it', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ stations: ROWS }) })
    expect(await loadStationIndex(fetchMock)).toBe(ROWS)
    await loadStationIndex(fetchMock)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toBe('./stations-de.json')
  })

  it('throws STATIONS_UNAVAILABLE and allows a retry after a failure', async () => {
    const failing = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    await expect(loadStationIndex(failing)).rejects.toThrow('STATIONS_UNAVAILABLE')

    const ok = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ stations: ROWS }) })
    expect(await loadStationIndex(ok)).toBe(ROWS)
  })
})

// ── scripts/fetch-stations.mjs helpers ───────────────────────────────────────
describe('fetch-stations: toRow', () => {
  it('converts a node with address tags', () => {
    const row = toRow({
      type: 'node', id: 123, lat: 48.1234567, lon: 11.5678912,
      tags: { amenity: 'fuel', brand: 'Aral', name: 'Aral', 'addr:street': 'Hauptstr.',
              'addr:housenumber': '1', 'addr:postcode': '80331', 'addr:city': 'München' },
    })
    expect(row).toEqual(['n123', 48.12346, 11.56789, 'Aral', 'Aral', 'Hauptstr.', '1', '80331', 'München'])
  })

  it('uses the centre of ways and prefixes the OSM type', () => {
    const row = toRow({ type: 'way', id: 9, center: { lat: 50, lon: 8 }, tags: { operator: 'HEM' } })
    expect(row.slice(0, 4)).toEqual(['w9', 50, 8, 'HEM'])
  })

  it('skips elements without coordinates', () => {
    expect(toRow({ type: 'node', id: 1, tags: {} })).toBeNull()
  })
})

describe('fetch-stations: isPublicStation', () => {
  it('keeps normal stations and drops private or non-car ones', () => {
    expect(isPublicStation({ amenity: 'fuel' })).toBe(true)
    expect(isPublicStation({ access: 'private' })).toBe(false)
    expect(isPublicStation({ access: 'no' })).toBe(false)
    expect(isPublicStation({ motorcar: 'no' })).toBe(false)
  })
})
