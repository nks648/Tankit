import React from 'react'
import translations from '../i18n/translations.js'
import { BrandBadge } from './Header.jsx'
import {
  formatPrice,
  getPrice,
  getDirectionsUrl,
  formatAddress,
  timeAgo,
  freshnessColor,
} from '../utils/formatters.js'
import { confirmPrice, hasConfirmed } from '../services/priceStore.js'

const FUEL_COLORS = {
  e5:     '#06d6a0',
  e10:    '#4361ee',
  diesel: '#ffd60a',
}

export default function StationCard({
  station,
  prices,       // { e5: { price, reportedAt, confirmations, reporterName }, ... }
  fuelType,
  isBest,
  isSelected,
  onSelect,
  onReportPrice,
  language,
}) {
  const t = translations[language]

  const price = getPrice(prices, fuelType)
  const fmt   = formatPrice(price)
  const info  = fuelType !== 'all' ? prices?.[fuelType] : null

  // ── Freshness ──
  const age   = info?.reportedAt ?? null
  const color = freshnessColor(age)
  const ago   = timeAgo(age, t)

  // ── Confirmation ──
  const canConfirm  = !!info && fuelType !== 'all'
  const alreadyConf = canConfirm && hasConfirmed(station.id, fuelType)
  const confCount   = info?.confirmations ?? 0

  const handleConfirm = (e) => {
    e.stopPropagation()
    if (!alreadyConf) {
      confirmPrice(station.id, fuelType)
      // Force a re-render via the parent (App triggers a prices refresh)
      onReportPrice(station, /* skipModal */ true)
    }
  }

  const handleReport = (e) => {
    e.stopPropagation()
    onReportPrice(station)
  }

  return (
    <div
      onClick={() => onSelect(station)}
      style={{
        background:   isSelected ? 'var(--bg-card-hover)' : 'var(--bg-card)',
        borderRadius: 'var(--radius-md)',
        border:       `1px solid ${
          isSelected ? 'var(--accent-blue)'
          : isBest   ? 'rgba(6,214,160,0.35)'
          :            'var(--border)'
        }`,
        cursor:       'pointer',
        overflow:     'hidden',
        transition:   'all 0.2s',
        position:     'relative',
      }}
      onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = 'var(--bg-card-hover)' }}
      onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'var(--bg-card)' }}
    >
      {/* Best deal top stripe */}
      {isBest && (
        <div style={{
          height:     '3px',
          background: 'linear-gradient(90deg, var(--accent-green), transparent)',
        }} />
      )}

      <div style={{ padding: '12px 14px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>

          {/* Brand badge */}
          <BrandBadge brand={station.brand} size={42} />

          {/* Station info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{
                fontSize:     '14px',
                fontWeight:   '700',
                color:        'var(--text-primary)',
                overflow:     'hidden',
                textOverflow: 'ellipsis',
                whiteSpace:   'nowrap',
                maxWidth:     '160px',
              }}>
                {station.brand || station.name}
              </span>
              {isBest && price && (
                <span style={{
                  fontSize:   '10px',
                  fontWeight: '700',
                  color:      'var(--accent-green)',
                  background: 'rgba(6,214,160,0.12)',
                  border:     '1px solid rgba(6,214,160,0.25)',
                  borderRadius: 'var(--radius-full)',
                  padding:    '1px 6px',
                  flexShrink: 0,
                }}>
                  {t.bestDeal}
                </span>
              )}
            </div>

            <div style={{
              fontSize:     '12px',
              color:        'var(--text-muted)',
              whiteSpace:   'nowrap',
              overflow:     'hidden',
              textOverflow: 'ellipsis',
              marginTop:    '2px',
            }}>
              {formatAddress(station) || `${station.lat?.toFixed(4)}, ${station.lng?.toFixed(4)}`}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '5px', flexWrap: 'wrap' }}>
              {/* Distance */}
              {station.dist != null && (
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  📍 {station.dist.toFixed(1)} {t.km}
                </span>
              )}

              {/* Price freshness */}
              {ago && (
                <>
                  <span style={{ color: 'var(--border)', fontSize: '10px' }}>·</span>
                  <span style={{ fontSize: '11px', color, fontWeight: '500' }}>
                    {ago}
                  </span>
                </>
              )}

              {/* Reporter name */}
              {info?.reporterName && info.reporterName !== 'Anonymous' && (
                <>
                  <span style={{ color: 'var(--border)', fontSize: '10px' }}>·</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {t.reportedBy} {info.reporterName}
                  </span>
                </>
              )}
            </div>

            {/* All fuel prices (mini row) */}
            {prices && Object.keys(prices).length > 0 && (
              <div style={{
                display:    'flex',
                gap:        '8px',
                marginTop:  '6px',
                flexWrap:   'wrap',
              }}>
                {['e5', 'e10', 'diesel'].map((ft) => {
                  const p = prices[ft]?.price
                  if (!p) return null
                  return (
                    <span key={ft} style={{
                      fontSize:     '11px',
                      fontWeight:   '600',
                      color:        fuelType === ft ? FUEL_COLORS[ft] : 'var(--text-muted)',
                      background:   fuelType === ft ? `${FUEL_COLORS[ft]}18` : 'transparent',
                      borderRadius: '4px',
                      padding:      fuelType === ft ? '1px 5px' : '0',
                    }}>
                      {ft === 'e5' ? 'E5' : ft === 'e10' ? 'E10' : 'D'}: {p.toFixed(3)}
                    </span>
                  )
                })}
              </div>
            )}
          </div>

          {/* Price display + actions */}
          <div style={{
            display:       'flex',
            flexDirection: 'column',
            alignItems:    'flex-end',
            gap:           '6px',
            flexShrink:    0,
          }}>
            {/* Price badge */}
            {fmt ? (
              <div style={{
                background:   isBest
                  ? 'rgba(6,214,160,0.1)'
                  : 'rgba(255,255,255,0.04)',
                border:       `1px solid ${isBest ? 'rgba(6,214,160,0.3)' : 'var(--border)'}`,
                borderRadius: 'var(--radius-sm)',
                padding:      '6px 10px',
                textAlign:    'center',
                minWidth:     '68px',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
                  <span style={{
                    fontSize:   '22px',
                    fontWeight: '800',
                    lineHeight: 1,
                    color:      isBest ? 'var(--accent-green)' : 'var(--text-primary)',
                  }}>
                    {fmt.main}
                  </span>
                  <sup style={{
                    fontSize:   '13px',
                    fontWeight: '800',
                    marginTop:  '3px',
                    lineHeight: 1,
                    color:      isBest ? 'var(--accent-green)' : 'var(--text-secondary)',
                  }}>
                    {fmt.super}
                  </sup>
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '1px' }}>€/L</div>
              </div>
            ) : (
              /* No price yet – invite reporting */
              <div style={{
                background:   'rgba(67,97,238,0.08)',
                border:       '1px dashed rgba(67,97,238,0.4)',
                borderRadius: 'var(--radius-sm)',
                padding:      '8px 10px',
                textAlign:    'center',
                minWidth:     '68px',
                cursor:       'pointer',
              }}
                onClick={handleReport}
              >
                <div style={{ fontSize: 18, lineHeight: 1, marginBottom: '3px' }}>⛽</div>
                <div style={{ fontSize: '10px', color: 'var(--accent-blue)', fontWeight: '700' }}>
                  {t.beFirst}
                </div>
              </div>
            )}

            {/* Directions link */}
            <a
              href={getDirectionsUrl(station)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              style={{
                display:        'flex',
                alignItems:     'center',
                gap:            '3px',
                background:     'var(--accent-blue)',
                color:          '#fff',
                borderRadius:   'var(--radius-full)',
                padding:        '4px 10px',
                fontSize:       '11px',
                fontWeight:     '600',
                textDecoration: 'none',
                whiteSpace:     'nowrap',
              }}
            >
              ↗ {t.getDirections}
            </a>
          </div>
        </div>

        {/* ── Action bar ── */}
        <div style={{
          display:       'flex',
          gap:           '8px',
          marginTop:     '10px',
          paddingTop:    '10px',
          borderTop:     '1px solid var(--border)',
          alignItems:    'center',
        }}>

          {/* Confirm price */}
          {canConfirm && (
            <button
              onClick={handleConfirm}
              style={{
                display:      'flex',
                alignItems:   'center',
                gap:          '5px',
                background:   alreadyConf ? 'rgba(6,214,160,0.1)' : 'var(--bg-input)',
                border:       `1px solid ${alreadyConf ? 'var(--accent-green)' : 'var(--border)'}`,
                borderRadius: 'var(--radius-full)',
                padding:      '5px 12px',
                fontSize:     '12px',
                fontWeight:   '600',
                color:        alreadyConf ? 'var(--accent-green)' : 'var(--text-secondary)',
                cursor:       alreadyConf ? 'default' : 'pointer',
                transition:   'all 0.2s',
              }}
            >
              {alreadyConf ? t.confirmed : `👍 ${t.confirmPrice}`}
              {confCount > 0 && (
                <span style={{
                  background:   'rgba(255,255,255,0.1)',
                  borderRadius: 'var(--radius-full)',
                  padding:      '0 5px',
                  fontSize:     '10px',
                }}>
                  {confCount}
                </span>
              )}
            </button>
          )}

          <div style={{ flex: 1 }} />

          {/* Report / update price */}
          <button
            onClick={handleReport}
            style={{
              display:      'flex',
              alignItems:   'center',
              gap:          '5px',
              background:   'linear-gradient(135deg, rgba(67,97,238,0.15), rgba(6,214,160,0.1))',
              border:       '1px solid rgba(67,97,238,0.3)',
              borderRadius: 'var(--radius-full)',
              padding:      '5px 14px',
              fontSize:     '12px',
              fontWeight:   '700',
              color:        'var(--accent-blue)',
              cursor:       'pointer',
              transition:   'all 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(67,97,238,0.2)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'linear-gradient(135deg, rgba(67,97,238,0.15), rgba(6,214,160,0.1))'}
          >
            ✏️ {t.updatePrice}
          </button>
        </div>
      </div>
    </div>
  )
}
