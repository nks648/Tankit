import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import Header from './components/Header.jsx'
import SearchPanel from './components/SearchPanel.jsx'
import StationList from './components/StationList.jsx'
import MapView from './components/MapView.jsx'
import BottomNav from './components/BottomNav.jsx'
import PriceReportModal from './components/PriceReportModal.jsx'
import { findStations } from './services/overpass.js'
import { fetchPricesForStations, reportPrice } from './services/priceStore.js'
import { geocodePostcode, reverseGeocode } from './services/geocoding.js'
import { sortStations } from './utils/formatters.js'

// Persist a value in localStorage
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
  // ── Persisted preferences ──────────────────────────────────────────────
  const [language, setLanguage] = usePersisted('tankit_lang',   'de')
  const [radius,   setRadius]   = usePersisted('tankit_radius', 10)
  const [fuelType, setFuelType] = usePersisted('tankit_fuel',   'e5')
  const [sortBy,   setSortBy]   = usePersisted('tankit_sort',   'price')

  // ── Search state ───────────────────────────────────────────────────────
  const [postcode,        setPostcode]        = useState('')
  const [userCoords,      setUserCoords]      = useState(null)
  const [stations,        setStations]        = useState([])
  const [prices,          setPrices]          = useState({}) // { stationId: { e5, e10, diesel } }
  const [loading,         setLoading]         = useState(false)
  const [geoLoading,      setGeoLoading]      = useState(false)
  const [error,           setError]           = useState(null)
  const [searched,        setSearched]        = useState(false)
  const [selectedStation, setSelectedStation] = useState(null)
  const [activeTab,       setActiveTab]       = useState('search')

  // ── Price report modal ─────────────────────────────────────────────────
  const [reportModal, setReportModal] = useState(null) // { station }

  // ── Toast notification ─────────────────────────────────────────────────
  const [toast, setToast] = useState(null)
  const toastTimer = useRef(null)

  const showToast = useCallback((msg, type = 'success') => {
    clearTimeout(toastTimer.current)
    setToast({ msg, type })
    toastTimer.current = setTimeout(() => setToast(null), 3000)
  }, [])

  // ── Refresh prices for current stations ───────────────────────────────
  const refreshPrices = useCallback(async (stationList) => {
    if (!stationList.length) return
    try {
      const ids = stationList.map((s) => s.id)
      const p   = await fetchPricesForStations(ids)
      setPrices(p)
    } catch (err) {
      console.warn('TankIT: price refresh failed', err.message)
    }
  }, [])

  // ── Core search ────────────────────────────────────────────────────────
  const doSearch = useCallback(async (lat, lng) => {
    setLoading(true)
    setError(null)
    setSelectedStation(null)
    setPrices({})

    try {
      const results = await findStations({ lat, lng, radius })
      setStations(results)
      setSearched(true)
      await refreshPrices(results)
    } catch (err) {
      setError(err.message || 'unknown')
      setStations([])
    } finally {
      setLoading(false)
    }
  }, [radius, refreshPrices])

  // ── Search by postcode ─────────────────────────────────────────────────
  const handleSearch = useCallback(async () => {
    if (!postcode.trim()) return
    setLoading(true)
    setError(null)
    try {
      const { lat, lng } = await geocodePostcode(postcode)
      setUserCoords({ lat, lng })
      await doSearch(lat, lng)
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }, [postcode, doSearch])

  // ── GPS geolocation ────────────────────────────────────────────────────
  const handleUseLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.')
      return
    }
    setGeoLoading(true)
    setError(null)

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords
        setUserCoords({ lat, lng })

        // Reverse geocode for friendly label in search box
        try {
          const label = await reverseGeocode(lat, lng)
          const plz   = label.match(/\d{5}/)?.[0] || ''
          setPostcode(plz || label.slice(0, 20))
        } catch {}

        setGeoLoading(false)
        await doSearch(lat, lng)
      },
      () => {
        setGeoLoading(false)
        setError('geo_denied')
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    )
  }, [doSearch])

  // ── Re-search when radius changes (if we have coords already) ──────────
  useEffect(() => {
    if (userCoords && searched && !loading) {
      doSearch(userCoords.lat, userCoords.lng)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [radius])

  // ── Sorted stations ────────────────────────────────────────────────────
  const sortedStations = useMemo(
    () => sortStations(stations, prices, fuelType, sortBy),
    [stations, prices, fuelType, sortBy]
  )

  // ── Select station (sync map + list) ──────────────────────────────────
  const handleSelectStation = useCallback((station) => {
    setSelectedStation((prev) => prev?.id === station.id ? null : station)
  }, [])

  // ── Open price report modal (or just refresh on confirmation) ──────────
  const handleReportPrice = useCallback((station, skipModal = false) => {
    if (skipModal) {
      // Confirmation: just refresh prices
      refreshPrices(stations)
      return
    }
    setReportModal({ station })
  }, [refreshPrices, stations])

  // ── Submit price report ────────────────────────────────────────────────
  const handleSubmitReport = useCallback(async ({ reports, reporterName }) => {
    const { station } = reportModal
    for (const { fuelType: ft, price } of reports) {
      await reportPrice({
        stationId:    station.id,
        fuelType:     ft,
        price,
        reporterName,
      })
    }
    // Refresh prices after submitting
    await refreshPrices(stations)
    showToast('✅ Prices updated – thank you! 🙏')
  }, [reportModal, refreshPrices, stations, showToast])

  // ── Desktop detection ──────────────────────────────────────────────────
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches
  )
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const handler = (e) => setIsDesktop(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div style={{
      display:       'flex',
      flexDirection: 'column',
      height:        '100dvh',
      background:    'var(--bg-primary)',
      overflow:      'hidden',
    }}>

      {/* ── Header ── */}
      <Header
        language={language}
        onLanguageToggle={() => setLanguage(language === 'de' ? 'en' : 'de')}
        stationsCount={sortedStations.length}
        searching={loading}
      />

      {/* ── Search panel ── */}
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

      {/* ── Main content ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>

        {/* Station list */}
        <div style={{
          width:         isDesktop ? '400px' : '100%',
          display:       (isDesktop || activeTab === 'search' || activeTab === 'saved') ? 'flex' : 'none',
          flexDirection: 'column',
          borderRight:   isDesktop ? '1px solid var(--border)' : 'none',
          overflow:      'hidden',
          flexShrink:    0,
        }}>
          <StationList
            stations={sortedStations}
            prices={prices}
            fuelType={fuelType}
            loading={loading}
            error={error}
            searched={searched}
            selectedStation={selectedStation}
            onSelectStation={handleSelectStation}
            onReportPrice={handleReportPrice}
            language={language}
          />
        </div>

        {/* Map */}
        <div style={{
          flex:    1,
          display: (isDesktop || activeTab === 'map') ? 'block' : 'none',
        }}>
          <MapView
            stations={sortedStations}
            prices={prices}
            userCoords={userCoords}
            fuelType={fuelType}
            radius={radius}
            selectedStation={selectedStation}
            onSelectStation={handleSelectStation}
            onReportPrice={handleReportPrice}
            language={language}
          />
        </div>
      </div>

      {/* ── Bottom nav (mobile only) ── */}
      {!isDesktop && (
        <BottomNav
          language={language}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      )}

      {/* ── Price report modal ── */}
      {reportModal && (
        <PriceReportModal
          station={reportModal.station}
          existingPrices={prices[reportModal.station.id] || null}
          language={language}
          onSubmit={handleSubmitReport}
          onClose={() => setReportModal(null)}
        />
      )}

      {/* ── Toast notification ── */}
      {toast && (
        <div style={{
          position:     'fixed',
          bottom:       isDesktop ? 24 : 80,
          left:         '50%',
          transform:    'translateX(-50%)',
          background:   'var(--bg-card)',
          color:        'var(--text-primary)',
          border:       '1px solid var(--accent-green)',
          borderRadius: 'var(--radius-full)',
          padding:      '10px 20px',
          fontSize:     '14px',
          fontWeight:   '600',
          zIndex:       2000,
          boxShadow:    'var(--shadow-lg)',
          animation:    'fadeIn 0.2s ease',
          whiteSpace:   'nowrap',
        }}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}
