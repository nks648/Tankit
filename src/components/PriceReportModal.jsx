import React, { useState, useEffect, useRef } from 'react'
import translations from '../i18n/translations.js'
import { validatePrice, formatAddress } from '../utils/formatters.js'
import { getReporterName, setReporterName } from '../services/priceStore.js'
import { CloseIcon, CheckIcon } from './Icons.jsx'

const FUEL_ROWS = [
  { key: 'e5',     color: 'var(--green)'  },
  { key: 'e10',    color: 'var(--blue)'   },
  { key: 'diesel', color: 'var(--orange)' },
]

/**
 * Waze-style price reporting, presented as an iOS bottom sheet.
 * Users type what they see on the price board; empty fields are skipped.
 */
export default function PriceReportModal({
  station,
  existingPrices,
  language,
  onSubmit,
  onClose,
}) {
  const t = translations[language]

  const [prices,       setPrices]              = useState({ e5: '', e10: '', diesel: '' })
  const [reporterName, setReporterNameState]   = useState(getReporterName)
  const [submitting,   setSubmitting]          = useState(false)
  const [submitted,    setSubmitted]           = useState(false)
  const [submitError,  setSubmitError]         = useState(null)
  const [errors,       setErrors]              = useState({})

  const firstInputRef = useRef(null)

  // Pre-fill with existing community prices as a starting point
  // (German users type a decimal comma; validatePrice accepts both)
  useEffect(() => {
    if (!existingPrices) return
    const show = (p) => p ? (language === 'de' ? p.toFixed(3).replace('.', ',') : p.toFixed(3)) : ''
    setPrices({
      e5:     show(existingPrices.e5?.price),
      e10:    show(existingPrices.e10?.price),
      diesel: show(existingPrices.diesel?.price),
    })
  }, [existingPrices, language])

  // Focus first input once the sheet has slid in
  useEffect(() => {
    const timer = setTimeout(() => firstInputRef.current?.focus(), 320)
    return () => clearTimeout(timer)
  }, [])

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const handlePriceChange = (fuel, val) => {
    setPrices((p) => ({ ...p, [fuel]: val.replace(/[^0-9.,]/g, '') }))
    setErrors((e) => ({ ...e, [fuel]: null, _general: null }))
    setSubmitError(null)
  }

  const validate = () => {
    const errs = {}
    let hasAtLeastOne = false

    for (const { key } of FUEL_ROWS) {
      if (!prices[key]) continue // empty = user doesn't know this price
      const { valid, error } = validatePrice(prices[key])
      if (!valid && error) errs[key] = error
      else hasAtLeastOne = true
    }
    if (!hasAtLeastOne && !Object.keys(errs).length) errs._general = t.report.atLeastOne

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e) => {
    e?.preventDefault()
    if (!validate()) return

    setSubmitting(true)
    setReporterName(reporterName)

    const reports = FUEL_ROWS
      .map(({ key }) => ({ fuelType: key, ...validatePrice(prices[key]) }))
      .filter((r) => r.valid)
      .map(({ fuelType, value }) => ({ fuelType, price: value }))

    try {
      await onSubmit({ reports, reporterName: reporterName.trim() || 'Anonymous' })
      setSubmitted(true)
      setTimeout(onClose, 1800)
    } catch (err) {
      const code = err?.message
      setSubmitError(
        code === 'RATE_LIMIT'    ? t.report.rateLimited
        : code === 'IMPLAUSIBLE' ? t.report.implausible
        :                          t.report.submitError
      )
      setSubmitting(false)
    }
  }

  return (
    <div className="sheet-wrap" role="dialog" aria-modal="true" aria-label={t.report.pricesAt}>
      <div className="sheet-backdrop" onClick={onClose} />

      <div className="sheet">
        <div className="grabber" />

        {submitted ? (
          <div className="thanks">
            <div className="thanks-icon"><CheckIcon size={36} /></div>
            <h2>{t.report.thankYouTitle}</h2>
            <p>{t.report.thankYouBody}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="sheet-head">
              <div style={{ minWidth: 0 }}>
                <h2>{station.brand || station.name}</h2>
                <p>{formatAddress(station) || `${station.lat?.toFixed(4)}, ${station.lng?.toFixed(4)}`}</p>
              </div>
              <button type="button" className="sheet-close" onClick={onClose} aria-label={t.report.cancel}>
                <CloseIcon size={14} />
              </button>
            </div>

            <div className="section-label">{t.report.whatDidYouSee}</div>
            <div className="group">
              {FUEL_ROWS.map(({ key, color }, idx) => {
                const existing = existingPrices?.[key]
                const err      = errors[key]
                return (
                  <div key={key} className={`group-row${err ? ' error' : ''}`}>
                    <span className="dot" style={{ background: color, width: 10, height: 10 }} />
                    <label htmlFor={`price-${key}`}>
                      {t.fuels[key]}
                      <div className="hint">
                        {err
                          ? <span className="row-error">{t.report[err] || err}</span>
                          : existing?.price ? `${t.report.last}: ${existing.price.toFixed(3)} €` : '€ / Liter'}
                      </div>
                    </label>
                    <input
                      id={`price-${key}`}
                      ref={idx === 0 ? firstInputRef : null}
                      className="price-input"
                      type="text"
                      inputMode="decimal"
                      placeholder={language === 'de' ? '1,799' : '1.799'}
                      value={prices[key]}
                      onChange={(e) => handlePriceChange(key, e.target.value)}
                    />
                  </div>
                )
              })}
            </div>

            <div className="section-label">{t.report.nameLabel}</div>
            <div className="group">
              <div className="group-row">
                <input
                  className="name-input"
                  type="text"
                  placeholder={t.report.namePlaceholder}
                  value={reporterName === 'Anonymous' ? '' : reporterName}
                  onChange={(e) => setReporterNameState(e.target.value || 'Anonymous')}
                  maxLength={30}
                />
              </div>
            </div>
            <p className="footnote">{t.report.leaveEmpty}</p>

            {(errors._general || submitError) && (
              <div className="form-error" role="alert">{errors._general || submitError}</div>
            )}

            <div className="sheet-actions">
              <button type="submit" className="btn-large" disabled={submitting}>
                {submitting ? t.report.submitting : t.report.submit}
              </button>
              <button type="button" className="btn-large plain" onClick={onClose}>
                {t.report.cancel}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
