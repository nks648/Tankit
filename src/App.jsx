import React, { useState, useMemo, useCallback, useEffect } from 'react'
import Header from './components/Header.jsx'
import SearchPanel from './components/SearchPanel.jsx'
import StationList from './components/StationList.jsx'
import MapView from './components/MapView.jsx'
import BottomNav from './components/BottomNav.jsx'
import { fetchStations, sortStations } from './services/tankerkoenig.js'
import { geocodePostcode, reverseGeocode } from './services/geocoding.js'

// Persist preference to localStorage
function usePersisted(key, defaultVal) {
  const [val, setVal] = useState(() => {
    try { return JSON.parse(localStorage.getItem(key)) ?? defaultVal }
    catch { return defaultVal }
  })
  const set = useCallback((v) => {
    setVal(v)
    try { localStorage.setItem(key, JSON.stringify(v)) } catch {}
  }, [key])
  return [val, set]
}

export default function App() {
  // ── Persisted preferences ──
  const [language,  setLanguage]  = usePersisted('tankit_lang', 'de')
  const [radius,    setRadius]    = usePersisted('tankit_radius', 10)
  const [fuelType,  setFuelType]  = usePersisted('tankit_fuel', 'e5')
  const [sortBy,    setSortBy]    = usePersisted('tankit_sort', 'price')

  // ── Search state ──
  const [postcode,         setPostcode]         = useState('')
  const [locationLabel,    setLocationLabel]    = useState('')
  const [userCoords,       setUserCoords]       = useState(null)
  const [stations,         setStations]         = useState([])
  const [loading,          setLoading]          = useState(false)
  const [geoLoading,       setGeoLoading]       = useState(false)
  const [error,            setError]            = useState(null)
  const [searched,         setSearched]         = useState(false)
  const [selectedStation,  setSelectedStation]  = useState(null)

  // ── View state (mobile) ──
  const [activeTab, setActiveTab] = useState('search') // 'search' | 'map' | 'saved'

  // ── Derived: sorted stations ──
  const sortedStations = useMemo(
    () => sortStations(stations, fuelType, sortBy),
    [stations, fuelType, sortBy]
  )

  // ── Core search function ──
  const doSearch = useCallback(async (lat, lng) => {
    setLoading(true)
    setError(null)
    setSelectedStation(null)

    try {
      const results = await fetchStations({ lat, lng, radius })
      setStations(results)
      setSearched(true)
    } catch (err) {
      setError(err.message || 'Unknown error')
      setStations([])
    } finally {
      setLoading(false)
    }
  }, [radius])

  // ── Search by postcode ──
  const handleSearch = useCallback(async () => {
    if (!postcode.trim()) return

    setLoading(true)
    setError(null)

    try {
      const { lat, lng, displayName } = await geocodePostcode(postcode)
      setUserCoords({ lat, lng })
      setLocationLabel(displayName)
      await doSearch(lat, lng)
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }, [postcode, doSearch])

  // ── Use device geolocation ──
  const handleUseLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.')
      return
    }
    setGeoLoading(true)
    setError(null)

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        setUserCoords({ lat, lng })

        // Reverse geocode to show a friendly label
        try {
          const label = await reverseGeocode(lat, lng)
          setLocationLabel(label)
          setPostcode(label.split(' ')[0] || '')
        } catch {
          setLocationLabel(`${lat.toFixed(3)}, ${lng.toFixed(3)}`)
        }

        setGeoLoading(false)
        await doSearch(lat, lng)
      },
      (err) => {
        setGeoLoading(false)
        setError('Location access denied. Please enter a postcode instead.')
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    )
  }, [doSearch])

  // ── Re-search when radius or fuelType changes (if we have coords) ──
  useEffect(() => {
    if (userCoords && searched) {
      doSearch(userCoords.lat, userCoords.lng)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [radius])

  // ── Select a station (sync map + list) ──
  const handleSelectStation = useCallback((station) => {
    setSelectedStation((prev) => prev?.id === station.id ? null : station)
  }, [])

  // ── Desktop: show split layout; Mobile: tabs ──
  const isDesktop = typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches

  return (
    <div style={{
      display:        'flex',
      flexDirection:  'column',
      height:         '100dvh',
      background:     'var(--bg-primary)',
      overflow:       'hidden',
    }}>
      {/* ── Header ── */}
      <Header
        language={language}
        onLanguageToggle={() => setLanguage(language === 'de' ? 'en' : 'de')}
        stationsCount={sortedStations.length}
        searching={loading}
      />

      {/* ── Search panel (always visible) ── */}
      <SearchPanel
        language={language}
        postcode={postcode}
        onPostcodeChange={setPostcode}
        onSearch={handleSearch}
        onUseLocation={handleUseLocation}
        radius={radius}
        onRadiusChange={setRadius}
        fuelType={fuelType}
        onFuelTypeChange={setFuelType}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        loading={loading}
        geoLoading={geoLoading}
      />

      {/* ── Main content area ── */}
      <div style={{
        flex:     1,
        display:  'flex',
        overflow: 'hidden',
        position: 'relative',
      }}>
        {/* Desktop: side-by-side  |  Mobile: active tab */}

        {/* Station list panel */}
        <div style={{
          width:         isDesktop ? '380px' : '100%',
          display:       (isDesktop || activeTab === 'search' || activeTab === 'saved') ? 'flex' : 'none',
          flexDirection: 'column',
          borderRight:   isDesktop ? '1px solid var(--border)' : 'none',
          overflow:      'hidden',
          flexShrink:    0,
        }}>
          <StationList
            stations={sortedStations}
            fuelType={fuelType}
            loading={loading}
            error={error}
            searched={searched}
            selectedStation={selectedStation}
            onSelectStation={handleSelectStation}
            language={language}
          />
        </div>

        {/* Map panel */}
        <div style={{
          flex:    1,
          display: (isDesktop || activeTab === 'map') ? 'block' : 'none',
          position: 'relative',
        }}>
          <MapView
            stations={sortedStations}
            userCoords={userCoords}
            fuelType={fuelType}
            radius={radius}
            selectedStation={selectedStation}
            onSelectStation={handleSelectStation}
            language={language}
          />
        </div>
      </div>

      {/* ── Bottom nav (mobile only) ── */}
      <div style={{ display: isDesktop ? 'none' : 'block' }}>
        <BottomNav
          language={language}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      </div>
    </div>
  )
}
