import React from 'react'
import translations from '../i18n/translations.js'
import StationCard from './StationCard.jsx'
import PriceTip from './PriceTip.jsx'
import { isSupabaseConfigured } from '../services/priceStore.js'
import { FuelIcon, WarningIcon, LockIcon, GlobeIcon, CheckIcon } from './Icons.jsx'

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
  dataSource,
  officialFailed,
  language,
}) {
  const t = translations[language]

  if (loading) {
    return (
      <Shell language={language}>
        <div className="empty-state">
          <div className="spinner" />
          <div className="empty-text">{t.loading}</div>
        </div>
      </Shell>
    )
  }

  if (error) {
    const message =
      error.startsWith('POSTCODE_')    ? t.errorPostcode
      : error === 'geo_denied'         ? t.errorGeo
      :                                  t.errorFetching
    return (
      <Shell language={language}>
        <div className="empty-state warn">
          <div className="empty-icon"><WarningIcon size={30} /></div>
          <div className="empty-text">{message}</div>
        </div>
      </Shell>
    )
  }

  if (!searched || stations.length === 0) {
    return (
      <Shell language={language}>
        <div className="empty-state">
          <div className="empty-icon"><FuelIcon size={30} /></div>
          <div className="empty-title">{searched ? t.noResultsTitle : t.welcomeTitle}</div>
          <div className="empty-text">{searched ? t.noResults : t.noSearch}</div>
        </div>
      </Shell>
    )
  }

  const community = isSupabaseConfigured()
  const official  = dataSource === 'official'

  return (
    <Shell language={language}>
      {official && (
        <div className="mode-note">
          <CheckIcon size={13} /> {t.modeOfficial}
        </div>
      )}
      {officialFailed && !official && (
        <div className="mode-note warn">
          <WarningIcon size={13} /> {t.officialBusy}
        </div>
      )}
      <div className="mode-note">
        {community ? <GlobeIcon size={13} /> : <LockIcon size={13} />}
        {community ? t.modeCommunity : t.modeLocal}
      </div>

      <div className="station-scroll">
        {stations.map((station, index) => (
          <div key={station.id} className={index < 6 ? 'fade-in' : ''} style={{ animationDelay: `${index * 30}ms` }}>
            <StationCard
              station={station}
              prices={prices[station.id] || null}
              fuelType={fuelType}
              isBest={index === 0 && !!prices[station.id]}
              isSelected={selectedStation?.id === station.id}
              onSelect={onSelectStation}
              onReportPrice={onReportPrice}
              language={language}
            />
          </div>
        ))}

        <p className="footer-note">
          {official ? (
            <>
              {t.footerOfficial}{' '}
              <a href="https://www.tankerkoenig.de" target="_blank" rel="noopener noreferrer">Tankerkönig</a>
              {' '}(MTS-K, CC BY 4.0)
            </>
          ) : (
            <>
              {t.footerStations}{' '}
              <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">
                © OpenStreetMap
              </a>
            </>
          )}
          <br />
          {t.footerPrices}
        </p>
      </div>
    </Shell>
  )
}

function Shell({ language, children }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <PriceTip language={language} />
      {children}
    </div>
  )
}
