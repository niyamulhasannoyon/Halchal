import React from 'react';
import Link from 'next/link';
import { siteConfig } from '@/config/site';
import { ShieldCheck, Heart, ExternalLink } from 'lucide-react';
import { EVERGREEN_GUIDES } from '@/data/guides';

interface SiteFooterProps {
  className?: string;
}

export function SiteFooter({ className = '' }: SiteFooterProps) {
  return (
    <footer
      aria-label="সাইটের পাদটীকা"
      className={`border-t border-[var(--surface-border)] bg-[var(--surface-bg)] text-[var(--text-sub)] font-bengali text-xs transition-colors mt-12 ${className}`}
    >
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Top: Mission & Community Disclaimer */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-6 border-b border-[var(--surface-border)]/60">
          <div className="space-y-2 md:col-span-1">
            <div className="flex items-center gap-2 text-[var(--text-main)] font-bold text-base">
              <span className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs">
                হা
              </span>
              <span>{siteConfig.name}</span>
            </div>
            <p className="text-xs leading-relaxed text-[var(--text-sub)]">
              {siteConfig.tagline}। বাংলাদেশের নাগরিকদের জন্য বিদ্যুৎ, গ্যাস ও পানির অবস্থা জানার
              স্বচ্ছ, ওপেন ও হাইপারলোকাল প্ল্যাটফর্ম।
            </p>
          </div>

          <div className="md:col-span-2 p-4 rounded-2xl bg-[var(--surface-elevated)] border border-[var(--surface-border)] space-y-1.5">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
              <ShieldCheck className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>নাগরিক পরিমাপ নীতি ও নিরপেক্ষতা</span>
            </div>
            <p className="text-xs text-[var(--text-sub)] leading-relaxed">
              <strong>বিশেষ দ্রষ্টব্য:</strong> হালচালে প্রদর্শিত প্রতিটি তথ্য নাগরিকদের দেওয়া
              তাৎক্ষণিক রিপোর্টের ভিত্তিতে সমন্বিত। এটি কোনো অফিশিয়াল সরকারি ডিজিটাল মিটারিং নয়।
              জরুরি মেরামত ও লাইন সংযোগের জন্য সংশ্লিষ্ট সেবাদাতা সংস্থার অফিশিয়াল হটলাইনে যোগাযোগ
              করুন।
            </p>
          </div>
        </div>

        {/* Links Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          {/* Section 1: মূল প্ল্যাটফর্ম */}
          <div className="space-y-2.5">
            <h3 className="font-bold text-[var(--text-main)] text-xs tracking-wide">
              মূল পেজসমূহ
            </h3>
            <ul className="space-y-1.5 list-none p-0 m-0">
              <li>
                <Link href="/" className="hover:text-emerald-400 transition-colors">
                  লাইভ স্ট্যাটাস
                </Link>
              </li>
              <li>
                <Link href="/map" className="hover:text-emerald-400 transition-colors">
                  লাইভ ম্যাপ
                </Link>
              </li>
              <li>
                <Link href="/history" className="hover:text-emerald-400 transition-colors">
                  ৭ দিনের ইতিহাস
                </Link>
              </li>
              <li>
                <Link href="/sitemap-pages" className="hover:text-emerald-400 transition-colors">
                  এইচটিএমএল সাইটম্যাপ
                </Link>
              </li>
            </ul>
          </div>

          {/* Section 2: ট্রাস্ট ও স্বচ্ছতা */}
          <div className="space-y-2.5">
            <h3 className="font-bold text-[var(--text-main)] text-xs tracking-wide">
              স্বচ্ছতা ও ট্রাস্ট
            </h3>
            <ul className="space-y-1.5 list-none p-0 m-0">
              <li>
                <Link href="/about" className="hover:text-emerald-400 transition-colors">
                  আমাদের সম্পর্কে
                </Link>
              </li>
              <li>
                <Link href="/how-it-works" className="hover:text-emerald-400 transition-colors">
                  কীভাবে কাজ করে
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-emerald-400 transition-colors">
                  যোগাযোগ ও টেকডাউন
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-emerald-400 transition-colors">
                  গোপনীয়তা নীতি
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-emerald-400 transition-colors">
                  ব্যবহারের শর্তাবলি
                </Link>
              </li>
            </ul>
          </div>

          {/* Section 3: এভারগ্রিন গাইডসমূহ */}
          <div className="space-y-2.5 sm:col-span-2">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-[var(--text-main)] text-xs tracking-wide">
                নাগরিক এভারগ্রিন গাইড
              </h3>
              <Link href="/guides" className="text-[11px] text-emerald-400 hover:underline">
                সব গাইড
              </Link>
            </div>
            <ul className="space-y-1.5 list-none p-0 m-0">
              {EVERGREEN_GUIDES.map((guide) => (
                <li key={guide.slug}>
                  <Link
                    href={guide.path}
                    className="hover:text-emerald-400 transition-colors block truncate"
                    title={guide.title}
                  >
                    {guide.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-4 border-t border-[var(--surface-border)]/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-[var(--text-sub)]">
          <p>
            © ২০২৬ {siteConfig.name} — উন্মুক্ত নাগরিক ইউটিলিটি প্ল্যাটফর্ম।
          </p>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-[var(--text-main)] transition-colors">
              প্রাইভেসি
            </Link>
            <Link href="/terms" className="hover:text-[var(--text-main)] transition-colors">
              শর্তাবলী
            </Link>
            <Link href="/contact" className="hover:text-[var(--text-main)] transition-colors">
              টেকডাউন
            </Link>
            <Link href="/sitemap-pages" className="hover:text-[var(--text-main)] transition-colors">
              সাইটম্যাপ
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
