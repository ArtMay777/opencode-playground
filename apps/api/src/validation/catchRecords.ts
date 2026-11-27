import type { CatchRecordInput, FishCategory } from '../types.ts';

const FIELD_ORDER = [
  'caughtAt',
  'anglerName',
  'fishCategory',
  'fishSpecies',
  'fishCount',
  'totalWeightKg',
] as const;

type FieldName = (typeof FIELD_ORDER)[number];

const FISH_SPECIES_BY_CATEGORY: Record<FishCategory, readonly string[]> = {
  predatory: ['pike', 'perch', 'zander'],
  'non-predatory': ['crucian carp', 'carp', 'bream', 'silver carp'],
};

export class ValidationError extends Error {
  readonly status = 400;
  readonly body: { field: string; message: string };

  constructor(field: string, message: string) {
    super(message);
    this.name = 'ValidationError';
    this.body = { field, message };
  }
}

export function validateCatchRecordInput(body: unknown): CatchRecordInput {
  if (!isJsonObject(body)) {
    throw new ValidationError('body', 'Invalid request body');
  }

  if (Object.keys(body).length === 0) {
    throw new ValidationError('body', 'Invalid request body');
  }

  const unknownFields = Object.keys(body)
    .filter((key) => !FIELD_ORDER.includes(key as FieldName))
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  if (unknownFields.length > 0) {
    throw new ValidationError('body', `Unexpected field: ${unknownFields[0]}`);
  }

  for (const field of FIELD_ORDER) {
    if (!(field in body)) {
      throw new ValidationError(field, missingFieldMessage(field));
    }
  }

  const record = body as Record<FieldName, unknown>;

  const caughtAt = validateCaughtAt(record.caughtAt);
  const anglerName = validateAnglerName(record.anglerName);
  const fishCategory = validateFishCategory(record.fishCategory);
  const fishSpecies = validateFishSpecies(record.fishSpecies, fishCategory);
  const fishCount = validateFishCount(record.fishCount);
  const totalWeightKg = validateTotalWeightKg(record.totalWeightKg);

  return {
    caughtAt,
    anglerName,
    fishCategory,
    fishSpecies,
    fishCount,
    totalWeightKg,
  };
}

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function missingFieldMessage(field: FieldName): string {
  switch (field) {
    case 'caughtAt':
      return 'Caught at is required';
    case 'anglerName':
      return 'Angler is required';
    case 'fishCategory':
      return 'Fish category must be predatory or non-predatory';
    case 'fishSpecies':
      return 'Fish species is required';
    case 'fishCount':
      return 'Fish count must be an integer of at least 1';
    case 'totalWeightKg':
      return 'Total weight must be a number greater than 0';
  }
}

function validateCaughtAt(value: unknown): string {
  if (typeof value !== 'string') {
    if (value === undefined || value === null) {
      throw new ValidationError('caughtAt', 'Caught at is required');
    }
    throw new ValidationError('caughtAt', 'Caught at must be a valid date');
  }
  if (value === '') {
    throw new ValidationError('caughtAt', 'Caught at must be a valid date');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new ValidationError('caughtAt', 'Caught at must be a valid date');
  }

  const [yearString, monthString, dayString] = value.split('-');
  const year = Number(yearString);
  const month = Number(monthString);
  const day = Number(dayString);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new ValidationError('caughtAt', 'Caught at must be a valid date');
  }

  const today = new Date();
  const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  if (date.getTime() > todayUtc) {
    throw new ValidationError('caughtAt', 'Caught at cannot be in the future');
  }

  return value;
}

function validateAnglerName(value: unknown): string {
  if (value === undefined || value === null) {
    throw new ValidationError('anglerName', 'Angler is required');
  }
  if (typeof value !== 'string') {
    throw new ValidationError('anglerName', 'Angler must be a string');
  }
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new ValidationError('anglerName', 'Angler is required');
  }
  if (normalized.length > 100) {
    throw new ValidationError('anglerName', 'Angler must be 100 characters or fewer');
  }
  return normalized;
}

function validateFishCategory(value: unknown): FishCategory {
  if (value === undefined || value === null) {
    throw new ValidationError('fishCategory', 'Fish category must be predatory or non-predatory');
  }
  if (value !== 'predatory' && value !== 'non-predatory') {
    throw new ValidationError('fishCategory', 'Fish category must be predatory or non-predatory');
  }
  return value;
}

function validateFishSpecies(value: unknown, fishCategory: FishCategory): string {
  if (value === undefined || value === null) {
    throw new ValidationError('fishSpecies', 'Fish species is required');
  }
  if (typeof value !== 'string') {
    throw new ValidationError('fishSpecies', 'Fish species must be a string');
  }
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new ValidationError('fishSpecies', 'Fish species is required');
  }
  if (normalized.length > 100) {
    throw new ValidationError('fishSpecies', 'Fish species must be 100 characters or fewer');
  }
  if (!FISH_SPECIES_BY_CATEGORY[fishCategory].includes(normalized)) {
    throw new ValidationError('fishSpecies', 'Fish species does not match the selected category');
  }
  return normalized;
}

function validateFishCount(value: unknown): number {
  if (value === undefined || value === null) {
    throw new ValidationError('fishCount', 'Fish count must be an integer of at least 1');
  }
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    throw new ValidationError('fishCount', 'Fish count must be an integer of at least 1');
  }
  return value;
}

function validateTotalWeightKg(value: unknown): number {
  if (value === undefined || value === null) {
    throw new ValidationError('totalWeightKg', 'Total weight must be a number greater than 0');
  }
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new ValidationError('totalWeightKg', 'Total weight must be a number greater than 0');
  }
  if (Math.abs(value * 100 - Math.round(value * 100)) >= 1e-9) {
    throw new ValidationError('totalWeightKg', 'Total weight can have at most two decimal places');
  }
  return value;
}
