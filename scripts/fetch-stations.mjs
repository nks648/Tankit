#!/usr/bin/env node
/**
 * Download every fuel station in Germany from OpenStreetMap and write a
 * compact JSON file the app searches locally (public/stations-de.json).
 *
 * Runs weekly in GitHub Actions (.github/workflows/update-stations.yml).
 * Public Overpass servers are often busy, so this retries several mirrors
 * with exponential backoff. If every attempt fails it exits non-zero and the
 * previously committed file stays in place – the app keeps working.
 *
 * Output format (arrays keep the file small):
 *   { "updated": "<ISO date>", "fields": [...], "stations": [[id, lat, lng, brand, name, street, houseNumber, postCode, place], ...] }
 */
import { writeFileSync } from 'node:fs'

const OUT = new URL('../public/stations-de.json', import.meta.url)

const MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
]

const QUERY = `[out:json][timeout:300];
area["ISO3166-1"="DE"][admin_level=2]->.de;
nwr["amenity"="fuel"](area.de);
out center tags;`

const MIN_EXPECTED = 10000 // Germany has ~14–15k stations; fewer means a bad response
const MAX_ROUNDS   = 6

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function fetchFrom(url) {
  const res = await fetch(url, {
    method:  'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent':   'TankIT-station-sync/1.0 (https://github.com/nks648/Tankit)',
    },
    body:   `data=${encodeURIComponent(QUERY)}`,
    signal: AbortSignal.timeout(6 * 60 * 1000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()
  if (!Array.isArray(data.elements)) throw new Error('no elements in response')
  return data.elements
}

async function fetchElements() {
  let wait = 30_000
  for (let round = 1; round <= MAX_ROUNDS; round++) {
    for (const url of MIRRORS) {
      try {
        console.log(`round ${round}: ${url}`)
        const elements = await fetchFrom(url)
        console.log(`  → ${elements.length} elements`)
        if (elements.length >= MIN_EXPECTED) return elements
        console.log('  → too few, trying next mirror')
      } catch (err) {
        console.log(`  → failed: ${err.message}`)
      }
    }
    console.log(`all mirrors failed, waiting ${wait / 1000}s`)
    await sleep(wait)
    wait *= 2
  }
  throw new Error('Could not download stations from any Overpass mirror')
}

/** Keep public road-vehicle stations only. */
export function isPublicStation(tags = {}) {
  if (['private', 'no'].includes(tags.access)) return false
  if (tags.motorcar === 'no') return false
  return true
}

/** Convert one OSM element into the compact row stored in the JSON file. */
export function toRow(el) {
  const t   = el.tags || {}
  const lat = el.lat ?? el.center?.lat
  const lng = el.lon ?? el.center?.lon
  if (lat == null || lng == null) return null
  const brand = (t.brand || t.operator || '').trim()
  return [
    `${el.type[0]}${el.id}`,               // n123 / w456 / r789 – unique across OSM types
    Math.round(lat * 1e5) / 1e5,
    Math.round(lng * 1e5) / 1e5,
    brand,
    (t.name || '').trim(),
    t['addr:street'] || '',
    t['addr:housenumber'] || '',
    t['addr:postcode'] || '',
    t['addr:city'] || t['addr:town'] || t['addr:village'] || '',
  ]
}

async function main() {
  const elements = await fetchElements()
  const rows = elements
    .filter((el) => el.tags?.amenity === 'fuel' && isPublicStation(el.tags))
    .map(toRow)
    .filter(Boolean)
    .sort((a, b) => a[0].localeCompare(b[0]))

  const file = {
    updated:  new Date().toISOString().slice(0, 10),
    source:   '© OpenStreetMap contributors, ODbL',
    fields:   ['id', 'lat', 'lng', 'brand', 'name', 'street', 'houseNumber', 'postCode', 'place'],
    stations: rows,
  }
  writeFileSync(OUT, JSON.stringify(file))
  console.log(`wrote ${rows.length} stations to public/stations-de.json`)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => { console.error(err.message); process.exit(1) })
}
