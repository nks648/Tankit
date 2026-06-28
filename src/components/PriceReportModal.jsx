import React, { useState, useEffect, useRef } from 'react'
import translations from '../i18n/translations.js'
import { validatePrice } from '../utils/formatters.js'
import { getReporterName, setReporterName } from '../services/priceStore.js'
import { formatAddress } from '../utils/formatters.js'

const FUEL_CONFIG = {
  e5:     { label: 'Super E5',     color: '#06d6a0', emoji: '🟢' },
  e10:    { label: 'Super E10',    color: '#4361ee', emoji: '🔵' },
  diesel: { label: 'Diesel',       color: '#ffd60a', emoji: '🟡' },
}

/**
 * Waze-style price reporting modal.
 * Slides up from the bottom, lets users enter what they see on the price board.
 */
export default function PriceReportModal({
  station,
  existingPrices,
  language,
  onSubmit,
  onClose,
}) {
  const t = translations[language]

  const [prices,       setPrices]       = useState({ e5: '', e10: '', diesel: '' })
  const [reporterName, setReporterNameState] = useState(getReporterName)
  const [submitting,   setSubmitting]   = useState(false)
  const [submitted,    setSubmitted]    = useState(false)
  const [submitError,  setSubmitError]  = useState(null)
  const [errors,       setErrors]       = useState({})
  const [touched,      setTouched]      = useState({})

  const firstInputRef = useRef(null)

  // Pre-fill with existing community prices as a starting point
  useEffect(() => {
    if (existingPrices) {
      setPrices({
        e5:     existingPrices.e5?.price     ? String(existingPrices.e5.price.toFixed(3))     : '',
        e10:    existingPrices.e10?.price    ? String(existingPrices.e10.price.toFixed(3))    : '',
        diesel: existingPrices.diesel?.price ? String(existingPrices.diesel.price.toFixed(3)) : '',
      })
    }
  }, [existingPrices])

  // Focus first input on mount
  useEffect(() => {
    const timer = setTimeout(() => firstInputRef.current?.focus(), 300)
    return () => clearTimeout(timer)
  }, [])

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const handlePriceChange = (fuel, val) => {
    // Allow digits, dot, comma
    const cleaned = val.replace(/[^0-9.,]/g, '')
    setPrices((p) => ({ ...p, [fuel]: cleaned }))
    setTouched((t) => ({ ...t, [fuel]: true }))
    setErrors((e) => ({ ...e, [fuel]: null }))
  }

  const validate = () => {
    const errs = {}
    let hasAtLeastOne = false

    for (const fuel of ['e5', 'e10', 'diesel']) {
      const v = prices[fuel]
      if (!v) continue // Empty = user doesn't know this price – that's fine
      const { valid, error } = validatePrice(v)
      if (!valid && error) {
        errs[fuel] = error
      } else {
        hasAtLeastOne = true
      }
    }

    if (!hasAtLeastOne) {
      errs._general = t.report.atLeastOne
    }

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return

    setSubmitting(true)
    setReporterName(reporterName)

    const reports = []
    for (const fuel of ['e5', 'e10', 'diesel']) {
      const { valid, value } = validatePrice(prices[fuel])
      if (valid && value) {
        reports.push({ fuelType: fuel, price: value })
      }
    }

    try {
      await onSubmit({ reports, reporterName: reporterName.trim() || 'Anonymous' })
      setSubmitted(true)
      setTimeout(onClose, 2200)
    } catch (err) {
      setSubmitError(t.report.submitError)
      setSubmitting(false)
    }
  }

  // ── Thank-you screen ──
  if (submitted) {
    return (
      <Overlay onClose={onClose}>
        <div style={{
          display:        'flex',
          flexDirection:  'column',
          alignItems:     'center',
          justifyContent: 'center',
          padding:        '48px 24px',
          gap:            '16px',
          textAlign:      'center',
        }}>
          <div style={{ fontSize: 64, animation: 'bounceIn 0.5s ease' }}>🙌</div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--accent-green)' }}>
            {t.report.thankYouTitle}
          </div>
          <div style={{ fontSize: '14px', color: 'var(--text-secondary)', maxWidth: 260 }}>
            {t.report.thankYouBody}
          </div>
        </div>
      </Overlay>
    )
  }

  // ── Main form ──
  return (
    <Overlay onClose={onClose}>
      {/* Station header */}
      <div style={{
        padding:      '16px 20px 12px',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{
          width:          36,
          height:         4,
          background:     'var(--border)',
          borderRadius:   2,
          margin:         '0 auto 14px',
        }} />
        <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '2px' }}>
          {t.report.pricesAt}
        </div>
        <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)' }}>
          {station.brand || station.name}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
          {formatAddress(station) || `${station.lat?.toFixed(4)}, ${station.lng?.toFixed(4)}`}
        </div>
      </div>

      {/* Price inputs */}
      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '-4px' }}>
          {t.report.whatDidYouSee}
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          {['e5', 'e10', 'diesel'].map((fuel, idx) => {
            const cfg      = FUEL_CONFIG[fuel]
            const existing = existingPrices?.[fuel]
            const hasError = touched[fuel] && errors[fuel]

            return (
              <div key={fuel} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {/* Fuel label */}
                <div style={{
                  fontSize:   '12px',
                  fontWeight: '700',
                  color:      cfg.color,
                  textAlign:  'center',
                }}>
                  {cfg.label}
                </div>

                {/* Price input */}
                <div style={{
                  background:   hasError ? 'rgba(239,35,60,0.1)' : 'var(--bg-input)',
                  border:       `2px solid ${hasError ? 'var(--accent-red)' : (prices[fuel] ? cfg.color : 'var(--border)')}`,
                  borderRadius: 'var(--radius-md)',
                  overflow:     'hidden',
                  transition:   'border-color 0.2s',
                }}>
                  <input
                    ref={idx === 0 ? firstInputRef : null}
                    type="text"
                    inputMode="decimal"
                    placeholder={existing?.price?.toFixed(3) ?? '0.000'}
                    value={prices[fuel]}
                    onChange={(e) => handlePriceChange(fuel, e.target.value)}
                    style={{
                      width:      '100%',
                      background: 'transparent',
                      border:     'none',
                      color:      'var(--text-primary)',
                      fontSize:   '20px',
                      fontWeight: '700',
                      padding:    '10px 8px 4px',
                      textAlign:  'center',
                    }}
                  />
                  <div style={{
                    textAlign:    'center',
                    fontSize:     '11px',
                    color:        'var(--text-muted)',
                    padding:      '0 4px 8px',
                  }}>
                    {hasError ? '⚠ ' + (t.report[errors[fuel]] || errors[fuel]) : '€/Liter'}
                  </div>
                </div>

                {/* Last reported */}
                {existing?.price && (
                  <div style={{
                    fontSize:  '10px',
                    color:     'var(--text-muted)',
                    textAlign: 'center',
                    lineHeight: 1.3,
                  }}>
                    {t.report.last}: {existing.price.toFixed(3)}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {errors._general && (
          <div style={{ fontSize: '13px', color: 'var(--accent-red)', textAlign: 'center' }}>
            {errors._general}
          </div>
        )}

        {submitError && (
          <div style={{
            fontSize:     '13px',
            color:        'var(--accent-red)',
            background:   'rgba(239,35,60,0.08)',
            border:       '1px solid rgba(239,35,60,0.3)',
            borderRadius: 'var(--radius-sm)',
            padding:      '10px 14px',
            textAlign:    'center',
          }}>
            ⚠️ {submitError}
          </div>
        )}

        {/* Reporter name */}
        <div style={{
          display:      'flex',
          alignItems:   'center',
          gap:          '8px',
          background:   'var(--bg-input)',
          border:       '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          padding:      '8px 12px',
          marginTop:    '4px',
        }}>
          <span style={{ fontSize: 18 }}>👤</span>
          <input
            type="text"
            placeholder={t.report.namePlaceholder}
            value={reporterName === 'Anonymous' ? '' : reporterName}
            onChange={(e) => setReporterNameState(e.target.value || 'Anonymous')}
            maxLength={30}
            style={{
              flex:       1,
              background: 'transparent',
              border:     'none',
              color:      'var(--text-primary)',
              fontSize:   '14px',
            }}
          />
        </div>

        <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center' }}>
          {t.report.leaveEmpty}
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ padding: '0 20px 24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <button
          onClick={handleSubmit}
          disabled={submitting}
          style={{
            background:   submitting ? 'var(--bg-card)' : 'linear-gradient(135deg, var(--accent-blue), var(--accent-green))',
            color:        '#fff',
            border:       'none',
            borderRadius: 'var(--radius-md)',
            padding:      '15px',
            fontSize:     '16px',
            fontWeight:   '700',
            width:        '100%',
            transition:   'opacity 0.2s',
            cursor:       submitting ? 'not-allowed' : 'pointer',
          }}
        >
          {submitting ? '⟳ ' + t.report.submitting : `⛽ ${t.report.submit}`}
        </button>
        <button
          onClick={onClose}
          style={{
            background:   'transparent',
            color:        'var(--text-muted)',
            border:       '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding:      '12px',
            fontSize:     '14px',
            width:        '100%',
          }}
        >
          {t.report.cancel}
        </button>
      </div>
    </Overlay>
  )
}

// ── Backdrop + bottom-sheet wrapper ──────────────────────────────────────
function Overlay({ children, onClose }) {
  return (
    <div
      style={{
        position:   'fixed',
        inset:      0,
        zIndex:     1000,
        display:    'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
      }}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position:   'absolute',
          inset:      0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
        }}
      />

      {/* Sheet */}
      <div
        style={{
          position:     'relative',
          background:   'var(--bg-secondary)',
          borderRadius: '20px 20px 0 0',
          border:       '1px solid var(--border)',
          borderBottom: 'none',
          maxHeight:    '90dvh',
          overflowY:    'auto',
          animation:    'slideUp 0.28s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        {children}
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
        @keyframes bounceIn {
          0%   { transform: scale(0.3); opacity: 0; }
          60%  { transform: scale(1.1); }
          100% { transform: scale(1);   opacity: 1; }
        }
      `}</style>
    </div>
  )
}
