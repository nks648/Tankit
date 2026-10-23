import React from 'react'
import translations from '../i18n/translations.js'
import { ListIcon, MapIcon } from './Icons.jsx'

export default function BottomNav({ language, activeTab, onTabChange }) {
  const t = translations[language]

  const tabs = [
    { id: 'search', Icon: ListIcon, label: t.navList },
    { id: 'map',    Icon: MapIcon,  label: t.navMap  },
  ]

  return (
    <nav className="tabbar bar">
      {tabs.map(({ id, Icon, label }) => (
        <button key={id} aria-pressed={activeTab === id} onClick={() => onTabChange(id)}>
          <Icon size={24} />
          {label}
        </button>
      ))}
    </nav>
  )
}
