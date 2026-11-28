import { describe, expect, it } from 'vitest';
import type { CatchRecord } from '../types.ts';
import {
  calculateCatchStatistics,
  filterCatchRecords,
  formatCatchStatisticsTotalWeight,
  formatTotalWeightKg,
  sortCatchRecords,
} from './catchRecords.ts';

const records: CatchRecord[] = [
  {
    id: 'seed-2',
    caughtAt: '2026-06-01',
    anglerName: 'B',
    fishCategory: 'non-predatory',
    fishSpecies: 'carp',
    fishCount: 3,
    totalWeightKg: 5.8,
  },
  {
    id: 'seed-1',
    caughtAt: '2026-06-01',
    anglerName: 'A',
    fishCategory: 'predatory',
    fishSpecies: 'pike',
    fishCount: 2,
    totalWeightKg: 3.4,
  },
  {
    id: 'seed-3',
    caughtAt: '2026-05-01',
    anglerName: 'C',
    fishCategory: 'predatory',
    fishSpecies: 'perch',
    fishCount: 7,
    totalWeightKg: 1.6,
  },
];

describe('catchRecords utils', () => {
  it('sorts by caughtAt desc then id asc', () => {
    expect(sortCatchRecords(records).map((record) => record.id)).toEqual([
      'seed-1',
      'seed-2',
      'seed-3',
    ]);
  });

  it('filters by fish category with all as no-op', () => {
    expect(filterCatchRecords(records, 'all')).toHaveLength(3);
    expect(filterCatchRecords(records, 'predatory').map((record) => record.id)).toEqual([
      'seed-1',
      'seed-3',
    ]);
  });

  it('calculates statistics from records in view', () => {
    expect(calculateCatchStatistics(filterCatchRecords(records, 'predatory'))).toEqual({
      totalFishCount: 9,
      totalWeightKg: 5,
    });
  });

  it('formats total weight with one decimal and half-up rounding', () => {
    expect(formatTotalWeightKg(3.46)).toBe('3.5 kg');
    expect(formatTotalWeightKg(0)).toBe('0.0 kg');
    expect(formatCatchStatisticsTotalWeight(records)).toBe('10.8 kg');
  });
});
