'use client';

import React, { useState } from 'react';
import { Download, FileText, Image as ImageIcon, Share2, X, Check, Loader2 } from 'lucide-react';
import { Zone7DayInsights, COMPLAINT_CARD_FOOTER_BN } from '@/lib/insights';
import { downloadComplaintCardPdf, downloadComplaintCardPng } from '@/lib/complaint-card';
import { toBengaliDigits } from '@/lib/bengali-utils';

interface ComplaintCardModalProps {
  insights: Zone7DayInsights;
  className?: string;
}

export function ComplaintCardModal({
  insights,
  className = '',
}: ComplaintCardModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isGeneratingPng, setIsGeneratingPng] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleDownloadPdf = async () => {
    try {
      setIsGeneratingPdf(true);
      const filename = `halchal-report-${insights.h3_index}.pdf`;
      await downloadComplaintCardPdf(insights, filename);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      alert('পিডিএফ তৈরিতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleDownloadPng = async () => {
    try {
      setIsGeneratingPng(true);
      const filename = `halchal-report-${insights.h3_index}.png`;
      await downloadComplaintCardPng(insights, filename);
    } catch (err) {
      console.error('Failed to generate PNG:', err);
      alert('ছবি তৈরিতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।');
    } finally {
      setIsGeneratingPng(false);
    }
  };

  const handleShareLink = async () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://halchal.bd';
    const url = `${origin}/history?h3=${insights.h3_index}`;
    const title = `${insights.area_name_bn} এলাকার ৭ দিনের ইউটিলিটি রিপোর্ট — হালচাল`;
    const text = `${insights.area_name_bn} এলাকার বিদ্যুৎ, গ্যাস ও পানির গত ৭ দিনের রিপোর্ট দেখুন:`;

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (err: unknown) {
        if ((err as Error)?.name === 'AbortError') return;
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      prompt('রিপোর্ট লিংক কপি করুন:', url);
    }
  };

  const elec = insights.categories.electricity;
  const elecHours = Math.max(1, Math.round((elec?.total_outage_minutes ?? 0) / 60));

  return (
    <>
      {/* Primary Action Button Required by Prompt */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 active:scale-[0.99] text-white font-bengali font-bold text-base md:text-lg shadow-md hover:shadow-lg flex items-center justify-center gap-3 transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 select-none ${className}`}
        aria-label="শেয়ার অথবা অভিযোগের কপি ডাউনলোড করুন"
      >
        <Download className="w-5 h-5" aria-hidden="true" />
        <span>শেয়ার / অভিযোগের কপি ডাউনলোড</span>
      </button>

      {/* Modal Dialog */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in"
        >
          <div className="relative w-full max-w-lg bg-[var(--surface-bg)] border border-[var(--surface-border)] rounded-3xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[var(--surface-border)]">
              <div>
                <h3 id="modal-title" className="font-bengali font-bold text-lg text-[var(--text-main)]">
                  অভিযোগ ও নাগরিক রিপোর্ট ডাউনলোড
                </h3>
                <p className="font-bengali text-xs text-[var(--text-sub)]">
                  পিডিএফ বা ছবি আকারে সংরক্ষণ করুন
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-full hover:bg-[var(--surface-elevated)] text-[var(--text-sub)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
                aria-label="বন্ধ করুন"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            {/* Document Preview Snapshot */}
            <div className="p-4 rounded-2xl bg-[var(--surface-elevated)] border border-[var(--surface-border)] space-y-2 text-xs font-bengali">
              <div className="flex items-center justify-between font-bold text-[var(--text-main)] text-sm">
                <span>{insights.area_name_bn} ({insights.ward})</span>
                <span className="text-emerald-500">৭ দিনের প্রতিবেদন</span>
              </div>

              <div className="text-[var(--text-sub)] space-y-1 pt-1">
                <p>⚡ বিদ্যুৎ বিভ্রাট: <span className="font-bold text-[var(--text-main)]">{toBengaliDigits(elec?.outage_event_count ?? 0)} বার</span> (মোট {toBengaliDigits(elecHours)} ঘণ্টা)</p>
                <p>🔥 গ্যাসের অবস্থা: <span className="font-bold text-[var(--text-main)]">{insights.categories.gas?.insight_bn ?? '—'}</span></p>
                <p className="text-[11px] text-slate-400 pt-1 italic">
                  🛡️ {COMPLAINT_CARD_FOOTER_BN}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* PDF Button */}
              <button
                type="button"
                disabled={isGeneratingPdf}
                onClick={handleDownloadPdf}
                className="p-3.5 rounded-2xl bg-[var(--surface-elevated)] hover:bg-[var(--surface-border)]/50 border border-[var(--surface-border)] text-[var(--text-main)] font-bengali font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {isGeneratingPdf ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-500" aria-hidden="true" />
                    <span>পিডিএফ তৈরি হচ্ছে...</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4 text-red-500" aria-hidden="true" />
                    <span>পিডিএফ ডাউনলোড (PDF)</span>
                  </>
                )}
              </button>

              {/* PNG Button */}
              <button
                type="button"
                disabled={isGeneratingPng}
                onClick={handleDownloadPng}
                className="p-3.5 rounded-2xl bg-[var(--surface-elevated)] hover:bg-[var(--surface-border)]/50 border border-[var(--surface-border)] text-[var(--text-main)] font-bengali font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {isGeneratingPng ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-500" aria-hidden="true" />
                    <span>ছবি তৈরি হচ্ছে...</span>
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-4 h-4 text-emerald-500" aria-hidden="true" />
                    <span>ছবি ডাউনলোড (PNG)</span>
                  </>
                )}
              </button>
            </div>

            {/* Share Link Row */}
            <button
              type="button"
              onClick={handleShareLink}
              className="w-full py-3 px-4 rounded-2xl bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-bengali font-bold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              {copiedLink ? (
                <>
                  <Check className="w-4 h-4" aria-hidden="true" />
                  <span>লিংক কপি হয়েছে!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4" aria-hidden="true" />
                  <span>সোশ্যাল মিডিয়া বা হোয়াটসঅ্যাপে শেয়ার করুন</span>
                </>
              )}
            </button>

            {/* Privacy Guarantee Note */}
            <p className="font-bengali text-[11px] text-center text-[var(--text-sub)]">
              🔒 এতে আপনার নাম, ফোন নম্বর বা ব্যক্তিগত কোনো তথ্য নেই।
            </p>
          </div>
        </div>
      )}
    </>
  );
}
