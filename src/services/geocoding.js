/**
 * Geocoding service via OpenStreetMap Nominatim.
 * Converts a German postcode (PLZ) to lat/lng coordinates.
 */

// Nominatim allows browser requests (CORS) – call it directly so the app
// also works as a static site, not only under `npm run dev`.
const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org'

/**
 * @param {string} postcode  German postcode (PLZ), e.g. "80331"
 * @returns {Promise<{lat: number, lng: number, displayName: string}>}
 */
export async function geocodePostcode(postcode) {
  const clean = postcode.trim().replace(/\s+/g, '')
  if (!/^\d{5}$/.test(clean)) {
    throw new Error('POSTCODE_INVALID')
  }

  const url = `${NOMINATIM_BASE}/search?postalcode=${encodeURIComponent(clean)}&country=de&format=json&limit=1&addressdetails=1`
  const res = await fetch(url)

  if (!res.ok) {
    throw new Error(`Geocoding request failed: ${res.status}`)
  }

  const data = await res.json()

  if (!data || data.length === 0) {
    throw new Error('POSTCODE_NOT_FOUND')
  }

  const place = data[0]
  return {
    lat: parseFloat(place.lat),
    lng: parseFloat(place.lon),
    displayName: place.display_name || clean,
  }
}

/**
 * Reverse geocode lat/lng to get a display name.
 * @param {number} lat
 * @param {number} lng
 * @returns {Promise<string>}
 */
export async function reverseGeocode(lat, lng) {
  const url = `${NOMINATIM_BASE}/reverse?lat=${lat}&lon=${lng}&format=json&zoom=10`
  const res = await fetch(url)

  if (!res.ok) return `${lat.toFixed(3)}, ${lng.toFixed(3)}`

  const data = await res.json()
  const addr = data.address || {}
  return addr.postcode
    ? `${addr.postcode}${addr.city || addr.town || addr.village ? ` ${addr.city || addr.town || addr.village}` : ''}`
    : data.display_name || `${lat.toFixed(3)}, ${lng.toFixed(3)}`
}
