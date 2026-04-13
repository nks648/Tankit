import React, { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { getPrice, formatPrice, getDirectionsUrl, formatAddress, freshnessColor } from '../utils/formatters.js'
import translations from '../i18n/translations.js'

// Fix Leaflet default icons in Vite
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).href,
  iconUrl:       new URL('leaflet/dist/images/marker-icon.png',    import.meta.url).href,
  shadowUrl:     new URL('leaflet/dist/images/marker-shadow.png',  import.meta.url).href,
})

// ── Price pin DivIcon ──────────────────────────────────────────────────────
function createPriceIcon(price, reportedAt, isBest, isSelected) {
  const fmt = price ? formatPrice(price, false) : null
  const label = fmt ? `${fmt.main}€` : '?'

  const dotColor = freshnessColor(reportedAt)

  const bg = isSelected
    ? '#4361ee'
    : isBest && price
      ? '#06d6a0'
      : '#1a1a2e'

  const textColor = isSelected
    ? '#fff'
    : isBest && price
      ? '#0f0f1a'
      : price ? '#fff' : '#9b9bb4'

  const border = isSelected
    ? '#4361ee'
    : isBest && price
      ? '#06d6a0'
      : price ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)'

  const scale = isSelected ? 1.2 : 1

  return L.divIcon({
    html: `<div style="
      background: ${bg};
      color: ${textColor};
      border: 2px solid ${border};
      padding: 4px 9px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 800;
      white-space: nowrap;
      box-shadow: 0 3px 12px rgba(0,0,0,0.5);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      cursor: pointer;
      transform: scale(${scale});
      transform-origin: center bottom;
      display: flex; align-items: center; gap: 4px;
      position: relative;
    ">
      ${label}
      ${price && reportedAt ? `<span style="
        width: 6px; height: 6px; background: ${dotColor};
        border-radius: 50%; flex-shrink: 0;
      "></span>` : ''}
    </div>`,
    className:  '',
    iconAnchor: [32, 16],
    iconSize:   [64, 32],
  })
}

// ── User location icon ─────────────────────────────────────────────────────
const userIcon = L.divIcon({
  html: `<div style="
    width: 16px; height: 16px;
    background: #4361ee;
    border: 3px solid #fff;
    border-radius: 50%;
    box-shadow: 0 0 0 5px rgba(67,97,238,0.25), 0 3px 12px rgba(0,0,0,0.4);
  "></div>`,
  className:  '',
  iconAnchor: [8, 8],
  iconSize:   [16, 16],
})

// ── Fly-to helper ──────────────────────────────────────────────────────────
function MapController({ center }) {
  const map        = useMap()
  const prevCenter = useRef(null)

  useEffect(() => {
    if (!center) return
    if (prevCenter.current?.lat === center.lat && prevCenter.current?.lng === center.lng) return
    map.flyTo([center.lat, center.lng], 13, { duration: 1.2 })
    prevCenter.current = center
  }, [center, map])

  return null
}

// ── Main component ─────────────────────────────────────────────────────────
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
  const t = translations[language]

  const defaultCenter = [51.1657, 10.4515] // Geographic center of Germany
  const mapCenter     = userCoords
    ? [userCoords.lat, userCoords.lng]
    : defaultCenter

  return (
    <MapContainer
      center={mapCenter}
      zoom={userCoords ? 12 : 6}
      style={{ width: '100%', height: '100%' }}
      zoomControl
    >
      <MapController center={userCoords} />

      {/* Dark tiles from CARTO */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        subdomains="abcd"
        maxZoom={20}
      />

      {/* Search radius */}
      {userCoords && radius && (
        <Circle
          center={[userCoords.lat, userCoords.lng]}
          radius={radius * 1000}
          pathOptions={{
            color:       '#4361ee',
            fillColor:   '#4361ee',
            fillOpacity: 0.05,
            weight:      1.5,
            dashArray:   '6 4',
          }}
        />
      )}

      {/* User location */}
      {userCoords && (
        <Marker
          position={[userCoords.lat, userCoords.lng]}
          icon={userIcon}
          zIndexOffset={1000}
        >
          <Popup>
            <PopupContent>📍 {t.useMyLocation}</PopupContent>
          </Popup>
        </Marker>
      )}

      {/* Station markers */}
      {stations.map((station, index) => {
        const stationPrices = prices[station.id] || null
        const price         = getPrice(stationPrices, fuelType)
        const reportedAt    = fuelType !== 'all'
          ? stationPrices?.[fuelType]?.reportedAt
          : null
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
            <Popup>
              <div style={{
                background:   '#16213e',
                color:        '#fff',
                borderRadius: '10px',
                padding:      '12px 14px',
                minWidth:     '180px',
                fontFamily:   '-apple-system, BlinkMacSystemFont, sans-serif',
              }}>
                <div style={{ fontWeight: '800', fontSize: '14px', marginBottom: '3px' }}>
                  {station.brand || station.name}
                </div>
                <div style={{ fontSize: '12px', color: '#9b9bb4', marginBottom: '8px' }}>
                  {formatAddress(station)}
                </div>

                {price ? (
                  <div style={{
                    fontSize:     '22px',
                    fontWeight:   '800',
                    color:        isBest ? '#06d6a0' : '#fff',
                    marginBottom: '6px',
                  }}>
                    {price.toFixed(3)} €/L
                  </div>
                ) : (
                  <div style={{
                    fontSize:     '13px',
                    color:        '#4361ee',
                    marginBottom: '6px',
                    cursor:       'pointer',
                    fontWeight:   '600',
                  }}
                    onClick={() => onReportPrice(station)}
                  >
                    ⛽ {t.beFirst}
                  </div>
                )}

                {/* All prices */}
                {stationPrices && (
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
                    {['e5', 'e10', 'diesel'].map((ft) => {
                      const p = stationPrices[ft]?.price
                      return p ? (
                        <span key={ft} style={{ fontSize: '11px', color: '#9b9bb4' }}>
                          {ft.toUpperCase()}: {p.toFixed(3)}
                        </span>
                      ) : null
                    })}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    onClick={() => onReportPrice(station)}
                    style={{
                      flex:         1,
                      background:   'rgba(67,97,238,0.2)',
                      color:        '#4361ee',
                      border:       '1px solid rgba(67,97,238,0.4)',
                      borderRadius: '20px',
                      padding:      '5px 8px',
                      fontSize:     '11px',
                      fontWeight:   '700',
                      cursor:       'pointer',
                    }}
                  >
                    ✏️ {t.updatePrice}
                  </button>
                  <a
                    href={getDirectionsUrl(station)}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      flex:           1,
                      background:     '#4361ee',
                      color:          '#fff',
                      borderRadius:   '20px',
                      padding:        '5px 8px',
                      fontSize:       '11px',
                      fontWeight:     '700',
                      textDecoration: 'none',
                      textAlign:      'center',
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

function PopupContent({ children }) {
  return (
    <div style={{
      background:   '#1a1a2e',
      color:        '#fff',
      padding:      '8px 10px',
      borderRadius: '8px',
      fontSize:     '13px',
      fontWeight:   '600',
      fontFamily:   '-apple-system, BlinkMacSystemFont, sans-serif',
    }}>
      {children}
    </div>
  )
}
