import React, { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { getPrice, formatPrice, getDirectionsUrl, formatAddress, freshnessColor } from '../utils/formatters.js'
import translations from '../i18n/translations.js'

const TILES = {
  light: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
  dark:  'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
}

// Follow the system light/dark setting so the map matches the UI
function useColorScheme() {
  const query = '(prefers-color-scheme: dark)'
  const [dark, setDark] = useState(() => window.matchMedia?.(query).matches ?? false)
  useEffect(() => {
    const mq = window.matchMedia?.(query)
    if (!mq) return
    const handler = (e) => setDark(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return dark ? 'dark' : 'light'
}

// ── Price pin (Apple Maps-style capsule with a pointer) ───────────────────
function createPriceIcon(price, reportedAt, isBest, isSelected) {
  const fmt   = price ? formatPrice(price, false) : null
  const label = fmt ? fmt.main : '–'
  const cls   = ['pin', !price && 'empty', isBest && price && 'best', isSelected && 'selected']
    .filter(Boolean).join(' ')
  const dot   = price && reportedAt && !isBest && !isSelected
    ? `<span class="dot" style="background:${freshnessColor(reportedAt)}"></span>`
    : ''

  return L.divIcon({
    html:       `<div class="${cls}">${dot}${label}</div>`,
    className:  '',
    iconSize:   [0, 0],
    iconAnchor: [0, 6],
    popupAnchor: [0, -34],
  })
}

const userIcon = L.divIcon({
  html:       '<div class="user-dot"></div>',
  className:  '',
  iconSize:   [18, 18],
  iconAnchor: [9, 9],
})

// Fly to a new search centre or to the selected station
function MapController({ center, selected }) {
  const map     = useMap()
  const prev    = useRef(null)
  const pending = useRef(null) // centre to apply once a hidden map becomes visible

  // On mobile the map pane is display:none while the list tab is open.
  // Leaflet can't move a 0×0 map (it throws "Invalid LatLng (NaN, NaN)").
  const isVisible = () => map.getSize().x > 0 && map.getSize().y > 0

  useEffect(() => {
    if (!center) return
    const key = `${center.lat},${center.lng}`
    if (prev.current === key) return
    prev.current = key
    if (isVisible()) map.flyTo([center.lat, center.lng], 13, { duration: 1 })
    else pending.current = [center.lat, center.lng]
  }, [center, map])

  useEffect(() => {
    if (selected && isVisible()) map.panTo([selected.lat, selected.lng], { animate: true })
  }, [selected, map])

  // Re-measure when the pane is shown again (mobile tab switch) and apply
  // any search centre that arrived while it was hidden
  useEffect(() => {
    const ro = new ResizeObserver(() => {
      map.invalidateSize()
      if (pending.current && isVisible()) {
        map.setView(pending.current, 13, { animate: false })
        pending.current = null
      }
    })
    ro.observe(map.getContainer())
    return () => ro.disconnect()
  }, [map])

  return null
}

export default function MapView({
  stations,
  prices,
  userCoords,
  fuelType,
  radius,
  selectedStation,
  onSelectStation,
  onReportPrice,
  language,
}) {
  const t      = translations[language]
  const scheme = useColorScheme()

  const center = userCoords ? [userCoords.lat, userCoords.lng] : [51.1657, 10.4515] // centre of Germany

  return (
    <MapContainer center={center} zoom={userCoords ? 12 : 6} style={{ width: '100%', height: '100%' }} zoomControl>
      <MapController center={userCoords} selected={selectedStation} />

      <TileLayer
        key={scheme}
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
        url={TILES[scheme]}
        subdomains="abcd"
        maxZoom={20}
      />

      {userCoords && radius && (
        <Circle
          center={[userCoords.lat, userCoords.lng]}
          radius={radius * 1000}
          pathOptions={{ color: '#007aff', fillColor: '#007aff', fillOpacity: 0.05, weight: 1.5 }}
        />
      )}

      {userCoords && (
        <Marker position={[userCoords.lat, userCoords.lng]} icon={userIcon} zIndexOffset={1000} interactive={false} />
      )}

      {stations.map((station, index) => {
        const stationPrices = prices[station.id] || null
        const price         = getPrice(stationPrices, fuelType)
        const reportedAt    = stationPrices?.[fuelType]?.reportedAt
        const isBest        = index === 0 && !!price
        const isSelected    = selectedStation?.id === station.id

        return (
          <Marker
            key={station.id}
            position={[station.lat, station.lng]}
            icon={createPriceIcon(price, reportedAt, isBest, isSelected)}
            zIndexOffset={isSelected ? 500 : isBest ? 200 : 0}
            eventHandlers={{ click: () => onSelectStation(station) }}
          >
            <Popup closeButton>
              <div className="popup">
                <h3>{station.brand || station.name}</h3>
                <div className="sub">{formatAddress(station)}</div>

                {price ? (
                  <div className={`big tabular${isBest ? ' best' : ''}`}>{price.toFixed(3)} €</div>
                ) : (
                  <span className="first">{t.beFirst}</span>
                )}

                {stationPrices && (
                  <div className="row tabular">
                    {['e5', 'e10', 'diesel'].map((ft) =>
                      stationPrices[ft]?.price
                        ? <span key={ft}>{t.fuels[ft]} {stationPrices[ft].price.toFixed(3)}</span>
                        : null
                    )}
                  </div>
                )}

                <div className="actions">
                  <button className="capsule tinted" onClick={() => onReportPrice(station)}>
                    {t.updatePrice}
                  </button>
                  <a className="capsule filled" href={getDirectionsUrl(station)} target="_blank" rel="noopener noreferrer">
                    {t.getDirections}
                  </a>
                </div>
              </div>
            </Popup>
          </Marker>
        )
      })}
    </MapContainer>
  )
}
