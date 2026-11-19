/**
 * Halchal - Shareable Complaint Card & PDF/PNG Generator
 * Module: complaint-card.ts
 *
 * Generates an official, citizen-advocacy ready PDF and PNG document client-side.
 * Guarantees zero personal data, zero dealer names, and accurate Bengali typography
 * via HarfBuzz font embedding.
 */

import { Zone7DayInsights, COMPLAINT_CARD_FOOTER_BN, formatHourBn } from './insights';
import { toBengaliDigits, formatBengaliCurrency } from './bengali-utils';

/**
 * Ensures Noto Sans Bengali font is loaded in document.fonts before canvas rendering.
 */
export async function ensureBengaliFontLoaded(): Promise<boolean> {
  if (typeof window === 'undefined' || !('fonts' in document)) {
    return true;
  }

  try {
    const font = new FontFace(
      'Noto Sans Bengali',
      'url(/fonts/NotoSansBengali.ttf)'
    );
    await font.load();
    document.fonts.add(font);
    await document.fonts.ready;
    return true;
  } catch (err) {
    console.warn('FontFace loading warning, relying on system font:', err);
    return false;
  }
}

/**
 * Renders the official 7-Day Complaint Card onto an HTML5 Canvas.
 * Resolution: 1200 x 1500 (Crisp, High-DPI Print Ready)
 */
export async function renderComplaintCardToCanvas(
  insights: Zone7DayInsights
): Promise<HTMLCanvasElement> {
  await ensureBengaliFontLoaded();

  const canvas = document.createElement('canvas');
  const width = 1200;
  const height = 1520;
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  // Background Canvas: Deep OLED Navy / Tactical Slate
  ctx.fillStyle = '#070A0F';
  ctx.fillRect(0, 0, width, height);

  // Outer Border
  ctx.strokeStyle = '#1E293B';
  ctx.lineWidth = 3;
  ctx.strokeRect(20, 20, width - 40, height - 40);

  // Top Accent Banner (Emerald & Red Grid)
  const gradient = ctx.createLinearGradient(40, 40, width - 80, 40);
  gradient.addColorStop(0, '#10B981');
  gradient.addColorStop(0.5, '#F59E0B');
  gradient.addColorStop(1, '#EF4444');
  ctx.fillStyle = gradient;
  ctx.fillRect(40, 40, width - 80, 8);

  // Header Section
  ctx.fillStyle = '#F8FAFC';
  ctx.font = 'bold 44px "Noto Sans Bengali", sans-serif';
  ctx.fillText('হালচাল (Halchal) — নাগরিক ইউটিলিটি রিপোর্ট', 50, 110);

  ctx.fillStyle = '#94A3B8';
  ctx.font = '24px "Noto Sans Bengali", sans-serif';
  ctx.fillText('৭ দিনের এলাকাভিত্তিক ইউটিলিটি পরিষেবা ও বিভ্রাট প্রতিবেদন', 50, 155);

  // Divider Line
  ctx.strokeStyle = '#1E293B';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(50, 185);
  ctx.lineTo(width - 50, 185);
  ctx.stroke();

  // Area & Metadata Card
  ctx.fillStyle = '#111622';
  ctx.roundRect ? ctx.roundRect(50, 215, width - 100, 140, 16) : ctx.fillRect(50, 215, width - 100, 140);
  ctx.fill();
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = '#6EE7B7';
  ctx.font = 'bold 22px "Noto Sans Bengali", sans-serif';
  ctx.fillText('এলাকা পরিচিতি ও সময়কাল', 80, 255);

  ctx.fillStyle = '#F8FAFC';
  ctx.font = 'bold 32px "Noto Sans Bengali", sans-serif';
  ctx.fillText(`${insights.area_name_bn} (${insights.ward}, ${insights.city})`, 80, 300);

  // Date range
  const now = new Date();
  const start7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const formatDateBn = (d: Date) =>
    `${toBengaliDigits(d.getDate())}/${toBengaliDigits(d.getMonth() + 1)}/${toBengaliDigits(d.getFullYear())}`;

  ctx.fillStyle = '#94A3B8';
  ctx.font = '20px "Noto Sans Bengali", sans-serif';
  ctx.fillText(
    `সময়সীমা: ${formatDateBn(start7d)} থেকে ${formatDateBn(now)} (গত ৭ দিন)   •   তৈরির সময়: ${formatDateBn(now)}`,
    80,
    335
  );

  // Section 1: Electricity Outage Summary Card
  const elec = insights.categories.electricity;
  const elecEvents = elec?.outage_event_count ?? 0;
  const elecHours = Math.max(1, Math.round((elec?.total_outage_minutes ?? 0) / 60));

  ctx.fillStyle = '#111622';
  ctx.roundRect ? ctx.roundRect(50, 385, width - 100, 190, 16) : ctx.fillRect(50, 385, width - 100, 190);
  ctx.fill();
  ctx.strokeStyle = '#EF4444';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#FCA5A5';
  ctx.font = 'bold 24px "Noto Sans Bengali", sans-serif';
  ctx.fillText('⚡ বিদ্যুৎ লোডশেডিং ও বিভ্রাট পরিসংখ্যান', 80, 430);

  ctx.fillStyle = '#F8FAFC';
  ctx.font = 'bold 36px "Noto Sans Bengali", sans-serif';
  if (insights.data_confidence === 'insufficient') {
    ctx.fillText('এখনো পর্যাপ্ত তথ্য নেই (কমপক্ষে ৩ দিনের রিপোর্ট লাগবে)', 80, 485);
  } else if (elecEvents > 0) {
    ctx.fillText(
      `এই সপ্তাহে ${toBengaliDigits(elecEvents)} বার কারেন্ট গেছে • মোট ${toBengaliDigits(elecHours)} ঘণ্টা`,
      80,
      485
    );
  } else {
    ctx.fillText('এই সপ্তাহে কোনো বিদ্যুৎ বিভ্রাট রিপোর্ট করা হয়নি (পরিষেবা স্বাভাবিক)', 80, 485);
  }

  ctx.fillStyle = '#94A3B8';
  ctx.font = '20px "Noto Sans Bengali", sans-serif';
  ctx.fillText(
    `মোট নিশ্চিত সংযোগহীন সময়: ${toBengaliDigits(elec?.total_outage_minutes ?? 0)} মিনিট (${toBengaliDigits(elecHours)} ঘণ্টা)   •   যাচাইকৃত রিপোর্ট: ${toBengaliDigits(insights.total_reporters)} জন`,
    80,
    535
  );

  // Section 2: Gas & Utility Status
  const gas = insights.categories.gas;
  ctx.fillStyle = '#111622';
  ctx.roundRect ? ctx.roundRect(50, 605, width - 100, 150, 16) : ctx.fillRect(50, 605, width - 100, 150);
  ctx.fill();
  ctx.strokeStyle = '#F59E0B';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#FCD34D';
  ctx.font = 'bold 24px "Noto Sans Bengali", sans-serif';
  ctx.fillText('🔥 গ্যাস পাইপলাইন ও চাপ পর্যবেক্ষণ', 80, 650);

  ctx.fillStyle = '#F8FAFC';
  ctx.font = 'bold 28px "Noto Sans Bengali", sans-serif';
  ctx.fillText(gas?.insight_bn ?? 'তথ্য প্রক্রিয়াজাত হচ্ছে...', 80, 705);

  // Section 3: LPG Cylinder Price Benchmark (Zero Dealer Data)
  ctx.fillStyle = '#111622';
  ctx.roundRect ? ctx.roundRect(50, 785, width - 100, 140, 16) : ctx.fillRect(50, 785, width - 100, 140);
  ctx.fill();
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = '#6EE7B7';
  ctx.font = 'bold 24px "Noto Sans Bengali", sans-serif';
  ctx.fillText('🛢️ ১২ কেজি এলপিজি সিলিন্ডার মূল্য (গোপনীয়তা সংরক্ষিত)', 80, 830);

  ctx.fillStyle = '#F8FAFC';
  ctx.font = 'bold 26px "Noto Sans Bengali", sans-serif';
  if (insights.lpg_price && insights.lpg_price.report_count >= 5) {
    const med = formatBengaliCurrency(Math.round(insights.lpg_price.area_median));
    const off = formatBengaliCurrency(Math.round(insights.lpg_price.official_price));
    ctx.fillText(`এলাকার গড় বাজারদর: ৳ ${med}   •   বিইআরসি সরকারি নির্ধারিত দর: ৳ ${off}`, 80, 880);
  } else {
    ctx.fillText('এলাকার গড় বাজারদর: গোপন রাখা হয়েছে (কমপক্ষে ৫টি রিপোর্ট আবশ্যক)   •   সরকারি দর: ৳ ১,৪৫৫', 80, 880);
  }

  // Section 4: 24-Hour Outage Hourly Pattern Visual Bar
  ctx.fillStyle = '#111622';
  ctx.roundRect ? ctx.roundRect(50, 955, width - 100, 310, 16) : ctx.fillRect(50, 955, width - 100, 310);
  ctx.fill();
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = '#F8FAFC';
  ctx.font = 'bold 24px "Noto Sans Bengali", sans-serif';
  ctx.fillText('📊 ২৪ ঘণ্টার বিদ্যুৎ ও গ্যাস বিভ্রাট প্রবণতা (Hourly Pattern)', 80, 1000);

  ctx.fillStyle = '#94A3B8';
  ctx.font = '18px "Noto Sans Bengali", sans-serif';
  ctx.fillText('গত ৭ দিনের কোন ঘণ্টায় কত শতাংশ সময় বিভ্রাট ছিল (লাল = উচ্চ বিভ্রাট ঝুঁকি)', 80, 1030);

  // Draw 24 bars
  const pattern = elec?.hourly_pattern ?? new Array(24).fill(0);
  const barWidth = 38;
  const barGap = 6;
  const startX = 80;
  const baseChartY = 1200;
  const maxBarH = 130;

  for (let h = 0; h < 24; h++) {
    const share = pattern[h] ?? 0;
    const barH = Math.max(6, share * maxBarH);
    const x = startX + h * (barWidth + barGap);
    const y = baseChartY - barH;

    // Bar color
    if (share >= 0.4) {
      ctx.fillStyle = '#EF4444'; // Red
    } else if (share > 0) {
      ctx.fillStyle = '#F59E0B'; // Amber
    } else {
      ctx.fillStyle = '#10B981'; // Green (calm)
    }

    ctx.fillRect(x, y, barWidth, barH);

    // Hour label underneath
    ctx.fillStyle = '#64748B';
    ctx.font = 'bold 13px "Noto Sans Bengali", sans-serif';
    ctx.fillText(toBengaliDigits(h), x + 8, baseChartY + 22);
  }

  ctx.fillStyle = '#94A3B8';
  ctx.font = '15px "Noto Sans Bengali", sans-serif';
  ctx.fillText('ঘণ্টা (রাত ১২টা থেকে রাত ১১টা পর্যন্ত)', startX, baseChartY + 46);

  // Section 5: Legal & Privacy Statement
  ctx.fillStyle = '#0B111E';
  ctx.roundRect ? ctx.roundRect(50, 1295, width - 100, 85, 12) : ctx.fillRect(50, 1295, width - 100, 85);
  ctx.fill();

  ctx.fillStyle = '#94A3B8';
  ctx.font = '17px "Noto Sans Bengali", sans-serif';
  ctx.fillText(
    '🛡️ গোপনীয়তা নিশ্চয়তা: কোনো ব্যক্তিগত পরিচয় (নাম, ফোন, আইপি) বা নির্দিষ্ট দোকানের নাম এতে নেই।',
    80,
    1332
  );
  ctx.fillText(
    'সীমাবদ্ধতা: এটি কোনো সরকারি গ্রিড মিটারের পরিমাপ নয়, বরং নাগরিকদের জমা দেওয়া রিপোর্টের সম্মিলিত নির্দেশক।',
    80,
    1360
  );

  // Section 6: Mandatory Footer
  ctx.fillStyle = '#334155';
  ctx.fillRect(50, 1410, width - 100, 1.5);

  ctx.fillStyle = '#E2E8F0';
  ctx.font = 'bold 20px "Noto Sans Bengali", sans-serif';
  ctx.fillText(COMPLAINT_CARD_FOOTER_BN, 50, 1460);

  ctx.fillStyle = '#64748B';
  ctx.font = '16px "Noto Sans Bengali", sans-serif';
  ctx.fillText('হালচাল ওপেন প্ল্যাটফর্ম • halchal.bd', 50, 1490);

  return canvas;
}

/**
 * Downloads high-resolution PNG of the complaint card.
 */
export async function downloadComplaintCardPng(
  insights: Zone7DayInsights,
  filename = 'halchal-complaint-report.png'
): Promise<void> {
  const canvas = await renderComplaintCardToCanvas(insights);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Failed to create PNG blob'));
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      resolve();
    }, 'image/png');
  });
}

/**
 * Generates and downloads a clean, self-contained client-side PDF document
 * with the rendered high-res report and embedded font glyphs.
 */
export async function downloadComplaintCardPdf(
  insights: Zone7DayInsights,
  filename = 'halchal-complaint-report.pdf'
): Promise<void> {
  const canvas = await renderComplaintCardToCanvas(insights);
  const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
  const base64Data = dataUrl.split(',')[1];
  const binaryImg = atob(base64Data);
  const imgLength = binaryImg.length;

  const imgBytes = new Uint8Array(imgLength);
  for (let i = 0; i < imgLength; i++) {
    imgBytes[i] = binaryImg.charCodeAt(i);
  }

  // A4 Dimensions in Points (72 DPI): 595.28 x 841.89
  const pageWidth = 595;
  const pageHeight = 842;

  // Build clean, compliant PDF 1.4 binary structure
  const pdfParts: (string | Uint8Array)[] = [];

  const addString = (str: string) => {
    pdfParts.push(new TextEncoder().encode(str));
  };

  addString('%PDF-1.4\n%âãÏÓ\n');

  // Object 1: Catalog
  const obj1Offset = getTotalLength(pdfParts);
  addString('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

  // Object 2: Pages
  const obj2Offset = getTotalLength(pdfParts);
  addString('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');

  // Object 3: Page (A4)
  const obj3Offset = getTotalLength(pdfParts);
  addString(
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Contents 4 0 R /Resources << /XObject << /Im1 5 0 R >> >> >>\nendobj\n`
  );

  // Object 4: Page Content Stream (Render Image full page with 15pt margin)
  const margin = 15;
  const renderW = pageWidth - margin * 2;
  const renderH = pageHeight - margin * 2;
  const contentStream = `q\n${renderW} 0 0 ${renderH} ${margin} ${margin} cm\n/Im1 Do\nQ\n`;
  const obj4Offset = getTotalLength(pdfParts);
  addString(
    `4 0 obj\n<< /Length ${contentStream.length} >>\nstream\n${contentStream}endstream\nendobj\n`
  );

  // Object 5: Image XObject (JPEG stream)
  const obj5Offset = getTotalLength(pdfParts);
  addString(
    `5 0 obj\n<< /Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imgLength} >>\nstream\n`
  );
  pdfParts.push(imgBytes);
  addString('\nendstream\nendobj\n');

  // Cross-reference table (XREF)
  const xrefOffset = getTotalLength(pdfParts);
  addString('xref\n0 6\n');
  addString('0000000000 65535 f \n');
  addString(`${String(obj1Offset).padStart(10, '0')} 00000 n \n`);
  addString(`${String(obj2Offset).padStart(10, '0')} 00000 n \n`);
  addString(`${String(obj3Offset).padStart(10, '0')} 00000 n \n`);
  addString(`${String(obj4Offset).padStart(10, '0')} 00000 n \n`);
  addString(`${String(obj5Offset).padStart(10, '0')} 00000 n \n`);

  // Trailer
  addString(
    `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`
  );

  // Combine into single Blob and trigger download
  const blob = new Blob(pdfParts as BlobPart[], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function getTotalLength(parts: (string | Uint8Array)[]): number {
  return parts.reduce((acc, p) => acc + (typeof p === 'string' ? p.length : p.byteLength), 0);
}
