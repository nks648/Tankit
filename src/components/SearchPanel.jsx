import React, { useState, useRef } from 'react'
import translations from '../i18n/translations.js'

const RADIUS_OPTIONS = [5, 10, 15, 25]
const FUEL_TYPES     = ['e5', 'e10', 'diesel']

export default function SearchPanel({
  language,
  postcode,
  onPostcodeChange,
  onSearch,
  onUseLocation,
  radius,
  onRadiusChange,
  fuelType,
  onFuelTypeChange,
  sortBy,
  onSortByChange,
  loading,
  geoLoading,
}) {
  const t        = translations[language]
  const inputRef = useRef(null)

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') onSearch()
  }

  return (
    <div style={{
      background:   'var(--bg-secondary)',
      borderBottom: '1px solid var(--border)',
      padding:      '12px 16px 14px',
      display:      'flex',
      flexDirection:'column',
      gap:          '10px',
      flexShrink:   0,
    }}>

      {/* ── Postcode Search Row ── */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <div style={{
          flex:         1,
          display:      'flex',
          alignItems:   'center',
          background:   'var(--bg-input)',
          border:       '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          overflow:     'hidden',
          transition:   'border-color 0.2s',
        }}
          onFocusCapture={(e) => e.currentTarget.style.borderColor = 'var(--accent-blue)'}
          onBlurCapture={(e)  => e.currentTarget.style.borderColor = 'var(--border)'}
        >
          <span style={{ padding: '0 10px', fontSize: 16, flexShrink: 0 }}>🔍</span>
          <input
            ref={inputRef}
            type="tel"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder={t.searchPlaceholder}
            value={postcode}
            onChange={(e) => onPostcodeChange(e.target.value)}
            onKeyDown={handleKeyDown}
            maxLength={5}
            style={{
              flex:       1,
              background: 'transparent',
              border:     'none',
              color:      'var(--text-primary)',
              fontSize:   '15px',
              padding:    '10px 4px',
            }}
          />
          {postcode && (
            <button
              onClick={() => { onPostcodeChange(''); inputRef.current?.focus() }}
              style={{
                background: 'transparent',
                color:      'var(--text-muted)',
                fontSize:   '18px',
                padding:    '0 10px',
                lineHeight: 1,
              }}
            >
              ×
            </button>
          )}
        </div>

        {/* GPS button */}
        <button
          onClick={onUseLocation}
          disabled={geoLoading}
          title={t.useMyLocation}
          style={{
            background:   geoLoading ? 'var(--bg-input)' : 'var(--bg-card)',
            border:       '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            width:        44,
            height:       44,
            display:      'flex',
            alignItems:   'center',
            justifyContent: 'center',
            fontSize:     20,
            flexShrink:   0,
            transition:   'all 0.2s',
          }}
          onMouseEnter={(e) => !geoLoading && (e.currentTarget.style.background = 'var(--bg-card-hover)')}
          onMouseLeave={(e) => !geoLoading && (e.currentTarget.style.background = 'var(--bg-card)')}
        >
          {geoLoading
            ? <span style={{ fontSize: 16, animation: 'spin 1s linear infinite', display: 'block' }}>⟳</span>
            : '📍'}
        </button>

        {/* Search button */}
        <button
          onClick={onSearch}
          disabled={loading || !postcode}
          style={{
            background:   (loading || !postcode) ? 'var(--bg-card)' : 'var(--accent-blue)',
            color:        (loading || !postcode) ? 'var(--text-muted)' : '#fff',
            border:       '1px solid ' + ((loading || !postcode) ? 'var(--border)' : 'transparent'),
            borderRadius: 'var(--radius-md)',
            padding:      '0 16px',
            height:       44,
            fontSize:     '14px',
            fontWeight:   '600',
            transition:   'all 0.2s',
            flexShrink:   0,
            whiteSpace:   'nowrap',
          }}
        >
          {loading ? '…' : t.search}
        </button>
      </div>

      {/* ── Fuel Type Tabs ── */}
      <div style={{ display: 'flex', gap: '6px' }}>
        {FUEL_TYPES.map((ft) => (
          <button
            key={ft}
            onClick={() => onFuelTypeChange(ft)}
            style={{
              flex:         1,
              padding:      '7px 4px',
              borderRadius: 'var(--radius-full)',
              fontSize:     '13px',
              fontWeight:   '600',
              border:       '1px solid ' + (fuelType === ft ? 'transparent' : 'var(--border)'),
              background:   fuelType === ft ? 'var(--accent-blue)' : 'var(--bg-input)',
              color:        fuelType === ft ? '#fff' : 'var(--text-secondary)',
              transition:   'all 0.2s',
            }}
          >
            {t.fuels[ft]}
          </button>
        ))}
      </div>

      {/* ── Radius + Sort Row ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>

        {/* Radius label */}
        <span style={{ fontSize: '12px', color: 'var(--text-muted)', flexShrink: 0 }}>
          {t.radius}:
        </span>

        {/* Radius pills */}
        <div style={{ display: 'flex', gap: '4px', flex: 1 }}>
          {RADIUS_OPTIONS.map((r) => (
            <button
              key={r}
              onClick={() => onRadiusChange(r)}
              style={{
                padding:      '5px 8px',
                borderRadius: 'var(--radius-full)',
                fontSize:     '12px',
                fontWeight:   '600',
                border:       '1px solid ' + (radius === r ? 'transparent' : 'var(--border)'),
                background:   radius === r ? 'var(--accent-green)' : 'var(--bg-input)',
                color:        radius === r ? '#0f0f1a' : 'var(--text-secondary)',
                transition:   'all 0.2s',
                flexShrink:   0,
              }}
            >
              {r} {t.km}
            </button>
          ))}
        </div>

        {/* Sort toggle */}
        <div style={{
          display:      'flex',
          background:   'var(--bg-input)',
          borderRadius: 'var(--radius-full)',
          border:       '1px solid var(--border)',
          overflow:     'hidden',
          flexShrink:   0,
        }}>
          {['price', 'dist'].map((s) => (
            <button
              key={s}
              onClick={() => onSortByChange(s)}
              style={{
                padding:    '5px 10px',
                fontSize:   '12px',
                fontWeight: '600',
                background: sortBy === s ? 'var(--accent-yellow)' : 'transparent',
                color:      sortBy === s ? '#0f0f1a' : 'var(--text-secondary)',
                transition: 'all 0.2s',
                border:     'none',
              }}
            >
              {s === 'price' ? t.sortPrice : t.sortDistance}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
