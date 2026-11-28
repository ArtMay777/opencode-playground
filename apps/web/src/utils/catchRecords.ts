import type {
  CatchRecord,
  CatchStatistics,
  FishCategoryFilter,
} from "../types.ts";

export function sortCatchRecords(records: CatchRecord[]): CatchRecord[] {
  return [...records].sort((a, b) => {
    if (a.caughtAt !== b.caughtAt) {
      return b.caughtAt.localeCompare(a.caughtAt);
    }
    return a.id.localeCompare(b.id);
  });
}

export function filterCatchRecords(
  records: CatchRecord[],
  filter: FishCategoryFilter,
): CatchRecord[] {
  if (filter === "all") {
    return records;
  }
  return records.filter((record) => record.fishCategory === filter);
}

export function formatTotalWeightKg(totalWeightKg: number): string {
  const hundredths = Math.round(totalWeightKg * 100);
  const roundedTenths = Math.round(hundredths / 10);
  const whole = Math.trunc(roundedTenths / 10);
  const tenth = Math.abs(roundedTenths % 10);
  return `${whole}.${tenth} kg`;
}

export function calculateCatchStatistics(
  records: CatchRecord[],
): CatchStatistics {
  const totalFishCount = records.reduce(
    (sum, record) => sum + record.fishCount,
    0,
  );
  const totalHundredths = records.reduce(
    (sum, record) => sum + Math.round(record.totalWeightKg * 100),
    0,
  );

  return {
    totalFishCount,
    totalWeightKg: Math.round(totalHundredths / 10) / 10,
  };
}

export function formatCatchStatisticsTotalWeight(
  records: CatchRecord[],
): string {
  const stats = calculateCatchStatistics(records);
  return formatTotalWeightKg(stats.totalWeightKg);
}
