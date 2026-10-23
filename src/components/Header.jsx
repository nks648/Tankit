import React from 'react'
import translations from '../i18n/translations.js'
import { FuelIcon } from './Icons.jsx'

// Brand colours for well-known German fuel chains
const BRAND_LOGOS = {
  ARAL:      { bg: '#0063ae', color: '#fff',    abbr: 'AR' },
  SHELL:     { bg: '#fbce07', color: '#dd1d21', abbr: 'SH' },
  ESSO:      { bg: '#ffffff', color: '#ed1c24', abbr: 'ES' },
  TOTAL:     { bg: '#ee3124', color: '#fff',    abbr: 'TO' },
  TOTALENERGIES: { bg: '#ee3124', color: '#fff', abbr: 'TE' },
  BP:        { bg: '#009b3a', color: '#ffe600', abbr: 'BP' },
  AGIP:      { bg: '#ffd200', color: '#000',    abbr: 'AG' },
  ENI:       { bg: '#ffd200', color: '#000',    abbr: 'EN' },
  JET:       { bg: '#ffcc00', color: '#003b7a', abbr: 'JT' },
  STAR:      { bg: '#e30613', color: '#fff',    abbr: 'ST' },
  AVIA:      { bg: '#e30613', color: '#fff',    abbr: 'AV' },
  TAMOIL:    { bg: '#e30613', color: '#fff',    abbr: 'TA' },
  HEM:       { bg: '#003c7d', color: '#fff',    abbr: 'HM' },
  WESTFALEN: { bg: '#004a99', color: '#fff',    abbr: 'WF' },
  OMV:       { bg: '#003c69', color: '#fff',    abbr: 'OM' },
  ORLEN:     { bg: '#e2001a', color: '#fff',    abbr: 'OR' },
}

export function BrandBadge({ brand }) {
  const key   = (brand || '').toUpperCase().split(' ')[0]
  const style = BRAND_LOGOS[key]
  const abbr  = style?.abbr || (brand || '?').slice(0, 2).toUpperCase()

  return (
    <div
      className="brand"
      style={{
        background: style?.bg    || 'var(--fill)',
        color:      style?.color || 'var(--label-2)',
      }}
    >
      {abbr}
    </div>
  )
}

export default function Header({ language, onLanguageToggle, stationsCount, searching }) {
  const t = translations[language]

  const setLang = (lang) => { if (lang !== language) onLanguageToggle() }

  return (
    <header className="header bar">
      <div className="app-icon"><FuelIcon size={18} /></div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="header-title">TankIT</div>
        <div className="header-sub">
          {searching
            ? t.loading
            : stationsCount > 0 ? t.stationsFound(stationsCount) : t.tagline}
        </div>
      </div>

      <div className="segmented compact" role="group" aria-label="Language">
        {['de', 'en'].map((lang) => (
          <button key={lang} aria-pressed={language === lang} onClick={() => setLang(lang)}>
            {lang.toUpperCase()}
          </button>
        ))}
      </div>
    </header>
  )
}
