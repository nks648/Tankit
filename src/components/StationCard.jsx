import React from 'react'
import translations from '../i18n/translations.js'
import { BrandBadge } from './Header.jsx'
import { DirectionsIcon, PencilIcon, ThumbIcon, CheckIcon, FuelIcon } from './Icons.jsx'
import {
  formatPrice,
  getPrice,
  getDirectionsUrl,
  formatAddress,
  timeAgo,
  freshnessColor,
} from '../utils/formatters.js'
import { confirmPrice, hasConfirmed } from '../services/priceStore.js'

const SHORT = { e5: 'E5', e10: 'E10', diesel: 'Diesel' }

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
  const info  = prices?.[fuelType] ?? null

  const ago         = timeAgo(info?.reportedAt, t)
  const alreadyConf = !!info && hasConfirmed(station.id, fuelType, info.reportId)
  const confCount   = info?.confirmations ?? 0

  const handleConfirm = async (e) => {
    e.stopPropagation()
    if (alreadyConf) return
    try {
      await confirmPrice(station.id, fuelType, info.reportId)
    } catch (err) {
      console.warn('TankIT: confirmation failed', err.message)
    }
    onReportPrice(station, /* skipModal */ true) // parent refreshes prices
  }

  const handleReport = (e) => {
    e.stopPropagation()
    onReportPrice(station)
  }

  const otherPrices = ['e5', 'e10', 'diesel'].filter((ft) => ft !== fuelType && prices?.[ft]?.price)

  return (
    <article
      className={`card${isSelected ? ' selected' : ''}`}
      onClick={() => onSelect(station)}
    >
      <div className="card-body">
        <BrandBadge brand={station.brand} />

        <div className="card-info">
          <div className="card-title">
            <strong>{station.brand || station.name}</strong>
            {isBest && price && <span className="chip">{t.bestDeal}</span>}
          </div>
          <div className="card-sub">
            {formatAddress(station) || `${station.lat?.toFixed(4)}, ${station.lng?.toFixed(4)}`}
          </div>
          <div className="card-meta">
            {station.dist != null && <span className="tabular">{station.dist.toFixed(1)} {t.km}</span>}
            {ago && (
              <>
                <span aria-hidden="true">·</span>
                <span className="dot" style={{ background: freshnessColor(info.reportedAt) }} />
                <span>{ago}</span>
              </>
            )}
            {info?.reporterName && info.reporterName !== 'Anonymous' && (
              <span>· {t.reportedBy} {info.reporterName}</span>
            )}
          </div>
          {otherPrices.length > 0 && (
            <div className="mini-prices tabular">
              {otherPrices.map((ft) => (
                <span key={ft}>{SHORT[ft]} <b>{prices[ft].price.toFixed(3)}</b></span>
              ))}
            </div>
          )}
        </div>

        {fmt ? (
          <div className={`price tabular${isBest ? ' best' : ''}`}>
            <div className="price-value">{fmt.main}<sup>{fmt.super}</sup></div>
            <div className="price-unit">€/L · {SHORT[fuelType]}</div>
          </div>
        ) : (
          <button className="price-empty" onClick={handleReport}>
            <FuelIcon size={18} />
            {t.beFirst}
          </button>
        )}
      </div>

      <div className="card-actions">
        <a
          className="capsule filled"
          href={getDirectionsUrl(station)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
        >
          <DirectionsIcon size={15} /> {t.getDirections}
        </a>

        {info && (
          <button
            className={`capsule${alreadyConf ? ' success' : ''}`}
            onClick={handleConfirm}
            aria-pressed={alreadyConf}
          >
            {alreadyConf ? <CheckIcon size={14} /> : <ThumbIcon size={14} />}
            {alreadyConf ? t.confirmed : t.confirmPrice}
            {confCount > 0 && <span className="count tabular">{confCount}</span>}
          </button>
        )}

        <span className="spacer" />

        <button className="capsule tinted" onClick={handleReport}>
          <PencilIcon size={14} /> {t.updatePrice}
        </button>
      </div>
    </article>
  )
}
