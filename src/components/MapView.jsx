import React, { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { getPrice, formatPrice, getDirectionsUrl, formatAddress } from '../services/tankerkoenig.js'
import { BrandBadge } from './Header.jsx'
import translations from '../i18n/translations.js'

// ── Fix default Leaflet marker icons in Vite ──
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).href,
  iconUrl:       new URL('leaflet/dist/images/marker-icon.png',    import.meta.url).href,
  shadowUrl:     new URL('leaflet/dist/images/marker-shadow.png',  import.meta.url).href,
})

// ── Create a price DivIcon ──
function createPriceIcon(price, isBest, isSelected) {
  const fmt = formatPrice(price, false)
  const label = fmt ? `${fmt.main}€` : '?'

  const bg = isSelected ? '#4361ee'
           : isBest     ? '#06d6a0'
           : '#1a1a2e'

  const color = isSelected ? '#fff'
              : isBest     ? '#0f0f1a'
              : '#fff'

  const border = isSelected ? '#4361ee'
               : isBest     ? '#06d6a0'
               : 'rgba(255,255,255,0.25)'

  return L.divIcon({
    html: `
      <div style="
        background: ${bg};
        color: ${color};
        border: 2px solid ${border};
        padding: 4px 8px;
        border-radius: 20px;
        font-size: 13px;
        font-weight: 800;
        white-space: nowrap;
        box-shadow: 0 3px 10px rgba(0,0,0,0.4);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        cursor: pointer;
        transform: ${isSelected ? 'scale(1.15)' : 'scale(1)'};
        transition: transform 0.2s;
      ">${label}</div>
    `,
    className: '',
    iconAnchor: [30, 16],
    iconSize:   [60, 32],
  })
}

// ── User location icon ──
const userIcon = L.divIcon({
  html: `
    <div style="
      width: 16px; height: 16px;
      background: #4361ee;
      border: 3px solid #fff;
      border-radius: 50%;
      box-shadow: 0 0 0 4px rgba(67,97,238,0.3), 0 3px 10px rgba(0,0,0,0.4);
    "></div>
  `,
  className: '',
  iconAnchor: [8, 8],
  iconSize:   [16, 16],
})

// ── Fly-to helper ──
function MapController({ center, zoom }) {
  const map = useMap()
  const prevCenter = useRef(null)

  useEffect(() => {
    if (
      center &&
      (prevCenter.current?.lat !== center.lat || prevCenter.current?.lng !== center.lng)
    ) {
      map.flyTo([center.lat, center.lng], zoom || 12, { duration: 1.2 })
      prevCenter.current = center
    }
  }, [center, zoom, map])

  return null
}

export default function MapView({
  stations,
  userCoords,
  fuelType,
  radius,
  selectedStation,
  onSelectStation,
  language,
}) {
  const t = translations[language]

  const center = userCoords
    ? [userCoords.lat, userCoords.lng]
    : [51.1657, 10.4515] // Geographic center of Germany

  return (
    <MapContainer
      center={center}
      zoom={userCoords ? 12 : 6}
      style={{ width: '100%', height: '100%' }}
      zoomControl={true}
    >
      <MapController
        center={userCoords}
        zoom={12}
      />

      {/* ── Dark tile layer ── */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        subdomains="abcd"
        maxZoom={20}
      />

      {/* ── Search radius circle ── */}
      {userCoords && radius && (
        <Circle
          center={[userCoords.lat, userCoords.lng]}
          radius={radius * 1000}
          pathOptions={{
            color:       '#4361ee',
            fillColor:   '#4361ee',
            fillOpacity: 0.06,
            weight:      1.5,
            dashArray:   '6 4',
          }}
        />
      )}

      {/* ── User location ── */}
      {userCoords && (
        <Marker
          position={[userCoords.lat, userCoords.lng]}
          icon={userIcon}
          zIndexOffset={1000}
        >
          <Popup>
            <div style={{
              background:   '#1a1a2e',
              color:        '#fff',
              padding:      '8px',
              borderRadius: '8px',
              fontSize:     '13px',
              fontWeight:   '600',
            }}>
              📍 {t.useMyLocation}
            </div>
          </Popup>
        </Marker>
      )}

      {/* ── Station markers ── */}
      {stations.map((station, index) => {
        const price      = getPrice(station, fuelType)
        const isBest     = index === 0
        const isSelected = selectedStation?.id === station.id

        return (
          <Marker
            key={station.id}
            position={[station.lat, station.lng]}
            icon={createPriceIcon(price, isBest, isSelected)}
            zIndexOffset={isSelected ? 500 : isBest ? 200 : 0}
            eventHandlers={{ click: () => onSelectStation(station) }}
          >
            <Popup>
              <div style={{
                background:   '#16213e',
                color:        '#fff',
                borderRadius: '10px',
                padding:      '10px 12px',
                minWidth:     '180px',
                fontFamily:   '-apple-system, BlinkMacSystemFont, sans-serif',
              }}>
                <div style={{ fontWeight: '800', fontSize: '14px', marginBottom: '4px' }}>
                  {station.brand || station.name}
                </div>
                <div style={{ fontSize: '12px', color: '#9b9bb4', marginBottom: '8px' }}>
                  {formatAddress(station)}
                </div>
                {price && (
                  <div style={{
                    fontSize:   '20px',
                    fontWeight: '800',
                    color:      isBest ? '#06d6a0' : '#fff',
                    marginBottom: '8px',
                  }}>
                    {price.toFixed(3)} €/L
                  </div>
                )}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                  {station.e5    && <span style={{ fontSize: '11px', color: '#9b9bb4' }}>E5: {station.e5.toFixed(3)}</span>}
                  {station.e10   && <span style={{ fontSize: '11px', color: '#9b9bb4' }}>E10: {station.e10.toFixed(3)}</span>}
                  {station.diesel && <span style={{ fontSize: '11px', color: '#9b9bb4' }}>Diesel: {station.diesel.toFixed(3)}</span>}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{
                    fontSize: '12px',
                    fontWeight: '600',
                    color: station.isOpen ? '#06d6a0' : '#ef233c',
                  }}>
                    {station.isOpen ? t.openNow : t.closedNow}
                  </span>
                  <a
                    href={getDirectionsUrl(station)}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      background:     '#4361ee',
                      color:          '#fff',
                      borderRadius:   '20px',
                      padding:        '4px 10px',
                      fontSize:       '12px',
                      fontWeight:     '600',
                      textDecoration: 'none',
                    }}
                  >
                    ↗ {t.getDirections}
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
