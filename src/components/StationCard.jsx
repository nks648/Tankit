import React from 'react'
import translations from '../i18n/translations.js'
import { BrandBadge } from './Header.jsx'
import { formatPrice, getPrice, getDirectionsUrl, formatAddress } from '../services/tankerkoenig.js'

export default function StationCard({
  station,
  fuelType,
  isBest,
  isSelected,
  onSelect,
  language,
  rank,
}) {
  const t     = translations[language]
  const price = getPrice(station, fuelType)
  const fmt   = formatPrice(price)

  const cardBg = isSelected ? 'var(--bg-card-hover)' : 'var(--bg-card)'

  return (
    <div
      onClick={() => onSelect(station)}
      style={{
        background:   cardBg,
        borderRadius: 'var(--radius-md)',
        border:       '1px solid ' + (isSelected ? 'var(--accent-blue)' : (isBest ? 'rgba(6,214,160,0.3)' : 'var(--border)')),
        padding:      '12px 14px',
        cursor:       'pointer',
        transition:   'all 0.2s ease',
        position:     'relative',
        overflow:     'hidden',
      }}
      onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = 'var(--bg-card-hover)' }}
      onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = cardBg }}
    >
      {/* Best deal ribbon */}
      {isBest && (
        <div style={{
          position:   'absolute',
          top:        0,
          left:       0,
          right:      0,
          height:     '2px',
          background: 'linear-gradient(90deg, var(--accent-green), transparent)',
        }} />
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>

        {/* Brand badge */}
        <BrandBadge brand={station.brand} size={42} />

        {/* Station info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            display:      'flex',
            alignItems:   'center',
            gap:          '6px',
            marginBottom: '2px',
          }}>
            <span style={{
              fontSize:     '14px',
              fontWeight:   '700',
              color:        'var(--text-primary)',
              whiteSpace:   'nowrap',
              overflow:     'hidden',
              textOverflow: 'ellipsis',
            }}>
              {station.brand || station.name}
            </span>
            {isBest && (
              <span style={{
                fontSize:     '10px',
                fontWeight:   '700',
                color:        'var(--accent-green)',
                background:   'rgba(6,214,160,0.12)',
                border:       '1px solid rgba(6,214,160,0.25)',
                borderRadius: 'var(--radius-full)',
                padding:      '1px 6px',
                flexShrink:   0,
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
          }}>
            {formatAddress(station)}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
            {/* Open/closed */}
            <span style={{
              fontSize:   '11px',
              fontWeight: '600',
              color:      station.isOpen ? 'var(--accent-green)' : 'var(--accent-red)',
            }}>
              {station.isOpen ? t.openNow : t.closedNow}
            </span>
            <span style={{ color: 'var(--border)', fontSize: '11px' }}>•</span>
            {/* Distance */}
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              {station.dist != null ? `${station.dist.toFixed(1)} ${t.km}` : ''}
            </span>
            {/* Show all prices for all fuel tab */}
            {fuelType !== 'all' && station.e5 && station.e10 && station.diesel && (
              <>
                <span style={{ color: 'var(--border)', fontSize: '11px' }}>•</span>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                  E5: {station.e5?.toFixed(3)}  ·  E10: {station.e10?.toFixed(3)}  ·  D: {station.diesel?.toFixed(3)}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Price + nav */}
        <div style={{
          display:        'flex',
          flexDirection:  'column',
          alignItems:     'flex-end',
          gap:            '8px',
          flexShrink:     0,
        }}>
          {/* Price display */}
          {fmt ? (
            <div style={{
              background:   isBest
                ? 'linear-gradient(135deg, rgba(6,214,160,0.15), rgba(6,214,160,0.05))'
                : 'rgba(255,255,255,0.04)',
              border:       '1px solid ' + (isBest ? 'rgba(6,214,160,0.3)' : 'var(--border)'),
              borderRadius: 'var(--radius-sm)',
              padding:      '6px 10px',
              textAlign:    'center',
              minWidth:     '64px',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
                <span style={{
                  fontSize:   '22px',
                  fontWeight: '800',
                  color:      isBest ? 'var(--accent-green)' : 'var(--text-primary)',
                  lineHeight: 1,
                }}>
                  {fmt.main}
                </span>
                <sup style={{
                  fontSize:   '13px',
                  fontWeight: '800',
                  color:      isBest ? 'var(--accent-green)' : 'var(--text-secondary)',
                  marginTop:  '3px',
                  lineHeight: 1,
                }}>
                  {fmt.super}
                </sup>
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '1px' }}>€/L</div>
            </div>
          ) : (
            <div style={{
              fontSize:   '13px',
              color:      'var(--text-muted)',
              fontStyle:  'italic',
            }}>
              {t.priceNotAvail}
            </div>
          )}

          {/* Navigate button */}
          <a
            href={getDirectionsUrl(station)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            style={{
              display:        'flex',
              alignItems:     'center',
              gap:            '4px',
              background:     'var(--accent-blue)',
              color:          '#fff',
              borderRadius:   'var(--radius-full)',
              padding:        '5px 10px',
              fontSize:       '12px',
              fontWeight:     '600',
              textDecoration: 'none',
              whiteSpace:     'nowrap',
              transition:     'opacity 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          >
            ↗ {t.getDirections}
          </a>
        </div>
      </div>
    </div>
  )
}
