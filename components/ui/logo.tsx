import Link from "next/link";

export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <defs>
        <linearGradient id="gimage-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8b5cf6" />
          <stop offset="1" stopColor="#ff6b57" />
        </linearGradient>
      </defs>
        <rect width="32" height="32" rx="9" fill="url(#gimage-g)" />
      <path d="M10 8v16h12" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx="21.5" cy="11" r="2.6" fill="#fff" />
    </svg>
  );
}

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2 rounded-lg font-semibold tracking-tight text-ink-950" aria-label="Gimage home">
      <LogoMark />
      <span className="text-lg">Gimage</span>
    </Link>
  );
}
