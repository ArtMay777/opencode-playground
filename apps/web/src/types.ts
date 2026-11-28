export type FishCategory = 'predatory' | 'non-predatory';
export type FishCategoryFilter = 'all' | FishCategory;

export interface CatchRecord {
  id: string;
  caughtAt: string;
  anglerName: string;
  fishCategory: FishCategory;
  fishSpecies: string;
  fishCount: number;
  totalWeightKg: number;
}

export interface CatchRecordInput {
  caughtAt: string;
  anglerName: string;
  fishCategory: FishCategory;
  fishSpecies: string;
  fishCount: number;
  totalWeightKg: number;
}

export interface CatchStatistics {
  totalFishCount: number;
  totalWeightKg: number;
}

export interface ApiFieldError {
  field: string;
  message: string;
}
