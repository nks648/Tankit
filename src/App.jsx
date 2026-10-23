import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import Header from './components/Header.jsx'
import SearchPanel from './components/SearchPanel.jsx'
import StationList from './components/StationList.jsx'
import MapView from './components/MapView.jsx'
import BottomNav from './components/BottomNav.jsx'
import PriceReportModal from './components/PriceReportModal.jsx'
import { CheckIcon } from './components/Icons.jsx'
import { findStations } from './services/overpass.js'
import { fetchPricesForStations, reportPrice } from './services/priceStore.js'
import { geocodePostcode, reverseGeocode } from './services/geocoding.js'
import { sortStations } from './utils/formatters.js'
import translations from './i18n/translations.js'

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

  // Clean up toast timer on unmount
  useEffect(() => () => clearTimeout(toastTimer.current), [])

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
  const searchPostcode = useCallback(async (code) => {
    if (!code.trim()) return
    setLoading(true)
    setError(null)
    try {
      const { lat, lng } = await geocodePostcode(code)
      setUserCoords({ lat, lng })
      await doSearch(lat, lng)
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }, [doSearch])

  const handleSearch = useCallback(() => searchPostcode(postcode), [searchPostcode, postcode])

  // ── Shareable links: ?plz=80331 opens straight to that area ────────────
  useEffect(() => {
    const plz = new URLSearchParams(window.location.search).get('plz')
    if (plz && /^\d{5}$/.test(plz)) {
      setPostcode(plz)
      searchPostcode(plz)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // run once on load

  // ── GPS geolocation ────────────────────────────────────────────────────
  const handleUseLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('geo_denied')
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
    showToast(translations[language].toastThanks)
  }, [reportModal, refreshPrices, stations, showToast, language])

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
    <div className="app">
      <Header
        language={language}
        onLanguageToggle={() => setLanguage(language === 'de' ? 'en' : 'de')}
        stationsCount={sortedStations.length}
        searching={loading}
      />

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

      {/* Desktop: list + map side by side · Mobile: one pane per tab */}
      <main className="app-main">
        <section className="list-pane" style={{ display: isDesktop || activeTab !== 'map' ? 'flex' : 'none' }}>
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
        </section>

        <section className="map-pane" style={{ display: isDesktop || activeTab === 'map' ? 'block' : 'none' }}>
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
        </section>
      </main>

      {!isDesktop && (
        <BottomNav language={language} activeTab={activeTab} onTabChange={setActiveTab} />
      )}

      {reportModal && (
        <PriceReportModal
          station={reportModal.station}
          existingPrices={prices[reportModal.station.id] || null}
          language={language}
          onSubmit={handleSubmitReport}
          onClose={() => setReportModal(null)}
        />
      )}

      {toast && (
        <div className="toast" role="status" style={{ bottom: isDesktop ? 28 : 'calc(var(--bottom-nav-height) + 16px)' }}>
          <CheckIcon size={18} />
          {toast.msg}
        </div>
      )}
    </div>
  )
}
