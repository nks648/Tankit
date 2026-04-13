import React from 'react'
import translations from '../i18n/translations.js'

export default function BottomNav({ language, activeTab, onTabChange }) {
  const t = translations[language]

  const tabs = [
    { id: 'search', icon: '🔍', label: t.navSearch },
    { id: 'map',    icon: '🗺️', label: t.navMap    },
    { id: 'saved',  icon: '♡',  label: t.navFavorites },
  ]

  return (
    <nav style={{
      height:         'var(--bottom-nav-height)',
      background:     'var(--bg-secondary)',
      borderTop:      '1px solid var(--border)',
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'space-around',
      flexShrink:     0,
      position:       'relative',
      zIndex:         100,
    }}>
      {tabs.map((tab) => {
        const active = activeTab === tab.id
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            style={{
              flex:           1,
              height:         '100%',
              display:        'flex',
              flexDirection:  'column',
              alignItems:     'center',
              justifyContent: 'center',
              gap:            '3px',
              background:     'transparent',
              border:         'none',
              color:          active ? 'var(--accent-blue)' : 'var(--text-muted)',
              transition:     'color 0.2s',
            }}
          >
            <span style={{
              fontSize:     22,
              lineHeight:   1,
              filter:       active ? 'none' : 'grayscale(1) opacity(0.6)',
              transition:   'filter 0.2s',
            }}>
              {tab.icon}
            </span>
            <span style={{
              fontSize:   '10px',
              fontWeight: active ? '700' : '500',
              lineHeight: 1,
            }}>
              {tab.label}
            </span>
            {active && (
              <div style={{
                position:   'absolute',
                bottom:     0,
                width:      32,
                height:     3,
                background: 'var(--accent-blue)',
                borderRadius: '3px 3px 0 0',
              }} />
            )}
          </button>
        )
      })}
    </nav>
  )
}
