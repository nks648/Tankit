import React from 'react'
import translations from '../i18n/translations.js'
import StationCard from './StationCard.jsx'
import PriceTip from './PriceTip.jsx'

export default function StationList({
  stations,
  fuelType,
  loading,
  error,
  searched,
  selectedStation,
  onSelectStation,
  language,
}) {
  const t = translations[language]

  // ── Loading state ──
  if (loading) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <PriceTip language={language} />
        <div style={{
          flex:           1,
          display:        'flex',
          flexDirection:  'column',
          alignItems:     'center',
          justifyContent: 'center',
          gap:            '12px',
          color:          'var(--text-secondary)',
          padding:        '32px',
        }}>
          <div style={{
            width:        40,
            height:       40,
            border:       '3px solid var(--border)',
            borderTop:    '3px solid var(--accent-blue)',
            borderRadius: '50%',
            animation:    'spin 0.8s linear infinite',
          }} />
          <span style={{ fontSize: '14px' }}>{t.loading}</span>
        </div>
      </div>
    )
  }

  // ── Error state ──
  if (error) {
    const isApiKey = error.includes('INVALID_API_KEY') || error.includes('API key')
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <PriceTip language={language} />
        <div style={{
          flex:           1,
          display:        'flex',
          flexDirection:  'column',
          alignItems:     'center',
          justifyContent: 'center',
          gap:            '12px',
          padding:        '32px',
          textAlign:      'center',
        }}>
          <span style={{ fontSize: 36 }}>⚠️</span>
          <span style={{ fontSize: '14px', color: 'var(--accent-yellow)' }}>
            {isApiKey ? t.apiKeyMissing : (error || t.errorFetching)}
          </span>
          {isApiKey && (
            <a
              href="https://creativecommons.tankerkoenig.de/"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize:   '13px',
                color:      'var(--accent-blue)',
                textDecoration: 'underline',
              }}
            >
              tankerkoenig.de →
            </a>
          )}
        </div>
      </div>
    )
  }

  // ── Empty / not yet searched ──
  if (!searched || stations.length === 0) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <PriceTip language={language} />
        <div style={{
          flex:           1,
          display:        'flex',
          flexDirection:  'column',
          alignItems:     'center',
          justifyContent: 'center',
          gap:            '12px',
          padding:        '32px',
          textAlign:      'center',
        }}>
          <span style={{ fontSize: 48 }}>⛽</span>
          <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
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
      <div style={{
        flex:       1,
        overflowY:  'auto',
        padding:    '12px',
        display:    'flex',
        flexDirection: 'column',
        gap:        '8px',
      }}>
        {stations.map((station, index) => (
          <div key={station.id} className={index < 3 ? 'fade-in' : ''}>
            <StationCard
              station={station}
              fuelType={fuelType}
              isBest={index === 0}
              isSelected={selectedStation?.id === station.id}
              onSelect={onSelectStation}
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
          lineHeight: 1.6,
        }}>
          Data: Markttransparenzstelle für Kraftstoffe (MTS-K)<br />
          via <a
            href="https://creativecommons.tankerkoenig.de"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--accent-blue)' }}
          >
            Tankerkoenig.de
          </a>
        </div>
      </div>
    </div>
  )
}
