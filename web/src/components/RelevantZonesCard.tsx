import React from 'react';
import Link from 'next/link';
import { MapPin, ArrowRight } from 'lucide-react';

interface RelevantZoneItem {
  nameBn: string;
  h3_index: string;
  ward: string;
}

interface RelevantZonesCardProps {
  zones: RelevantZoneItem[];
  title?: string;
  className?: string;
}

export function RelevantZonesCard({
  zones,
  title = 'এই বিষয়ের প্রাসঙ্গিক লাইভ এলাকা দেখুন',
  className = '',
}: RelevantZonesCardProps) {
  return (
    <section
      aria-label={title}
      className={`p-5 rounded-2xl bg-[var(--surface-bg)] border border-[var(--surface-border)] font-bengali space-y-3.5 ${className}`}
    >
      <div className="flex items-center gap-2 text-[var(--text-main)] font-bold text-sm">
        <MapPin className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden="true" />
        <h2>{title}</h2>
      </div>

      <p className="text-xs text-[var(--text-sub)] leading-relaxed">
        নিচের এলাকাগুলোতে নাগরিকরা নিয়মিত গ্যাস, বিদ্যুৎ ও পানির লাইভ পরিস্থিতি রিপোর্ট করছেন:
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
        {zones.map((zone) => (
          <Link
            key={zone.h3_index}
            href={`/z/${zone.h3_index}`}
            className="group flex items-center justify-between p-3 rounded-xl bg-[var(--surface-elevated)] border border-[var(--surface-border)] hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-all text-xs"
          >
            <div>
              <div className="font-bold text-[var(--text-main)] group-hover:text-emerald-400 transition-colors">
                {zone.nameBn}
              </div>
              <div className="text-[11px] text-[var(--text-sub)]">
                {zone.ward}
              </div>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-[var(--text-sub)] group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" aria-hidden="true" />
          </Link>
        ))}
      </div>
    </section>
  );
}
