import { describe, it, expect } from 'vitest';
import { aggregateZoneStatuses, generateAreaBengaliSummary } from './aggregation';
import { createDefaultZoneStatus, ZoneStatusResponse } from './zones';

describe('Spatial Multi-H3 Cell Aggregation Engine', () => {
  it('returns single cell status directly without alteration', () => {
    const single = createDefaultZoneStatus('883cf10cebfffff');
    single.categories.electricity.state = 'ok';
    single.categories.electricity.distinct_reporters = 5;

    const result = aggregateZoneStatuses([single], {
      areaNameBn: 'মোহাম্মদপুর',
      ward: 'ওয়ার্ড ৩১',
      city: 'ঢাকা',
    });

    expect(result.categories.electricity.state).toBe('ok');
    expect(result.categories.electricity.distinct_reporters).toBe(5);
    expect(result.area_name_bn).toBe('মোহাম্মদপুর');
  });

  it('aggregates multiple cells: worst confirmed state wins (out > low > ok)', () => {
    const cell1 = createDefaultZoneStatus('883cf10cebfffff'); // Cell 1: Electricity OK
    cell1.categories.electricity.state = 'ok';
    cell1.categories.electricity.distinct_reporters = 4;

    const cell2 = createDefaultZoneStatus('883cf10ca1fffff'); // Cell 2: Electricity OUT (worst)
    cell2.categories.electricity.state = 'out';
    cell2.categories.electricity.distinct_reporters = 6;

    const cell3 = createDefaultZoneStatus('883cf10eb1fffff'); // Cell 3: Electricity LOW
    cell3.categories.electricity.state = 'low';
    cell3.categories.electricity.distinct_reporters = 3;

    const aggregated = aggregateZoneStatuses([cell1, cell2, cell3]);

    // Worst confirmed state 'out' must win
    expect(aggregated.categories.electricity.state).toBe('out');
    // Reporter counts must be summed across all cells (4 + 6 + 3 = 13)
    expect(aggregated.categories.electricity.distinct_reporters).toBe(13);
  });

  it('aggregates multiple cells: low beats ok when no cell is out', () => {
    const cell1 = createDefaultZoneStatus('883cf10cebfffff');
    cell1.categories.gas.state = 'ok';
    cell1.categories.gas.distinct_reporters = 5;

    const cell2 = createDefaultZoneStatus('883cf10ca1fffff');
    cell2.categories.gas.state = 'low';
    cell2.categories.gas.distinct_reporters = 7;

    const aggregated = aggregateZoneStatuses([cell1, cell2]);

    expect(aggregated.categories.gas.state).toBe('low');
    expect(aggregated.categories.gas.distinct_reporters).toBe(12);
  });

  it('aggregates multiple cells: confirmed states beat unverified and unknown', () => {
    const cell1 = createDefaultZoneStatus('883cf10cebfffff');
    cell1.categories.water.state = 'ok';
    cell1.categories.water.distinct_reporters = 4;

    const cell2 = createDefaultZoneStatus('883cf10ca1fffff');
    cell2.categories.water.state = 'unverified';
    cell2.categories.water.distinct_reporters = 2;

    const cell3 = createDefaultZoneStatus('883cf10eb1fffff');
    cell3.categories.water.state = 'unknown';
    cell3.categories.water.distinct_reporters = 0;

    const aggregated = aggregateZoneStatuses([cell1, cell2, cell3]);

    expect(aggregated.categories.water.state).toBe('ok');
    expect(aggregated.categories.water.distinct_reporters).toBe(6);
  });

  it('aggregates multiple cells: unverified beats unknown when no confirmed data exists', () => {
    const cell1 = createDefaultZoneStatus('883cf10cebfffff');
    cell1.categories.lpg.state = 'unverified';
    cell1.categories.lpg.distinct_reporters = 2;

    const cell2 = createDefaultZoneStatus('883cf10ca1fffff');
    cell2.categories.lpg.state = 'unknown';
    cell2.categories.lpg.distinct_reporters = 0;

    const aggregated = aggregateZoneStatuses([cell1, cell2]);

    expect(aggregated.categories.lpg.state).toBe('unverified');
    expect(aggregated.categories.lpg.distinct_reporters).toBe(2);
  });

  it('returns unknown when all cells are unknown', () => {
    const cell1 = createDefaultZoneStatus('883cf10cebfffff');
    const cell2 = createDefaultZoneStatus('883cf10ca1fffff');

    const aggregated = aggregateZoneStatuses([cell1, cell2]);

    expect(aggregated.categories.electricity.state).toBe('unknown');
    expect(aggregated.categories.electricity.distinct_reporters).toBe(0);
  });

  it('preserves the latest updated_at timestamp among all cells', () => {
    const timeA = '2026-11-20T10:00:00.000Z';
    const timeB = '2026-11-20T12:30:00.000Z';

    const cell1 = createDefaultZoneStatus('883cf10cebfffff');
    cell1.updated_at = timeA;
    for (const cat of ['electricity', 'gas', 'water', 'lpg'] as const) {
      cell1.categories[cat].updated_at = timeA;
    }

    const cell2 = createDefaultZoneStatus('883cf10ca1fffff');
    cell2.updated_at = timeB;
    for (const cat of ['electricity', 'gas', 'water', 'lpg'] as const) {
      cell2.categories[cat].updated_at = timeB;
    }

    const aggregated = aggregateZoneStatuses([cell1, cell2]);
    expect(aggregated.updated_at).toBe(timeB);
  });
});

describe('Deterministic Bengali Text Summary Engine', () => {
  it('generates consistent deterministic text summary matching category states', () => {
    const status = createDefaultZoneStatus('883cf10cebfffff');
    status.categories.electricity.state = 'out';
    status.categories.electricity.distinct_reporters = 7;
    status.categories.gas.state = 'low';
    status.categories.gas.distinct_reporters = 5;
    status.categories.water.state = 'ok';
    status.categories.water.distinct_reporters = 3;

    const summary = generateAreaBengaliSummary(status, 'মোহাম্মদপুর', 'গত ৭ দিনে ৩টি বিদ্যুৎ বিভ্রাটের রেকর্ড রয়েছে।');

    expect(summary.headline).toContain('মোহাম্মদপুর');
    expect(summary.headline).toContain('বিভ্রাট বা সংকট');

    expect(summary.leadParagraph).toContain('বিদ্যুৎ বিভ্রাট বা লোডশেডিং চলছে');
    expect(summary.leadParagraph).toContain('গ্যাসের চাপ কম রয়েছে');
    expect(summary.leadParagraph).toContain('পানির সরবরাহ স্বাভাবিক');

    // Reporter count must be formatted in Bengali numerals: 7 + 5 + 3 = 15 -> ১৫
    expect(summary.reporterConfirmationText).toContain('১৫ জন নাগরিকের');

    expect(summary.trendText).toBe('গত ৭ দিনে ৩টি বিদ্যুৎ বিভ্রাটের রেকর্ড রয়েছে।');
  });

  it('handles low report count with unverified phrasing', () => {
    const status = createDefaultZoneStatus('883cf10cebfffff');
    status.categories.electricity.distinct_reporters = 1;

    const summary = generateAreaBengaliSummary(status, 'ধানমন্ডি');
    expect(summary.reporterConfirmationText).toContain('যাচাই প্রক্রিয়াধীন');
  });
});
