/**
 * TankIT – OpenStreetMap Overpass API service
 *
 * Finds petrol stations near a location using 100% free OSM data.
 * No API key required. Data is community-maintained by OpenStreetMap contributors.
 *
 * Overpass API docs: https://wiki.openstreetmap.org/wiki/Overpass_API
 */

const OVERPASS_URL = '/api/overpass/interpreter'

// Max stations to show (Overpass can return hundreds)
const MAX_STATIONS = 60

/**
 * Find all petrol stations within a radius of a lat/lng point.
 *
 * @param {object} params
 * @param {number} params.lat     Centre latitude
 * @param {number} params.lng     Centre longitude
 * @param {number} params.radius  Radius in km (1–25)
 * @returns {Promise<Station[]>}
 */
export async function findStations({ lat, lng, radius }) {
  const radiusM = Math.min(radius, 25) * 1000 // cap at 25 km

  const query = buildQuery(lat, lng, radiusM)

  const res = await fetch(OVERPASS_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    `data=${encodeURIComponent(query)}`,
  })

  if (!res.ok) {
    if (res.status === 429 || res.status === 504) {
      throw new Error('OVERPASS_BUSY')
    }
    throw new Error(`Overpass API error: ${res.status}`)
  }

  const data = await res.json()

  if (!data.elements?.length) return []

  return data.elements
    .filter((el) => el.tags?.amenity === 'fuel')
    .map((el)  => parseOSMElement(el, lat, lng))
    .filter((s) => s.lat != null && s.lng != null)
    .sort((a, b) => (a.dist ?? 999) - (b.dist ?? 999))
    .slice(0, MAX_STATIONS)
}

/**
 * Build the Overpass QL query string.
 * Queries nodes, ways, and relations tagged amenity=fuel.
 */
export function buildQuery(lat, lng, radiusMeters) {
  return `[out:json][timeout:30];
(
  node["amenity"="fuel"](around:${radiusMeters},${lat},${lng});
  way["amenity"="fuel"](around:${radiusMeters},${lat},${lng});
  relation["amenity"="fuel"](around:${radiusMeters},${lat},${lng});
);
out center tags;`
}

/**
 * Parse a single OSM element into a TankIT station object.
 * @param {object} el   Raw OSM element
 * @param {number} userLat
 * @param {number} userLng
 * @returns {Station}
 */
export function parseOSMElement(el, userLat, userLng) {
  const tags = el.tags || {}

  // Ways and relations have a "center" instead of direct lat/lon
  const lat = el.lat  ?? el.center?.lat ?? null
  const lng = el.lon  ?? el.center?.lon ?? null

  const dist = (lat != null && lng != null)
    ? Math.round(haversine(userLat, userLng, lat, lng) * 10) / 10
    : null

  const brand = (tags.brand || tags.operator || '').trim()
  const name  = (tags.name  || brand || 'Petrol Station').trim()

  return {
    id:           `osm_${el.id}`,
    osmId:        el.id,
    osmType:      el.type,
    name,
    brand,
    street:       tags['addr:street']       || '',
    houseNumber:  tags['addr:housenumber']  || '',
    postCode:     tags['addr:postcode']     || '',
    place:        tags['addr:city'] || tags['addr:town'] || tags['addr:village'] || '',
    lat,
    lng,
    dist,
    // OSM doesn't give real-time open/closed, but does have opening_hours
    openingHours: tags.opening_hours || null,
    isOpen:       null, // determined client-side from openingHours if needed
    // Which fuel types the station is known to sell (from OSM tags)
    hasE5:     tags['fuel:octane_95']  !== 'no',
    hasE10:    tags['fuel:e10']        !== 'no',
    hasDiesel: tags['fuel:diesel']     !== 'no',
  }
}

/**
 * Haversine formula – great-circle distance between two lat/lng points.
 * @returns {number} Distance in kilometres
 */
export function haversine(lat1, lng1, lat2, lng2) {
  const R    = 6371
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const toRad = (deg) => (deg * Math.PI) / 180
