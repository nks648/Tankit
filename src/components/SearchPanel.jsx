import React, { useRef } from 'react'
import translations from '../i18n/translations.js'
import { SearchIcon, LocationIcon, CloseIcon } from './Icons.jsx'

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

  const handleSubmit = (e) => {
    e.preventDefault()
    onSearch()
  }

  return (
    <div className="search-panel bar">
      <form className="search-row" onSubmit={handleSubmit}>
        <div className="search-field">
          <SearchIcon size={17} />
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="postal-code"
            aria-label={t.searchPlaceholder}
            placeholder={t.searchPlaceholder}
            value={postcode}
            onChange={(e) => onPostcodeChange(e.target.value)}
            maxLength={5}
          />
          {postcode && (
            <button
              type="button"
              aria-label="Clear"
              onClick={() => { onPostcodeChange(''); inputRef.current?.focus() }}
              style={{
                width: 18, height: 18, borderRadius: '50%', display: 'grid', placeItems: 'center',
                background: 'var(--label-3)', color: 'var(--surface)',
              }}
            >
              <CloseIcon size={10} />
            </button>
          )}
        </div>

        <button
          type="button"
          className="icon-btn"
          onClick={onUseLocation}
          disabled={geoLoading}
          title={t.useMyLocation}
          aria-label={t.useMyLocation}
        >
          {geoLoading ? <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : <LocationIcon size={17} />}
        </button>

        <button type="submit" className="btn-primary" disabled={loading || !postcode}>
          {t.search}
        </button>
      </form>

      <div className="segmented" role="group" aria-label={t.fuelType}>
        {FUEL_TYPES.map((ft) => (
          <button key={ft} type="button" aria-pressed={fuelType === ft} onClick={() => onFuelTypeChange(ft)}>
            {t.fuels[ft]}
          </button>
        ))}
      </div>

      <div className="filter-row">
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span className="filter-label">{t.radius}</span>
          <div className="segmented compact" role="group" aria-label={t.radius}>
            {RADIUS_OPTIONS.map((r) => (
              <button key={r} type="button" aria-pressed={radius === r} onClick={() => onRadiusChange(r)}>
                {r} {t.km}
              </button>
            ))}
          </div>
        </div>

        <div className="segmented compact" role="group" aria-label={t.sortBy}>
          {['price', 'dist'].map((s) => (
            <button key={s} type="button" aria-pressed={sortBy === s} onClick={() => onSortByChange(s)}>
              {s === 'price' ? t.sortPrice : t.sortDistance}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
