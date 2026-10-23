import React from 'react'

/**
 * Minimal line icons in the spirit of SF Symbols.
 * All use currentColor so they follow the surrounding text colour.
 */
function Svg({ size = 20, children, fill = 'none', strokeWidth = 2 }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill={fill}
      stroke="currentColor" strokeWidth={strokeWidth}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
    >
      {children}
    </svg>
  )
}

export const SearchIcon = (p) => (
  <Svg {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></Svg>
)

export const LocationIcon = (p) => (
  <Svg {...p} fill="currentColor" strokeWidth={0}>
    <path d="M21.4 2.6 2.9 10.1c-.9.4-.8 1.7.2 1.9l7.6 1.3 1.3 7.6c.2 1 1.5 1.1 1.9.2l7.5-18.5Z" />
  </Svg>
)

export const FuelIcon = (p) => (
  <Svg {...p}>
    <path d="M4 21V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v16" /><path d="M3 21h13" /><path d="M7 8h5" />
    <path d="M15 10h2a2 2 0 0 1 2 2v5a1.5 1.5 0 0 0 3 0V8l-3-3" />
  </Svg>
)

export const MapIcon = (p) => (
  <Svg {...p}>
    <path d="m9 4-6 2.5v14L9 18l6 2.5 6-2.5V4l-6 2.5L9 4Z" /><path d="M9 4v14" /><path d="M15 6.5v14" />
  </Svg>
)

export const ListIcon = (p) => (
  <Svg {...p}>
    <path d="M9 6h11" /><path d="M9 12h11" /><path d="M9 18h11" />
    <circle cx="4.5" cy="6" r="1" fill="currentColor" /><circle cx="4.5" cy="12" r="1" fill="currentColor" />
    <circle cx="4.5" cy="18" r="1" fill="currentColor" />
  </Svg>
)

export const HeartIcon = (p) => (
  <Svg {...p}><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" /></Svg>
)

export const DirectionsIcon = (p) => (
  <Svg {...p}>
    <path d="M12 2.5 21.5 12 12 21.5 2.5 12 12 2.5Z" /><path d="M9 13v-2.5h5.5" /><path d="m12.5 8 2 2.5-2 2.5" />
  </Svg>
)

export const PencilIcon = (p) => (
  <Svg {...p}><path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z" /><path d="m13.5 6.5 4 4" /></Svg>
)

export const ThumbIcon = (p) => (
  <Svg {...p}>
    <path d="M7 11v9H4v-9h3Z" />
    <path d="M7 11l4-7a2 2 0 0 1 3 1.7V9h5a2 2 0 0 1 2 2.3l-1.2 7A2 2 0 0 1 17.8 20H7" />
  </Svg>
)

export const CheckIcon = (p) => (
  <Svg {...p} strokeWidth={2.5}><path d="m5 12.5 4.5 4.5L19 7.5" /></Svg>
)

export const CloseIcon = (p) => (
  <Svg {...p} strokeWidth={2.5}><path d="M6 6l12 12" /><path d="M18 6 6 18" /></Svg>
)

export const ClockIcon = (p) => (
  <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Svg>
)

export const SparkIcon = (p) => (
  <Svg {...p}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" /></Svg>
)

export const WarningIcon = (p) => (
  <Svg {...p}><path d="M12 3 2 20h20L12 3Z" /><path d="M12 10v4" /><path d="M12 17h.01" /></Svg>
)

export const LockIcon = (p) => (
  <Svg {...p}><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></Svg>
)

export const GlobeIcon = (p) => (
  <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><path d="M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18Z" /></Svg>
)
