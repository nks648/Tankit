# TankIT – CLAUDE.md

> Community-driven fuel price finder for Germany.
> Free for everyone. No API keys. No login. By people, for people.

---

## Project Vision

TankIT helps drivers in Germany find the cheapest fuel near them.
Unlike apps that rely on paid APIs, **all prices are reported by real users** — just like Waze reports traffic.
Anyone can open the app, see prices near them, and update a price in 5 seconds.
No account needed. Completely free. Forever.

---

## Quick Start

```bash
npm install
npm run dev        # dev server → http://localhost:5173
npm run test       # 67 unit tests
npm run build      # production build → dist/
npm run ci         # tests + build in one shot (use before committing)
```

---

## Repository Layout

```
Tankit/
├── index.html                  # HTML shell (Vite entry point)
├── vite.config.js              # Vite + Vitest config, dev proxies
├── package.json                # deps + scripts
├── .env.example                # env var template (copy → .env)
├── supabase/
│   └── schema.sql              # Postgres schema for community backend
├── src/
│   ├── main.jsx                # React root mount
│   ├── App.jsx                 # Root component – all state lives here
│   ├── index.css               # Global reset, CSS variables, animations
│   ├── utils/
│   │   └── formatters.js       # Pure utility functions (fully tested)
│   ├── services/
│   │   ├── overpass.js         # OpenStreetMap station discovery
│   │   ├── priceStore.js       # Community price storage abstraction
│   │   └── geocoding.js        # Nominatim postcode → lat/lng
│   ├── i18n/
│   │   └── translations.js     # EN + DE string map
│   ├── components/
│   │   ├── Header.jsx          # App bar + language toggle + BrandBadge
│   │   ├── SearchPanel.jsx     # Postcode input, GPS, radius, fuel, sort
│   │   ├── MapView.jsx         # Leaflet map + price pin markers
│   │   ├── StationList.jsx     # Scrollable results list
│   │   ├── StationCard.jsx     # Single station: price, confirm, report
│   │   ├── PriceReportModal.jsx# Waze-style bottom-sheet price form
│   │   ├── PriceTip.jsx        # "Fill up now / wait" banner
│   │   └── BottomNav.jsx       # Mobile tab bar
│   └── __tests__/
│       ├── setup.js            # jsdom + localStorage mock
│       ├── formatters.test.js  # 35 tests
│       ├── priceStore.test.js  # 20 tests
│       └── overpass.test.js    # 12 tests
```

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| UI framework | React 18 + Vite 5 | Fast HMR, easy Capacitor wrapping later |
| Map | Leaflet 1.9 + react-leaflet 4 | Free, no API key, great mobile support |
| Map tiles | CARTO Dark Matter (OSM) | Free, beautiful dark theme |
| Station data | OpenStreetMap Overpass API | 100% free, community-maintained, global |
| Geocoding | Nominatim (OSM) | Free, no key, converts PLZ → lat/lng |
| Price storage | localStorage (default) | Zero setup, works instantly |
| Price storage | Supabase (optional) | Free tier, shared globally across users |
| Testing | Vitest + @testing-library | Native Vite integration, fast |
| Language | JavaScript (ESM) | No TypeScript overhead for this project size |

---

## Architecture & Data Flow

### 1. Station Discovery (no prices)

```
User enters postcode
  → geocoding.js: Nominatim API → { lat, lng }
  → overpass.js: Overpass API → raw OSM elements
  → parseOSMElement() → Station[]
  → sorted by distance
```

The Overpass query fetches all `amenity=fuel` nodes/ways/relations within the radius.
OSM data includes: brand, name, address, opening_hours, fuel type availability.
**No prices come from OSM** — prices are always community-reported.

### 2. Community Prices (separate fetch)

```
Station[] IDs
  → priceStore.fetchPricesForStations(ids)
  → localStorage (default) or Supabase REST API
  → prices map: { stationId: { e5, e10, diesel } }
```

Prices are stored per `(stationId, fuelType)` with:
- `price` – numeric value e.g. `1.899`
- `reportedAt` – ISO timestamp
- `confirmations` – how many others confirmed
- `reporterName` – "Anonymous" or user nickname

### 3. Merge & Display

```
sortStations(stations, prices, fuelType, sortBy)
  → sorted Station[] (by price or distance)
  → StationList renders StationCard for each
  → MapView renders price pin Marker for each
```

Sorting uses `prices[station.id][fuelType].price` — stations with no price
sort to the bottom regardless of sort mode.

### 4. Price Reporting (Waze-style)

```
User taps "Update Price" on any station card or map popup
  → PriceReportModal slides up
  → User fills E5 / E10 / Diesel (any or all)
  → validatePrice() checks range 0.50–5.00
  → reportPrice() → localStorage or Supabase
  → refreshPrices() re-fetches for all visible stations
  → Toast: "Thank you for helping! 🙏"
```

### 5. Price Confirmation

```
User taps "👍 Confirm" on a station card
  → confirmPrice(stationId, fuelType)
  → checks localStorage for duplicate confirmation
  → increments confirmations counter
  → returns false if already confirmed (dedup per browser)
```

---

## Key Files Explained

### `src/App.jsx`
Root of all state. Owns:
- `stations[]` – raw OSM station objects
- `prices{}` – map of stationId → fuel prices from community
- `userCoords` – `{ lat, lng }` of current search centre
- `reportModal` – which station's price form is open
- All search, geolocation, and submit handlers

Uses `usePersisted()` hook for language/radius/fuelType/sortBy (localStorage-backed).

### `src/utils/formatters.js`
Pure functions, no side effects. All tested.

| Function | Purpose |
|---|---|
| `formatPrice(price, superscript)` | `1.899` → `{ main: "1,89", super: "9" }` |
| `getPrice(prices, fuelType)` | Extract numeric price from prices object |
| `formatAddress(station)` | Build "Street 5, 80331 München" string |
| `getDirectionsUrl(station)` | Google Maps directions URL |
| `getPriceTip()` | `'fillUp'` or `'wait'` based on time of day |
| `timeAgo(isoDate, t)` | "5 min ago", "2 h ago" etc. |
| `freshnessColor(isoDate)` | CSS color string by age of report |
| `sortStations(stations, prices, fuelType, sortBy)` | Sort array in-place copy |
| `validatePrice(raw)` | `{ valid, value, error }` for user input |

### `src/services/overpass.js`
Talks to the Overpass API via the Vite dev proxy (`/api/overpass`).

Key functions:
- `findStations({ lat, lng, radius })` – main entry point, returns `Station[]`
- `parseOSMElement(el, userLat, userLng)` – normalises raw OSM data
- `buildQuery(lat, lng, radiusMeters)` – constructs Overpass QL string
- `haversine(lat1, lng1, lat2, lng2)` – great-circle distance in km

### `src/services/priceStore.js`
Storage abstraction — same API regardless of backend.

- `isSupabaseConfigured()` – checks env vars
- `fetchPricesForStations(ids[])` – bulk fetch
- `reportPrice({ stationId, fuelType, price, reporterName })` – submit report
- `confirmPrice(stationId, fuelType)` – confirm + dedup
- `hasConfirmed(stationId, fuelType)` – check if already confirmed
- `localReportCount()` – total reports in localStorage
- `getReporterName()` / `setReporterName(name)` – persisted nickname

When Supabase is configured, writes go to Supabase **and** localStorage (for instant UI feedback). Reads come from Supabase only.

---

## CSS Design System

All design tokens are CSS variables in `src/index.css`:

```css
--bg-primary:    #0f0f1a   /* page background */
--bg-secondary:  #1a1a2e   /* header, panels */
--bg-card:       #16213e   /* station cards */
--bg-card-hover: #1e2a4a
--bg-input:      #0d0d1f

--accent-blue:   #4361ee   /* primary action, selected */
--accent-green:  #06d6a0   /* best deal, open, fresh */
--accent-yellow: #ffd60a   /* sort active, tip banner */
--accent-red:    #ef233c   /* closed, error */
--accent-orange: #fb8500   /* stale prices */

--text-primary:   #ffffff
--text-secondary: #9b9bb4
--text-muted:     #5c5c7a

--radius-sm:   8px
--radius-md:   12px
--radius-lg:   20px
--radius-full: 999px

--header-height:       60px
--bottom-nav-height:   64px
```

---

## Responsive Layout

**Desktop (≥ 768px)**
```
┌─────────────────────────────────────────────┐
│  Header (TankIT logo + language toggle)      │
├─────────────────────────────────────────────┤
│  SearchPanel (postcode, GPS, radius, fuel)   │
├──────────────────────┬──────────────────────┤
│  StationList (400px) │  MapView (flex: 1)   │
│  ├ PriceTip banner   │  (Leaflet dark map)  │
│  ├ mode badge        │  (price pin markers) │
│  └ StationCards      │  (radius circle)     │
└──────────────────────┴──────────────────────┘
```

**Mobile (< 768px)**
```
┌──────────────────────┐
│  Header              │
│  SearchPanel         │
│  [active tab content]│  ← StationList or MapView
│  BottomNav           │  ← Search | Map | Saved
└──────────────────────┘
```

---

## Map Price Pins

Price pins are Leaflet `divIcon` HTML elements, not image markers.
Color coding:
- **Green** (`#06d6a0`) – best price in results
- **Blue** (`#4361ee`) – currently selected station
- **Dark** (`#1a1a2e`) – all other stations
- **Freshness dot** – small colored circle on each pin using `freshnessColor()`

---

## Vite Dev Proxies

Configured in `vite.config.js` to avoid CORS issues in development:

| Proxy path | Target | Purpose |
|---|---|---|
| `/api/nominatim` | `nominatim.openstreetmap.org` | Postcode → lat/lng, sets User-Agent header |
| `/api/overpass` | `overpass-api.de` | Station discovery |
| `/api/supabase` | `${VITE_SUPABASE_URL}` | Community prices (optional) |

**Production note:** For a deployed static site (Netlify/Vercel/GitHub Pages),
you need to either:
1. Configure the same proxies in a `netlify.toml` / `vercel.json`, or
2. Deploy a small edge function / Cloudflare Worker as the proxy

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | No | Supabase project URL e.g. `https://xxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | No | Supabase anon/public key |

Without these, the app runs in **local demo mode** — prices are saved to
`localStorage` and only visible in the same browser. Perfect for testing.

With both set, prices are **shared globally** across all users.

---

## Supabase Setup (optional)

1. Create a free project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor → New Query**
3. Paste and run `supabase/schema.sql`
4. Go to **Project Settings → API** and copy:
   - Project URL → `VITE_SUPABASE_URL`
   - `anon` public key → `VITE_SUPABASE_ANON_KEY`
5. Add both to your `.env` file

The schema creates:
- `price_reports` table with RLS (public read + insert, no delete/update)
- Indexes for fast station + time lookups
- `latest_prices` view for efficient production reads

---

## Testing

```bash
npm run test           # run once
npm run test:watch     # watch mode
npm run test:coverage  # with coverage report
```

**Test files:**

`src/__tests__/formatters.test.js` (35 tests)
- formatPrice edge cases (null, NaN, 0, rounding)
- getPrice (single fuel, all, missing)
- formatAddress (full, partial, empty)
- validatePrice (valid, too low, too high, non-numeric)
- sortStations (by price, by dist, priceless stations last)
- getPriceTip (evening → fillUp, morning → wait, weekend → fillUp)
- freshnessColor (< 2h green, < 6h yellow, < 24h orange, older gray)

`src/__tests__/priceStore.test.js` (20 tests)
- isSupabaseConfigured (false when env empty)
- reportPrice (stores, overwrites, multiple fuels, timestamp)
- fetchPricesForStations (empty, unknown, multi-station)
- confirmPrice (first=true, duplicate=false, increments counter, no price=false)
- hasConfirmed (before/after)
- localReportCount

`src/__tests__/overpass.test.js` (12 tests)
- haversine (same point=0, Munich→Berlin≈504km, short distance)
- parseOSMElement (node, way/center, fallback name, missing coords, fuel tags)
- buildQuery (has coords, radius, node/way/relation, JSON output)

---

## i18n

Two languages supported: **German (de)** and **English (en)**.
Default is German.

All strings live in `src/i18n/translations.js`.
Components receive `language` prop and access `translations[language]`.
Language preference is persisted in localStorage (`tankit_lang`).

To add a new language:
1. Add a new key to `translations` in `translations.js`
2. Add a flag/label to the `Header` toggle button

---

## Future / Mobile App Conversion

The project is structured for easy conversion to a native mobile app.

**Capacitor (recommended):**
```bash
npm install @capacitor/core @capacitor/cli
npx cap init TankIT com.tankit.app
npm run build
npx cap add ios      # requires macOS + Xcode
npx cap add android  # requires Android Studio
npx cap open ios
```

**What to replace for native:**
- `react-leaflet` → `react-native-maps` (if going React Native)
- `localStorage` → `@capacitor/preferences`
- Geolocation → `@capacitor/geolocation` (better permissions handling)
- URL navigation links → native Maps deep links

---

## Known Limitations

- **Overpass API rate limit:** Shared public infrastructure. Busy times may return
  503/504. The app shows a friendly "server busy" message and the user can retry.
- **Price staleness:** Without Supabase, prices only persist in the user's browser.
  With Supabase, old reports stay in the DB — the `latest_prices` view always
  shows only the most recent report per station+fuel.
- **Station completeness:** OSM data is community-maintained. Some stations may
  be missing or have outdated info. Users can fix this at openstreetmap.org.
- **Opening hours:** OSM `opening_hours` strings are not parsed at runtime.
  `isOpen` is always `null` (not shown as open/closed unless a parser is added).
- **CORS in production:** The Vite dev proxy only works in `npm run dev`.
  A deployment proxy (Netlify redirects, Vercel rewrites, Cloudflare Worker)
  is needed for the hosted version.

---

## Contributing

1. Branch from `main`
2. Run `npm run ci` before pushing — must be green
3. Keep pure utility logic in `src/utils/` (testable, no React imports)
4. Keep API calls in `src/services/` (mockable in tests)
5. Components should be presentational where possible — state in `App.jsx`
