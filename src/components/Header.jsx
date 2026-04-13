import React from 'react'
import translations from '../i18n/translations.js'

const BRAND_LOGOS = {
  ARAL:    { bg: '#003f8a', color: '#fff', abbr: 'AR' },
  SHELL:   { bg: '#e4251a', color: '#fff', abbr: 'SH' },
  ESSO:    { bg: '#003087', color: '#e4251a', abbr: 'ES' },
  TOTAL:   { bg: '#e4251a', color: '#fff', abbr: 'TO' },
  BP:      { bg: '#009933', color: '#fff', abbr: 'BP' },
  AGIP:    { bg: '#cc0000', color: '#fff', abbr: 'AG' },
  ENI:     { bg: '#cc0000', color: '#fff', abbr: 'EN' },
  JET:     { bg: '#e4251a', color: '#fff', abbr: 'JT' },
  STAR:    { bg: '#002d73', color: '#ffd700', abbr: 'ST' },
  AVIA:    { bg: '#e41e20', color: '#fff', abbr: 'AV' },
  TAMOIL:    { bg: '#cc0000', color: '#ffd700', abbr: 'TA' },
  HEM:       { bg: '#0066b2', color: '#fff',    abbr: 'HM' },
  WESTFALEN: { bg: '#003f8a', color: '#fff',    abbr: 'WF' },
}

export function BrandBadge({ brand, size = 36 }) {
  const key     = (brand || '').toUpperCase().split(' ')[0]
  const style   = BRAND_LOGOS[key] || null
  const letter  = (brand || '?').charAt(0).toUpperCase()
  const abbr    = style?.abbr || (brand || '??').slice(0, 2).toUpperCase()

  return (
    <div
      style={{
        width:          size,
        height:         size,
        borderRadius:   '50%',
        background:     style?.bg || '#2a2a3e',
        color:          style?.color || '#fff',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        fontSize:       size * 0.32,
        fontWeight:     '800',
        letterSpacing:  '-0.5px',
        flexShrink:     0,
        userSelect:     'none',
      }}
    >
      {abbr}
    </div>
  )
}

export default function Header({ language, onLanguageToggle, stationsCount, searching }) {
  const t = translations[language]

  return (
    <header style={{
      height:         'var(--header-height)',
      background:     'var(--bg-secondary)',
      borderBottom:   '1px solid var(--border)',
      display:        'flex',
      alignItems:     'center',
      padding:        '0 16px',
      gap:            '12px',
      position:       'relative',
      zIndex:         100,
      flexShrink:     0,
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
        <div style={{
          width:          36,
          height:         36,
          borderRadius:   '10px',
          background:     'linear-gradient(135deg, var(--accent-blue), var(--accent-green))',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          fontSize:       20,
          flexShrink:     0,
        }}>
          ⛽
        </div>
        <div>
          <div style={{
            fontSize:   '18px',
            fontWeight: '800',
            letterSpacing: '-0.5px',
            lineHeight: 1,
            background: 'linear-gradient(90deg, var(--accent-green), var(--accent-blue))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            TankIT
          </div>
          {stationsCount > 0 && !searching && (
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.2 }}>
              {t.stationsFound(stationsCount)}
            </div>
          )}
          {searching && (
            <div style={{ fontSize: '11px', color: 'var(--accent-blue)', lineHeight: 1.2 }}>
              {t.loading}
            </div>
          )}
        </div>
      </div>

      {/* Language Toggle */}
      <button
        onClick={onLanguageToggle}
        title={language === 'de' ? 'Switch to English' : 'Auf Deutsch wechseln'}
        style={{
          background:   'var(--bg-card)',
          border:       '1px solid var(--border)',
          borderRadius: 'var(--radius-full)',
          padding:      '6px 12px',
          display:      'flex',
          alignItems:   'center',
          gap:          '6px',
          fontSize:     '13px',
          fontWeight:   '600',
          color:        'var(--text-primary)',
          transition:   'all 0.2s ease',
          flexShrink:   0,
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-card-hover)'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-card)'}
      >
        <span style={{ fontSize: 16 }}>{language === 'de' ? '🇩🇪' : '🇬🇧'}</span>
        <span>{language === 'de' ? 'DE' : 'EN'}</span>
      </button>
    </header>
  )
}
