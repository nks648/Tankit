/**
 * TankIT – station search
 *
 * All German fuel stations (from OpenStreetMap) ship with the app as
 * public/stations-de.json, refreshed weekly by a GitHub Action
 * (scripts/fetch-stations.mjs). Searching is done locally in the browser:
 * instant, works offline once loaded, and never depends on a busy server.
 */

const STATIONS_URL = './stations-de.json'
const MAX_STATIONS = 60

let indexPromise = null

/** Load (once) and cache the station list. */
export function loadStationIndex(fetchImpl = fetch) {
  if (!indexPromise) {
    indexPromise = fetchImpl(STATIONS_URL)
      .then((res) => {
        if (!res.ok) throw new Error(`STATIONS_UNAVAILABLE ${res.status}`)
        return res.json()
      })
      .then((file) => file.stations)
      .catch((err) => {
        indexPromise = null // allow a retry on the next search
        throw new Error(err.message.startsWith('STATIONS_') ? err.message : 'STATIONS_UNAVAILABLE')
      })
  }
  return indexPromise
}

/** For tests: forget the cached list. */
export function resetStationIndex() {
  indexPromise = null
}

/**
 * Find stations within `radius` km of a point, nearest first.
 * @returns {Promise<Station[]>}
 */
export async function findStations({ lat, lng, radius }, rows) {
  const list = rows ?? await loadStationIndex()

  // Cheap bounding-box filter before the exact distance check
  const dLat = radius / 111
  const dLng = radius / (111 * Math.cos((lat * Math.PI) / 180))

  const found = []
  for (const row of list) {
    const [, sLat, sLng] = row
    if (Math.abs(sLat - lat) > dLat || Math.abs(sLng - lng) > dLng) continue
    const dist = haversine(lat, lng, sLat, sLng)
    if (dist <= radius) found.push(rowToStation(row, dist))
  }

  return found.sort((a, b) => a.dist - b.dist).slice(0, MAX_STATIONS)
}

/**
 * Turn a compact row from stations-de.json into a station object.
 * Row: [id, lat, lng, brand, name, street, houseNumber, postCode, place]
 */
export function rowToStation(row, dist = null) {
  const [id, lat, lng, brand, name, street, houseNumber, postCode, place] = row
  return {
    id:          `osm_${id}`,
    name:        name || brand || 'Tankstelle',
    brand:       brand || name || '',
    street,
    houseNumber,
    postCode,
    place,
    lat,
    lng,
    dist:        dist == null ? null : Math.round(dist * 10) / 10,
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
