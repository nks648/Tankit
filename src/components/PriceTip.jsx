import React from 'react'
import translations from '../i18n/translations.js'
import { getPriceTip } from '../services/tankerkoenig.js'

export default function PriceTip({ language }) {
  const t   = translations[language]
  const tip = getPriceTip()

  const isFillUp = tip === 'fillUp'

  return (
    <div style={{
      display:        'flex',
      alignItems:     'center',
      gap:            '10px',
      padding:        '10px 16px',
      background:     isFillUp
        ? 'linear-gradient(90deg, rgba(6,214,160,0.12), rgba(6,214,160,0.04))'
        : 'linear-gradient(90deg, rgba(255,214,10,0.12), rgba(255,214,10,0.04))',
      borderBottom:   '1px solid var(--border)',
      flexShrink:     0,
    }}>
      {/* Mascot emoji */}
      <div style={{
        width:          36,
        height:         36,
        borderRadius:   '50%',
        background:     isFillUp ? 'rgba(6,214,160,0.2)' : 'rgba(255,214,10,0.2)',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        fontSize:       20,
        flexShrink:     0,
      }}>
        {isFillUp ? '🐢' : '⏳'}
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '500' }}>
          {t.tip.label}
        </div>
        <div style={{
          fontSize:   '13px',
          fontWeight: '700',
          color:      isFillUp ? 'var(--accent-green)' : 'var(--accent-yellow)',
          whiteSpace: 'nowrap',
          overflow:   'hidden',
          textOverflow: 'ellipsis',
        }}>
          {isFillUp ? t.tip.fillUp : t.tip.wait}
        </div>
      </div>

      {/* Chevron */}
      <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>›</span>
    </div>
  )
}
