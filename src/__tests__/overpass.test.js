import { describe, it, expect, vi, afterEach } from 'vitest'
import { parseOSMElement, haversine, buildQuery, findStations, OVERPASS_ENDPOINTS } from '../services/overpass.js'

// ── haversine ────────────────────────────────────────────────────────────────
describe('haversine', () => {
  it('returns 0 for identical coordinates', () => {
    expect(haversine(48.137, 11.575, 48.137, 11.575)).toBe(0)
  })

  it('calculates approximate distance Munich → Berlin (~504 km)', () => {
    const dist = haversine(48.137, 11.575, 52.52, 13.405)
    expect(dist).toBeGreaterThan(490)
    expect(dist).toBeLessThan(520)
  })

  it('calculates a short distance correctly (~1 km)', () => {
    // Moving ~0.01 degrees latitude ≈ 1.11 km
    const dist = haversine(48.0, 11.0, 48.01, 11.0)
    expect(dist).toBeGreaterThan(1.0)
    expect(dist).toBeLessThan(1.2)
  })
})

// ── parseOSMElement ──────────────────────────────────────────────────────────
describe('parseOSMElement', () => {
  const userLat = 48.137
  const userLng = 11.575

  it('parses a node element correctly', () => {
    const el = {
      type: 'node',
      id:   123456,
      lat:  48.14,
      lon:  11.58,
      tags: {
        amenity:          'fuel',
        brand:            'Aral',
        name:             'Aral Tankstelle',
        'addr:street':    'Hauptstraße',
        'addr:housenumber': '5',
        'addr:postcode':  '80331',
        'addr:city':      'München',
        opening_hours:    'Mo-Fr 06:00-22:00',
      },
    }

    const result = parseOSMElement(el, userLat, userLng)

    expect(result.id).toBe('osm_123456')
    expect(result.osmId).toBe(123456)
    expect(result.brand).toBe('Aral')
    expect(result.name).toBe('Aral Tankstelle')
    expect(result.street).toBe('Hauptstraße')
    expect(result.houseNumber).toBe('5')
    expect(result.postCode).toBe('80331')
    expect(result.place).toBe('München')
    expect(result.lat).toBe(48.14)
    expect(result.lng).toBe(11.58)
    expect(result.openingHours).toBe('Mo-Fr 06:00-22:00')
    expect(typeof result.dist).toBe('number')
    expect(result.dist).toBeGreaterThan(0)
  })

  it('parses a way element (uses center)', () => {
    const el = {
      type:   'way',
      id:     999,
      center: { lat: 48.14, lon: 11.58 },
      tags:   { amenity: 'fuel', brand: 'Shell' },
    }

    const result = parseOSMElement(el, userLat, userLng)

    expect(result.id).toBe('osm_999')
    expect(result.lat).toBe(48.14)
    expect(result.lng).toBe(11.58)
    expect(result.brand).toBe('Shell')
  })

  it('falls back to name when brand is missing', () => {
    const el = {
      type: 'node', id: 1,
      lat: 48.14, lon: 11.58,
      tags: { amenity: 'fuel', name: 'Freie Tankstelle' },
    }
    const result = parseOSMElement(el, userLat, userLng)
    expect(result.name).toBe('Freie Tankstelle')
    expect(result.brand).toBe('')
  })

  it('returns null lat/lng for elements without coordinates', () => {
    const el = {
      type: 'node', id: 2,
      tags: { amenity: 'fuel' },
    }
    const result = parseOSMElement(el, userLat, userLng)
    expect(result.lat).toBeNull()
    expect(result.lng).toBeNull()
  })

  it('marks fuel types as available by default', () => {
    const el = {
      type: 'node', id: 3,
      lat: 48.14, lon: 11.58,
      tags: { amenity: 'fuel' },
    }
    const result = parseOSMElement(el, userLat, userLng)
    expect(result.hasE5).toBe(true)
    expect(result.hasE10).toBe(true)
    expect(result.hasDiesel).toBe(true)
  })

  it('marks fuel types as unavailable when tagged "no"', () => {
    const el = {
      type: 'node', id: 4,
      lat: 48.14, lon: 11.58,
      tags: {
        amenity:            'fuel',
        'fuel:octane_95':   'no',
        'fuel:e10':         'no',
      },
    }
    const result = parseOSMElement(el, userLat, userLng)
    expect(result.hasE5).toBe(false)
    expect(result.hasE10).toBe(false)
    expect(result.hasDiesel).toBe(true) // default
  })
})

// ── buildQuery ───────────────────────────────────────────────────────────────
describe('buildQuery', () => {
  it('includes the correct coordinates and radius', () => {
    const query = buildQuery(48.137, 11.575, 5000)
    expect(query).toContain('48.137')
    expect(query).toContain('11.575')
    expect(query).toContain('5000')
  })

  it('queries nodes, ways, and relations', () => {
    const query = buildQuery(48, 11, 10000)
    expect(query).toContain('node["amenity"="fuel"]')
    expect(query).toContain('way["amenity"="fuel"]')
    expect(query).toContain('relation["amenity"="fuel"]')
  })

  it('requests JSON output', () => {
    const query = buildQuery(48, 11, 10000)
    expect(query).toContain('[out:json]')
  })
})

// ── findStations: mirror fallback ────────────────────────────────────────────
describe('findStations', () => {
  const okBody = {
    elements: [
      { type: 'node', id: 7, lat: 48.14, lon: 11.58, tags: { amenity: 'fuel', brand: 'Aral' } },
    ],
  }

  afterEach(() => vi.unstubAllGlobals())

  it('calls Overpass directly (no dev-proxy path)', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => okBody })
    vi.stubGlobal('fetch', fetchMock)

    const stations = await findStations({ lat: 48.137, lng: 11.575, radius: 5 })

    expect(fetchMock.mock.calls[0][0]).toBe(OVERPASS_ENDPOINTS[0])
    expect(stations).toHaveLength(1)
    expect(stations[0].id).toBe('osm_7')
  })

  it('falls back to the next mirror when the first one is busy', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 504 })
      .mockResolvedValueOnce({ ok: true, json: async () => okBody })
    vi.stubGlobal('fetch', fetchMock)

    const stations = await findStations({ lat: 48.137, lng: 11.575, radius: 5 })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[1][0]).toBe(OVERPASS_ENDPOINTS[1])
    expect(stations).toHaveLength(1)
  })

  it('throws OVERPASS_BUSY when every mirror fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    await expect(findStations({ lat: 48, lng: 11, radius: 5 })).rejects.toThrow('OVERPASS_BUSY')
  })
})
