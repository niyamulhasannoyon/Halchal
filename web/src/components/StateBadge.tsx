import React from 'react';
import { ZoneDisplayState, STATE_CONFIGS } from '@/lib/theme';

interface StateBadgeProps {
  state: ZoneDisplayState;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showIcon?: boolean;
}

export function StateBadge({
  state,
  size = 'md',
  className = '',
  showIcon = true,
}: StateBadgeProps) {
  const config = STATE_CONFIGS[state] ?? STATE_CONFIGS.unknown;

  const sizeStyles = {
    sm: 'text-xs px-2 py-0.5 gap-1 min-h-[24px]',
    md: 'text-sm px-2.5 py-1 gap-1.5 min-h-[30px]',
    lg: 'text-base px-3.5 py-1.5 gap-2 min-h-[38px]',
  }[size];

  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  }[size];

  // Specific state styling mapping to semantic CSS variables with pattern borders
  const stateVariantClasses: Record<ZoneDisplayState, string> = {
    ok: 'bg-[var(--ok-tint)] text-[var(--ok-text)] border-[var(--ok-border)] border-solid font-semibold',
    low: 'bg-[var(--low-tint)] text-[var(--low-text)] border-[var(--low-border)] border-solid font-semibold',
    out: 'bg-[var(--out-tint)] text-[var(--out-text)] border-[var(--out-border)] border-solid font-semibold',
    unverified: 'bg-[var(--unverified-tint)] text-[var(--unverified-text)] border-[var(--unverified-border)] border-dashed font-medium',
    unknown: 'bg-[var(--unknown-tint)] text-[var(--unknown-text)] border-[var(--unknown-border)] border-dotted font-normal opacity-85',
  };

  // Pulse animation applied only for 'out' state and automatically disabled by prefers-reduced-motion in globals.css
  const pulseClass = state === 'out' ? 'animate-hud-pulse' : '';

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full border-[1.5px] tracking-wide select-none transition-colors duration-150 ${sizeStyles} ${stateVariantClasses[state]} ${pulseClass} ${className}`}
      role="status"
      aria-label={`${config.bengaliWord}: ${config.ariaLabel}`}
    >
      {showIcon && (
        <span className={`inline-flex shrink-0 items-center justify-center ${iconSizes}`} aria-hidden="true">
          {renderStateIcon(config.iconType, state)}
        </span>
      )}
      <span className="font-bengali font-semibold whitespace-nowrap pt-[1px] leading-tight">
        {config.bengaliWord}
      </span>
    </span>
  );
}

/**
 * Dedicated high-contrast tactical SVG icons guaranteeing "never color alone"
 */
function renderStateIcon(type: 'check' | 'half' | 'cross' | 'question' | 'hollow', state: ZoneDisplayState) {
  switch (type) {
    case 'check':
      // Solid check inside solid circle
      return (
        <svg viewBox="0 0 16 16" fill="currentColor" className="w-full h-full">
          <path
            fillRule="evenodd"
            d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14Zm3.78-9.72a.75.75 0 0 0-1.06-1.06L7 7.94 5.28 6.22a.75.75 0 0 0-1.06 1.06l2.25 2.25c.293.293.767.293 1.06 0l4.25-4.25Z"
            clipRule="evenodd"
          />
        </svg>
      );

    case 'half':
      // Half-filled gauge/circle representing low/diminished state
      return (
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-full h-full">
          <circle cx="8" cy="8" r="6.25" />
          <path d="M8 1.75 A 6.25 6.25 0 0 1 8 14.25 Z" fill="currentColor" stroke="none" />
          <path d="M8 4v8" stroke="currentColor" strokeWidth="1.2" />
        </svg>
      );

    case 'cross':
      // Distinct heavy cross inside circle for total outage
      return (
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
          <circle cx="8" cy="8" r="6.25" />
          <line x1="5.25" y1="5.25" x2="10.75" y2="10.75" />
          <line x1="10.75" y1="5.25" x2="5.25" y2="10.75" />
        </svg>
      );

    case 'question':
      // Dashed circle outline with center mark for unverified
      return (
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-full h-full">
          <circle cx="8" cy="8" r="6.25" strokeDasharray="2.5 2" />
          <path d="M8 5a1.5 1.5 0 0 1 1.5 1.5c0 1-1.5 1.5-1.5 2.5" strokeLinecap="round" />
          <circle cx="8" cy="11.25" r="0.75" fill="currentColor" stroke="none" />
        </svg>
      );

    case 'hollow':
      // Completely hollow circle with dotted rim for missing/unknown data
      return (
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-full h-full">
          <circle cx="8" cy="8" r="6.25" strokeDasharray="1.5 2" />
          <circle cx="8" cy="8" r="2" strokeWidth="1" strokeDasharray="1 1" />
        </svg>
      );
  }
}
