import React from 'react';

const paths = {
  text: <><path d="M4 6V4h16v2M12 4v16M8 20h8" /></>,
  square: <rect x="4.5" y="4.5" width="15" height="15" rx="2" />,
  circle: <circle cx="12" cy="12" r="7.5" />,
  line: <><path d="M5 19 19 5" /><circle cx="5" cy="19" r="1.6" fill="currentColor" stroke="none" /><circle cx="19" cy="5" r="1.6" fill="currentColor" stroke="none" /></>,
  image: <><rect x="3.5" y="4.5" width="17" height="15" rx="2" /><circle cx="8.5" cy="9" r="1.5" /><path d="m4 17 4.5-4.5 3.2 3.1 2.8-2.8 5.5 5.2" /></>,
  layers: <><path d="m12 4 8.5 4.5L12 13 3.5 8.5 12 4Z" /><path d="m3.5 12.5 8.5 4.5 8.5-4.5" /><path d="m3.5 16.5 8.5 4.5 8.5-4.5" /></>,
  eye: <><path d="M2.5 12s3.5-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.5 6.5-9.5 6.5S2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="2.8" /></>,
  eyeOff: <><path d="M3 3l18 18" /><path d="M10.6 5.7A9.7 9.7 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a16.8 16.8 0 0 1-3.2 4.1M6.5 6.6C4 8.4 2.5 12 2.5 12s3.5 6.5 9.5 6.5a9.6 9.6 0 0 0 4.3-1" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></>,
  lock: <><rect x="5" y="11" width="14" height="9.5" rx="2" /><path d="M8 11V7.8a4 4 0 0 1 8 0V11" /></>,
  unlock: <><rect x="5" y="11" width="14" height="9.5" rx="2" /><path d="M8 11V7.8a4 4 0 0 1 7.6-1.7" /></>,
  trash: <><path d="M4.5 7h15M9.5 7V4.8c0-.5.4-.8.9-.8h3.2c.5 0 .9.3.9.8V7M6.8 7l.8 12.2c.1.9.8 1.6 1.7 1.6h5.4c.9 0 1.6-.7 1.7-1.6L17.2 7" /><path d="M10 11v5.5M14 11v5.5" /></>,
  copy: <><rect x="8.5" y="8.5" width="11" height="11" rx="2" /><path d="M5.5 15.5h-1a1.5 1.5 0 0 1-1.5-1.5V5.5A1.5 1.5 0 0 1 4.5 4H13a1.5 1.5 0 0 1 1.5 1.5v1" /></>,
  undo: <><path d="M9 7 4 12l5 5" /><path d="M4 12h10.5a5.5 5.5 0 0 1 0 11H12" /></>,
  redo: <><path d="m15 7 5 5-5 5" /><path d="M20 12H9.5a5.5 5.5 0 0 0 0 11H12" /></>,
  arrowUp: <><path d="M12 19V5" /><path d="m6.5 10.5 5.5-5.5 5.5 5.5" /></>,
  arrowDown: <><path d="M12 5v14" /><path d="m6.5 13.5 5.5 5.5 5.5-5.5" /></>,
  chevronUp: <path d="m7 14 5-5 5 5" />,
  chevronDown: <path d="m7 10 5 5 5-5" />,
  alignLeft: <path d="M4 6h16M4 10h10M4 14h16M4 18h10" />,
  alignCenter: <path d="M4 6h16M7 10h10M4 14h16M7 18h10" />,
  alignRight: <path d="M4 6h16M10 10h10M4 14h16M10 18h10" />,
  crop: <><path d="M6.5 3v12.5a2 2 0 0 0 2 2H21" /><path d="M3 6.5h12.5a2 2 0 0 1 2 2V21" /></>,
  grip: <><circle cx="9" cy="6.5" r="1" fill="currentColor" stroke="none" /><circle cx="15" cy="6.5" r="1" fill="currentColor" stroke="none" /><circle cx="9" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="15" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="9" cy="17.5" r="1" fill="currentColor" stroke="none" /><circle cx="15" cy="17.5" r="1" fill="currentColor" stroke="none" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  fit: <><path d="M8 4H4v4M16 4h4v4M4 16v4h4M20 16v4h-4" /><path d="M9 12h6M12 9v6" /></>,
  chevron: <path d="m9 18 6-6-6-6" />,
  arrowUpRight: <path d="M7 17 17 7M8 7h9v9" />,
  link: <><path d="M10 13.5a4 4 0 0 0 5.7 0l2.5-2.5a4 4 0 0 0-5.7-5.7l-1.4 1.4" /><path d="M14 10.5a4 4 0 0 0-5.7 0L5.8 13a4 4 0 0 0 5.7 5.7l1.4-1.4" /></>,
  cursor: <path d="m5 3 13.5 9-6 1.3-2.4 6.2L5 3Z" />,
  hand: <><path d="M8 12V5.5a1.5 1.5 0 1 1 3 0v5M11 10V4.5a1.5 1.5 0 0 1 3 0V10M14 10V6.5a1.5 1.5 0 1 1 3 0v5M17 10.5a1.5 1.5 0 0 1 3 0V15c0 3.5-2.2 5.5-5.5 5.5h-2.2a5 5 0 0 1-4.1-2.2l-3.1-4.5a1.6 1.6 0 0 1 2.4-2.1L9 13" /></>,
  ruler: <><rect x="3.5" y="7" width="17" height="10" rx="1.5" /><path d="M7 7v3M10 7v5M13 7v3M16 7v5" /></>,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  check: <path d="m5 12 4 4L19 6" />,
  info: <><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5M12 8h.01" /></>,
  sliders: <><path d="M4 7h16M4 17h16" /><circle cx="9" cy="7" r="2" fill="currentColor" stroke="none" /><circle cx="15" cy="17" r="2" fill="currentColor" stroke="none" /></>,
  sparkle: <><path d="M12 3.5 13.8 9 19.5 11l-5.7 2L12 18.5 10.2 13 4.5 11l5.7-2L12 3.5Z" /><path d="M18.5 16.5v4M16.5 18.5h4" /></>,
};

export function Icon({ name, size = 20, className = '', strokeWidth = 1.7 }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true" focusable="false">
      {paths[name]}
    </svg>
  );
}

export function BrandMark({ size = 33 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none" aria-hidden="true" focusable="false">
      <rect width="36" height="36" rx="10" fill="#b9e878" />
      <path d="M10 10.5h10.5a5 5 0 0 1 5 5V26H15a5 5 0 0 1-5-5V10.5Z" stroke="#1a2a20" strokeWidth="2.1" />
      <path d="M14.5 14.8h6.3v6.4h-6.3z" fill="#1a2a20" />
    </svg>
  );
}
