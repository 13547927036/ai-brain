import React from 'react';

const FILLED = new Set(['star', 'burst', 'paw', 'coin', 'clover', 'play']);

const PATHS = {
  heart: <path d="M12 20.5S4.5 16 4.5 10.4A3.9 3.9 0 0 1 12 8a3.9 3.9 0 0 1 7.5 2.4c0 5.6-7.5 10.1-7.5 10.1z" />,
  boot: <path d="M6 4h5v6.5l6 3.2a2.6 2.6 0 0 1-1.2 4.9H6z" />,
  claw: <path d="M6.5 19 9 5M11.5 19l1.8-14M16.5 19l2.2-13" />,
  bolt: <path d="M13 2.5 5 14h6l-1 7.5L18 10h-6z" />,
  target: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3.2" />
    </>
  ),
  magnet: (
    <>
      <path d="M6 4v7.5a6 6 0 0 0 12 0V4h-4v7.5a2 2 0 0 1-4 0V4z" />
      <path d="M6 8h4M14 8h4" />
    </>
  ),
  shield: <path d="M12 3l7 3v6c0 4.1-2.9 7.2-7 9-4.1-1.8-7-4.9-7-9V6z" />,
  star: <path d="M12 3.2l2.7 5.6 6.1.8-4.5 4.3 1.2 6-5.5-3-5.5 3 1.2-6-4.5-4.3 6.1-.8z" />,
  burst: <path d="M12 2l1.8 4.9L18.5 4l-2.9 4.7L21 12l-5.4 3.3 2.9 4.7-4.7-2.9L12 22l-1.8-4.9L5.5 20l2.9-4.7L3 12l5.4-3.3L5.5 4l4.7 2.9z" />,
  clover: (
    <>
      <circle cx="12" cy="7.8" r="3.1" />
      <circle cx="8.2" cy="12.4" r="3.1" />
      <circle cx="15.8" cy="12.4" r="3.1" />
      <path d="M12 15v5" />
    </>
  ),
  leaf: <path d="M20 4C11.5 4 5.5 8 5.5 14.6c0 2.2 1 4.4 1 4.4S15 19 19.4 12.4C21 9.7 20 4 20 4zM5 20c2.6-5.6 7.4-9.1 12.4-11.4" />,
  coin: (
    <>
      <circle cx="12" cy="12" r="8.2" />
      <path d="M12 7.6v8.8M9.6 9.8h4a1.9 1.9 0 0 1 0 3.8h-3.4a1.9 1.9 0 0 0 0 3.8h4" />
    </>
  ),
  pause: (
    <>
      <rect x="7" y="5" width="3.6" height="14" rx="1.4" />
      <rect x="13.4" y="5" width="3.6" height="14" rx="1.4" />
    </>
  ),
  play: <path d="M8 5.5 19 12 8 18.5z" />,
  arrowLeft: <path d="M14.5 5 8 12l6.5 7" />,
  arrowRight: <path d="M9.5 5 16 12l-6.5 7" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  sound: (
    <>
      <path d="M4 9.5h3.2L12 5.5v13L7.2 14.5H4z" />
      <path d="M15.5 9a4.2 4.2 0 0 1 0 6M18 6.6a8 8 0 0 1 0 10.8" />
    </>
  ),
  mute: (
    <>
      <path d="M4 9.5h3.2L12 5.5v13L7.2 14.5H4z" />
      <path d="M16 9.5l5 5M21 9.5l-5 5" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="10.5" width="14" height="9.5" rx="2.4" />
      <path d="M8.2 10.5V8a3.8 3.8 0 0 1 7.6 0v2.5" />
    </>
  ),
  trophy: (
    <>
      <path d="M8 4h8v5a4 4 0 0 1-8 0z" />
      <path d="M8 5.5H5.5v2A3 3 0 0 0 8 10.4M16 5.5h2.5v2a3 3 0 0 1-2.5 2.9M12 13v4M8.5 20h7" />
    </>
  ),
  skull: (
    <>
      <path d="M5.5 11a6.5 6.5 0 0 1 13 0v3.4a2.2 2.2 0 0 1-2.2 2.2H13v2.4h-2v-2.4H7.7a2.2 2.2 0 0 1-2.2-2.2z" />
      <circle cx="9.5" cy="11" r="1.4" />
      <circle cx="14.5" cy="11" r="1.4" />
    </>
  ),
  refresh: (
    <>
      <path d="M19 12a7 7 0 1 1-2.1-5" />
      <path d="M19 4v4.5h-4.5" />
    </>
  ),
  check: <path d="M5 12.5 10 17l9-10" />,
  paw: (
    <>
      <ellipse cx="12" cy="15" rx="4.2" ry="3.6" />
      <ellipse cx="6.6" cy="10.6" rx="2.1" ry="2.7" />
      <ellipse cx="10.6" cy="7.6" rx="2.1" ry="2.8" />
      <ellipse cx="15" cy="7.8" rx="2.1" ry="2.8" />
      <ellipse cx="18.2" cy="11.4" rx="2" ry="2.6" />
    </>
  ),
  wave: <path d="M3 9.5c2.6-3 5.2-3 7.8 0s5.2 3 7.8 0M3 15c2.6-3 5.2-3 7.8 0s5.2 3 7.8 0" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="8.2" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  shop: (
    <>
      <path d="M5 8.5h14l-1.2 10.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8z" />
      <path d="M9 8.5V7a3 3 0 0 1 6 0v1.5" />
    </>
  ),
  sword: (
    <>
      <path d="M14 4h6v6l-9 9-6-6z" />
      <path d="M8.5 15.5 5 19M4 15l5 5" />
    </>
  ),
  sparkle: <path d="M12 3l1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7z" />,
  boot2: <path d="M7 4h4v6l5 2.6A2.5 2.5 0 0 1 15 18H7z" />,
};

export default function Icon({ name, size = 20, strokeWidth = 1.8, className = '', ...rest }) {
  const filled = FILLED.has(name);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke={filled ? 'none' : 'currentColor'}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`icon ${className}`}
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {PATHS[name] || PATHS.paw}
    </svg>
  );
}