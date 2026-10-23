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
npm run test       # 79 unit tests
node scripts/fetch-stations.mjs   # refresh public/stations-de.json (needs Overpass access)
npm run build      # production build → dist/
npm run ci         # tests + build in one shot (use before committing)
```

---

## Repository Layout

```
Tankit/
├── index.html                  # HTML shell (Vite entry point)
├── vite.config.js              # Vite + Vitest config (base './')
├── .github/workflows/
│   ├── deploy.yml              # test + build + deploy to GitHub Pages
│   └── update-stations.yml     # weekly: refresh station list, redeploy
├── scripts/
│   └── fetch-stations.mjs      # download all German fuel stations from OSM
├── public/
│   └── stations-de.json        # ~15k stations, generated – don't edit by hand
├── package.json                # deps + scripts
├── .env.example                # env var template (copy → .env)
├── supabase/
│   └── schema.sql              # shared community DB: tables, view, spam-safe functions
├── docs/
│   └── MTS-K-Zulassungsantrag.md # draft application for official MTS-K prices
├── src/
│   ├── main.jsx                # React root mount
│   ├── App.jsx                 # Root component – all state lives here
│   ├── index.css               # Global reset, CSS variables, animations
│   ├── utils/
│   │   └── formatters.js       # Pure utility functions (fully tested)
│   ├── services/
│   │   ├── stations.js         # local search over stations-de.json
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
│   │   ├── BottomNav.jsx       # Mobile tab bar
│   │   └── Icons.jsx           # SF Symbols-style line icons (currentColor)
│   └── __tests__/
│       ├── setup.js            # jsdom + localStorage mock
│       ├── formatters.test.js  # 35 tests
│       ├── priceStore.test.js  # 20 tests (device-only mode)
│       ├── priceStore.supabase.test.js # 9 tests (shared mode, mocked)
│       └── stations.test.js    # 15 tests
```

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| UI framework | React 18 + Vite 5 | Fast HMR, easy Capacitor wrapping later |
| Map | Leaflet 1.9 + react-leaflet 4 | Free, no API key, great mobile support |
| Map tiles | OpenStreetMap standard tiles | Free, no API key (dark mode via CSS filter) |
| Station data | OpenStreetMap, bundled as `public/stations-de.json` | Free; searched locally, so no live dependency on busy Overpass servers |
| Geocoding | Nominatim (OSM) | Free, no key, converts PLZ → lat/lng |
| Price storage | localStorage (default) | Zero setup, works instantly |
| Price storage | Supabase (optional) | Free tier, shared globally across users |
| Testing | Vitest + @testing-library | Native Vite integration, fast |
| Language | JavaScript (ESM) | No TypeScript overhead for this project size |

---

## Architecture & Data Flow

### 1. Station Discovery (no prices)

```
Weekly (GitHub Action): scripts/fetch-stations.mjs
  → Overpass query for every amenity=fuel in Germany (retries 4 mirrors)
  → public/stations-de.json  (compact rows, committed, then redeploy)

In the app:
User enters postcode
  → geocoding.js: Nominatim API → { lat, lng }
  → stations.js: findStations() filters the bundled list by distance
  → Station[] sorted by distance (max 60)
```

Public Overpass servers are frequently at capacity, so the app never queries
them live. The station list is preloaded on startup and cached.
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

### `src/services/stations.js`
Searches the bundled station list (`./stations-de.json`) in the browser.

- `loadStationIndex()` – fetch the file once and cache it; throws `STATIONS_UNAVAILABLE`
- `findStations({ lat, lng, radius })` – bounding-box + haversine filter, nearest first
- `rowToStation(row, dist)` – compact row → station object (id `osm_<n|w|r><osmId>`)
- `haversine(lat1, lng1, lat2, lng2)` – great-circle distance in km

### `scripts/fetch-stations.mjs`
Node script run by `update-stations.yml` (Mondays 03:17 UTC, or manually via
*Actions → Update station list → Run workflow*). Downloads all fuel stations,
drops private / non-car ones, writes the JSON. If every mirror fails it exits
non-zero and the committed file stays as it is.

### `src/services/priceStore.js`
Storage abstraction — same API regardless of backend.

- `isSupabaseConfigured()` – env vars present
- `fetchPricesForStations(ids[])` – reads view `latest_prices` (shared) or localStorage
- `reportPrice({ stationId, fuelType, price, reporterName })` – RPC `report_price`;
  throws `RATE_LIMIT` / `IMPLAUSIBLE` / `BACKEND_ERROR` (shown in the sheet)
- `confirmPrice(stationId, fuelType, reportId)` – async, RPC `confirm_price`
- `hasConfirmed(stationId, fuelType, reportId)`, `getClientId()` (random device id)
- `getReporterName()` / `setReporterName(name)` – persisted nickname
- `configureBackend({ url, key })` – tests only

If the shared backend is unreachable, reads fall back to this device's prices.

---

## Design System (Apple HIG)

The UI follows Apple's Human Interface Guidelines. All styling lives in
`src/index.css` as CSS classes + tokens; components use class names, not
hard-coded colours.

- **Colours:** Apple system palette (`--blue #007aff`, `--green #34c759`,
  `--orange`, `--red`, `--yellow`, `--gray`), grouped backgrounds
  (`--bg`, `--surface`), labels (`--label`, `--label-2`, `--label-3`),
  `--fill`, `--separator`.
- **Light + dark mode:** tokens are redefined under
  `@media (prefers-color-scheme: dark)`; in dark mode the OSM map tiles are
  inverted with a CSS filter (`.map-dark`) to match. Don't use CARTO
  basemaps – they now require an API key.
- **Type:** system font stack (`-apple-system`, SF Pro), tabular numbers
  for prices (`.tabular`).
- **Components:** frosted `.bar` (header, search, tab bar), `.segmented`
  controls, iOS `.search-field`, inset grouped `.card`s, `.capsule` buttons
  (`filled`, `tinted`, `success`), iOS bottom `.sheet` with grabber and
  `.group` rows, `.toast` HUD, Apple Maps-style `.pin` markers.
- **Icons:** `src/components/Icons.jsx` – no emoji in the UI.
- **Motion:** sheet slide-up, card rise-in; all disabled under
  `prefers-reduced-motion`.

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
│  BottomNav           │  ← Stations | Map
└──────────────────────┘
```

---

## Map Price Pins

Price pins are Leaflet `divIcon` capsules (`.pin`) with a pointer, not image markers:
- **Green** – cheapest price in results
- **Blue** – currently selected station
- **White / dark surface** – all other stations; "–" when no price yet
- **Freshness dot** – coloured by `freshnessColor()` (green < 2 h, yellow < 6 h, orange < 24 h, gray older)

On mobile the map pane is hidden while the list tab is open; `MapController`
defers moving the map until it is visible (Leaflet throws on a 0×0 map).

---

## Network & Hosting

There are **no dev proxies**. Every external service is called straight from the
browser, so `npm run dev`, `npm run preview` and the hosted site behave identically:

| Service | URL | Purpose |
|---|---|---|
| Nominatim | `https://nominatim.openstreetmap.org` | Postcode → lat/lng |
| Stations | `./stations-de.json` (same origin) | Station list, bundled with the site |
| Supabase | `${VITE_SUPABASE_URL}` | Community prices (optional) |

`vite.config.js` sets `base: './'` so the build runs from any sub-folder.

**Deployment:** `.github/workflows/deploy.yml` runs `npm run ci` and publishes
`dist/` to GitHub Pages on every push to `main`. One-time setup: repo
**Settings → Pages → Source: GitHub Actions**. Live URL:
https://nks648.github.io/Tankit/ . For Supabase in production, add
`VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` as repository *variables*
(Settings → Secrets and variables → Actions → Variables).

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

## Supabase Setup (shared community prices)

1. Create a free project at [supabase.com](https://supabase.com), region **Frankfurt (eu-central-1)**
2. **SQL Editor → New query** → paste `supabase/schema.sql` → **Run**
3. **Project Settings → API Keys**: copy the Project URL and the
   **publishable** (or legacy `anon`) key – both are public by design
4. GitHub → **Settings → Secrets and variables → Actions → Variables**:
   add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
5. **Actions → Test & deploy → Run workflow** (default branch)

Database design (`supabase/schema.sql`):
- Tables `price_reports`, `price_confirmations` – RLS on, **no policies**, so
  visitors can't read or write them directly
- View `latest_prices` – newest report per station + fuel (7 days) with
  confirmation count; exposes no device ids
- `report_price(...)` – 1 report per device/station/fuel per 10 min, 30 per
  device per hour, price 0.80–3.50 €, within ±25 % of today's national
  median once ≥ 10 reports exist
- `confirm_price(report_id, client_id)` – once per device, not your own report
- Verified with PGlite (real Postgres) – see commit history

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
- freshnessColor (returns theme CSS vars: green < 2h, yellow < 6h, orange < 24h, gray older)

`src/__tests__/priceStore.test.js` (20 tests)
- isSupabaseConfigured (false when env empty)
- reportPrice (stores, overwrites, multiple fuels, timestamp)
- fetchPricesForStations (empty, unknown, multi-station)
- confirmPrice (first=true, duplicate=false, increments counter, no price=false)
- hasConfirmed (before/after)
- localReportCount

`src/__tests__/stations.test.js` (15 tests)
- haversine, rowToStation, findStations (radius, ordering, cap of 60)
- loadStationIndex (caches, STATIONS_UNAVAILABLE + retry)
- fetch-stations script helpers: toRow, isPublicStation

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

- **Station list freshness:** refreshed weekly from OSM. New or closed
  stations appear after the next refresh (or run the workflow manually).
- **Price staleness:** Without Supabase, prices only persist in the user's browser.
  With Supabase, `latest_prices` shows the newest report per station + fuel
  from the last 7 days.
- **No official prices yet:** see `docs/MTS-K-Zulassungsantrag.md` – needs an
  MTS-K licence and a small server (Mobilithek client pull). Don't use
  Tankerkönig (owner decision).
- **Station completeness:** OSM data is community-maintained. Some stations may
  be missing or have outdated info. Users can fix this at openstreetmap.org.
- **Opening hours:** OSM `opening_hours` strings are not parsed at runtime.
  `isOpen` is always `null` (not shown as open/closed unless a parser is added).

---

## Contributing

1. Branch from `main`
2. Run `npm run ci` before pushing — must be green
3. Keep pure utility logic in `src/utils/` (testable, no React imports)
4. Keep API calls in `src/services/` (mockable in tests)
6. Never query Overpass from the app at runtime – use the bundled station list
5. Components should be presentational where possible — state in `App.jsx`
