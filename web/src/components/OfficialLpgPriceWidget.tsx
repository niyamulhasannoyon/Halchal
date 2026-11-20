import React from 'react';
import { Flame, ShieldCheck, ExternalLink, Calendar, AlertCircle } from 'lucide-react';
import { formatBengaliCurrency, toBengaliDigits } from '@/lib/bengali-utils';
import { OfficialPriceRecord } from '@/lib/official-price';

interface OfficialLpgPriceWidgetProps {
  priceData: OfficialPriceRecord;
  className?: string;
}

export function OfficialLpgPriceWidget({
  priceData,
  className = '',
}: OfficialLpgPriceWidgetProps) {
  // Format effective_from date into Bengali
  const formatEffectiveDateBn = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (Number.isNaN(d.getTime())) return '১ নভেম্বর ২০২৬';
      const monthsBn = [
        'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
        'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
      ];
      return `${toBengaliDigits(d.getDate())} ${monthsBn[d.getMonth()]} ${toBengaliDigits(d.getFullYear())}`;
    } catch {
      return '১ নভেম্বর ২০২৬';
    }
  };

  const formattedDate = formatEffectiveDateBn(priceData.effective_from);
  const formattedPrice = formatBengaliCurrency(priceData.price_bdt);

  return (
    <div
      aria-label="বিইআরসি নির্ধারিত ১২ কেজি এলপিজি সিলিন্ডারের সরকারি মূল্য"
      className={`p-5 rounded-3xl bg-[var(--surface-bg)] border-2 border-orange-500/30 font-bengali space-y-4 shadow-sm ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <span className="p-2 rounded-xl bg-orange-500/15 text-orange-500">
            <Flame className="w-5 h-5 fill-orange-500" aria-hidden="true" />
          </span>
          <div>
            <h3 className="font-bold text-sm text-[var(--text-main)]">
              ১২ কেজি বোতলজাত এলপিজি: সরকারি নির্ধারিত দর
            </h3>
            <p className="text-[11px] text-[var(--text-sub)]">
              বাংলাদেশ এনার্জি রেগুলেটরি কমিশন (BERC) কর্তৃক ঘোষিত
            </p>
          </div>
        </div>

        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
          <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
          <span>অফিশিয়াল রেগুলেটরি রেট</span>
        </span>
      </div>

      {/* Main Dynamic Rate Display */}
      <div className="p-4 rounded-2xl bg-[var(--surface-elevated)] border border-[var(--surface-border)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <span className="text-[11px] text-[var(--text-sub)]">
            ভোক্তা পর্যায়ে সর্বোচ্চ খুচরা মূল্য (সর্বশেষ গেজেট):
          </span>
          <div className="text-2xl sm:text-3xl font-extrabold text-orange-500 tracking-tight">
            {formattedPrice}
          </div>
        </div>

        <div className="text-left sm:text-right space-y-1 text-xs">
          <div className="inline-flex items-center gap-1.5 text-[var(--text-sub)]">
            <Calendar className="w-3.5 h-3.5 text-orange-400" aria-hidden="true" />
            <span>কার্যকর: <strong>{formattedDate}</strong></span>
          </div>
          <div>
            <a
              href={priceData.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-emerald-400 hover:underline"
            >
              <span>বিইআরসি অফিশিয়াল গেজেট দেখুন</span>
              <ExternalLink className="w-3 h-3" aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>

      {/* Real-time Rule Explanation */}
      <div className="flex items-start gap-2 text-xs text-[var(--text-sub)] bg-orange-500/5 p-3 rounded-xl border border-orange-500/10 leading-relaxed">
        <AlertCircle className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" aria-hidden="true" />
        <p>
          সরকারি নীতিমালা অনুযায়ী খুচরা বিক্রেতা বা ডিলার এই মূল্যের চেয়ে বেশি দাবি করতে পারেন না।
          যদি কোনো ডিলার বা বিক্রেতা অতিরিক্ত মূল্য দাবি করেন, তবে ক্যাশমেমো বা রসিদ সংগ্রহ করে
          জাতীয় ভোক্তা অধিকার সংরক্ষণ অধিদপ্তরে (হটলাইন <strong>১৬১২১</strong>) লিখিত বা মৌখিক অভিযোগ
          দায়ের করার আইনি অধিকার আপনার রয়েছে।
        </p>
      </div>
    </div>
  );
}
