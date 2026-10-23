import React from 'react'
import translations from '../i18n/translations.js'
import { getPriceTip } from '../utils/formatters.js'
import { CheckIcon, ClockIcon } from './Icons.jsx'

export default function PriceTip({ language }) {
  const t        = translations[language]
  const isFillUp = getPriceTip() === 'fillUp'

  return (
    <div className="tip">
      <div className="tip-icon" style={{ background: isFillUp ? 'var(--green)' : 'var(--orange)' }}>
        {isFillUp ? <CheckIcon size={17} /> : <ClockIcon size={17} />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="tip-label">{t.tip.label}</div>
        <div className="tip-text">{isFillUp ? t.tip.fillUp : t.tip.wait}</div>
      </div>
    </div>
  )
}
