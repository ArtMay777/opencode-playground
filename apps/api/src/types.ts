export type FishCategory = 'predatory' | 'non-predatory';

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

export interface Store {
  catchRecords: CatchRecord[];
}

export interface ApiErrorBody {
  message: string;
}

export interface ApiFieldErrorBody {
  field: string;
  message: string;
}
