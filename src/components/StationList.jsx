import React from 'react'
import translations from '../i18n/translations.js'
import StationCard from './StationCard.jsx'
import PriceTip from './PriceTip.jsx'
import { isSupabaseConfigured } from '../services/priceStore.js'

export default function StationList({
  stations,
  prices,
  fuelType,
  loading,
  error,
  searched,
  selectedStation,
  onSelectStation,
  onReportPrice,
  language,
}) {
  const t = translations[language]

  // ── Loading ──
  if (loading) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <PriceTip language={language} />
        <div style={centreStyle}>
          <Spinner />
          <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{t.loading}</span>
        </div>
      </div>
    )
  }

  // ── Error ──
  if (error) {
    const isBusy = error.includes('OVERPASS_BUSY')
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <PriceTip language={language} />
        <div style={{ ...centreStyle, textAlign: 'center', padding: '32px 24px', gap: '12px' }}>
          <span style={{ fontSize: 40 }}>{isBusy ? '⏳' : '⚠️'}</span>
          <span style={{ fontSize: '14px', color: 'var(--accent-yellow)', maxWidth: 280 }}>
            {isBusy ? t.errorOverpassBusy : t.errorFetching}
          </span>
        </div>
      </div>
    )
  }

  // ── No search yet / empty results ──
  if (!searched || stations.length === 0) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <PriceTip language={language} />
        <div style={{ ...centreStyle, textAlign: 'center', padding: '32px 24px', gap: '14px' }}>
          <span style={{ fontSize: 52 }}>⛽</span>
          <span style={{ fontSize: '14px', color: 'var(--text-secondary)', maxWidth: 280 }}>
            {searched && stations.length === 0 ? t.noResults : t.noSearch}
          </span>
        </div>
      </div>
    )
  }

  // ── Results ──
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <PriceTip language={language} />

      {/* Community mode banner */}
      <div style={{
        padding:        '8px 14px',
        background:     isSupabaseConfigured()
          ? 'linear-gradient(90deg, rgba(6,214,160,0.1), transparent)'
          : 'linear-gradient(90deg, rgba(67,97,238,0.1), transparent)',
        borderBottom:   '1px solid var(--border)',
        fontSize:       '11px',
        color:          isSupabaseConfigured() ? 'var(--accent-green)' : 'var(--accent-blue)',
        flexShrink:     0,
        display:        'flex',
        alignItems:     'center',
        gap:            '6px',
      }}>
        {isSupabaseConfigured() ? t.modeCommunity : t.modeLocal}
      </div>

      {/* Station cards */}
      <div style={{
        flex:          1,
        overflowY:     'auto',
        padding:       '10px',
        display:       'flex',
        flexDirection: 'column',
        gap:           '8px',
      }}>
        {stations.map((station, index) => (
          <div key={station.id} className={index < 5 ? 'fade-in' : ''}>
            <StationCard
              station={station}
              prices={prices[station.id] || null}
              fuelType={fuelType}
              isBest={index === 0 && !!prices[station.id]}
              isSelected={selectedStation?.id === station.id}
              onSelect={onSelectStation}
              onReportPrice={onReportPrice}
              language={language}
              rank={index + 1}
            />
          </div>
        ))}

        {/* Footer */}
        <div style={{
          textAlign:  'center',
          padding:    '16px 8px',
          fontSize:   '11px',
          color:      'var(--text-muted)',
          lineHeight: 1.8,
        }}>
          Station data:{' '}
          <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer"
            style={{ color: 'var(--accent-blue)' }}>
            © OpenStreetMap contributors
          </a>
          <br />
          Prices: community-reported. Help others by updating prices!
        </div>
      </div>
    </div>
  )
}

const centreStyle = {
  flex:           1,
  display:        'flex',
  flexDirection:  'column',
  alignItems:     'center',
  justifyContent: 'center',
  gap:            '12px',
}

function Spinner() {
  return (
    <div style={{
      width:        36,
      height:       36,
      border:       '3px solid var(--border)',
      borderTop:    '3px solid var(--accent-blue)',
      borderRadius: '50%',
      animation:    'spin 0.8s linear infinite',
    }} />
  )
}
