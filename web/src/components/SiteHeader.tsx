import React from 'react';
import Link from 'next/link';
import { ThemeToggle } from '@/components/ThemeToggle';
import { siteConfig } from '@/config/site';

interface SiteHeaderProps {
  className?: string;
  activePath?: string;
}

export function SiteHeader({ className = '', activePath }: SiteHeaderProps) {
  const navLinks = [
    { href: '/', label: 'লাইভ স্ট্যাটাস' },
    { href: '/map', label: 'ম্যাপ' },
    { href: '/history', label: 'ইতিহাস' },
    { href: '/guides', label: 'নাগরিক গাইড' },
    { href: '/how-it-works', label: 'কীভাবে কাজ করে' },
    { href: '/about', label: 'আমাদের সম্পর্কে' },
  ];

  return (
    <header
      className={`sticky top-0 z-40 bg-[var(--surface-bg)]/95 backdrop-blur-md border-b border-[var(--surface-border)] px-4 py-3 transition-colors ${className}`}
    >
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 group focus:outline-none focus:ring-2 focus:ring-emerald-500 rounded-lg p-0.5"
            aria-label={`${siteConfig.name} হোমপেজে যান`}
          >
            <span className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center font-bold text-emerald-400 group-hover:scale-105 transition-transform">
              হা
            </span>
            <div className="leading-tight">
              <span className="font-bold text-base text-[var(--text-main)] group-hover:text-emerald-400 transition-colors">
                {siteConfig.name}
              </span>
              <span className="hidden sm:block text-[11px] text-[var(--text-sub)]">
                {siteConfig.tagline}
              </span>
            </div>
          </Link>
        </div>

        {/* Desktop Nav */}
        <nav aria-label="মূল নেভিগেশন" className="hidden md:flex items-center gap-1 text-xs font-bengali">
          {navLinks.map((link) => {
            const isActive = activePath === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 rounded-xl transition-colors ${
                  isActive
                    ? 'bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30'
                    : 'text-[var(--text-sub)] hover:text-[var(--text-main)] hover:bg-[var(--surface-elevated)]'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <ThemeToggle variant="compact" />
        </div>
      </div>
    </header>
  );
}
