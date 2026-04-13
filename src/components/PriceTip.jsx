import React from 'react'
import translations from '../i18n/translations.js'
import { getPriceTip } from '../utils/formatters.js'

export default function PriceTip({ language }) {
  const t   = translations[language]
  const tip = getPriceTip()
  const isFillUp = tip === 'fillUp'

  return (
    <div style={{
      display:      'flex',
      alignItems:   'center',
      gap:          '10px',
      padding:      '9px 14px',
      background:   isFillUp
        ? 'linear-gradient(90deg, rgba(6,214,160,0.1), transparent)'
        : 'linear-gradient(90deg, rgba(255,214,10,0.1), transparent)',
      borderBottom: '1px solid var(--border)',
      flexShrink:   0,
    }}>
      <div style={{
        width:          32,
        height:         32,
        borderRadius:   '50%',
        background:     isFillUp ? 'rgba(6,214,160,0.15)' : 'rgba(255,214,10,0.15)',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        fontSize:       18,
        flexShrink:     0,
      }}>
        {isFillUp ? '🐢' : '⏳'}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '500' }}>
          {t.tip.label}
        </div>
        <div style={{
          fontSize:     '13px',
          fontWeight:   '700',
          color:        isFillUp ? 'var(--accent-green)' : 'var(--accent-yellow)',
          whiteSpace:   'nowrap',
          overflow:     'hidden',
          textOverflow: 'ellipsis',
        }}>
          {isFillUp ? t.tip.fillUp : t.tip.wait}
        </div>
      </div>
      <span style={{ color: 'var(--text-muted)', fontSize: 14, flexShrink: 0 }}>›</span>
    </div>
  )
}
