import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { CatchRecord, FishCategory, Store } from './types.ts';

const SEED_PATH = fileURLToPath(new URL('../../../data/seed.json', import.meta.url));
const DEFAULT_DATA_DIR = fileURLToPath(new URL('../../../data', import.meta.url));
const STORE_FILE_NAME = 'store.json';
const STORE_ERROR_MESSAGE = 'Internal server error';

const FISH_SPECIES_BY_CATEGORY: Record<FishCategory, readonly string[]> = {
  predatory: ['pike', 'perch', 'zander'],
  'non-predatory': ['crucian carp', 'carp', 'bream', 'silver carp'],
};

interface SeedRecord {
  caughtAt: string;
  anglerName: string;
  fishCategory: FishCategory;
  fishSpecies: string;
  fishCount: number;
  totalWeightKg: number;
}

interface SeedFile {
  catchRecords: SeedRecord[];
}

export class StoreError extends Error {
  readonly status = 500;
  readonly body = { message: STORE_ERROR_MESSAGE };

  constructor(cause?: unknown) {
    super(STORE_ERROR_MESSAGE);
    this.name = 'StoreError';
    this.cause = cause;
  }
}

let initializationPromise: Promise<void> | null = null;
let writeQueue: Promise<void> = Promise.resolve();

export function getDataDir(): string {
  const configured = process.env.DATA_DIR?.trim();
  return configured ? path.resolve(configured) : DEFAULT_DATA_DIR;
}

export function getStorePath(): string {
  return path.join(getDataDir(), STORE_FILE_NAME);
}

export function getSeedPath(): string {
  return SEED_PATH;
}

export async function ensureStoreInitialized(): Promise<void> {
  if (!initializationPromise) {
    initializationPromise = initializeStore().catch((error: unknown) => {
      initializationPromise = null;
      throw error;
    });
  }

  await initializationPromise;
}

export async function readStore(): Promise<Store> {
  await ensureStoreInitialized();
  return readValidatedStore();
}

export async function writeStore(store: Store): Promise<void> {
  assertValidStore(store);
  await enqueueWrite(async () => {
    await writeStoreFile(store);
  });
}

export function __resetStoreForTests(): void {
  initializationPromise = null;
  writeQueue = Promise.resolve();
}

async function initializeStore(): Promise<void> {
  try {
    await readValidatedStore();
  } catch (error: unknown) {
    if (!isMissingStoreError(error)) {
      throw error;
    }

    const seededStore = await readSeedStore();
    await enqueueWrite(async () => {
      try {
        await readValidatedStore();
      } catch (readError: unknown) {
        if (!isMissingStoreError(readError)) {
          throw readError;
        }
        await writeStoreFile(seededStore);
      }
    });
  }
}

async function readSeedStore(): Promise<Store> {
  try {
    const content = await readFile(SEED_PATH, 'utf8');
    const parsed = JSON.parse(content) as unknown;
    if (!isSeedFile(parsed)) {
      throw new StoreError(new Error('Invalid seed file'));
    }

    const catchRecords = parsed.catchRecords.map((record, index) =>
      createSeedRecord(record, index),
    );
    const store: Store = { catchRecords };
    assertValidStore(store);
    return store;
  } catch (error: unknown) {
    if (error instanceof StoreError) throw error;
    throw new StoreError(error);
  }
}

function createSeedRecord(record: SeedRecord, index: number): CatchRecord {
  return {
    id: `seed-${index + 1}`,
    caughtAt: record.caughtAt,
    anglerName: record.anglerName,
    fishCategory: record.fishCategory,
    fishSpecies: record.fishSpecies,
    fishCount: record.fishCount,
    totalWeightKg: record.totalWeightKg,
  };
}

async function readValidatedStore(): Promise<Store> {
  try {
    const content = await readFile(getStorePath(), 'utf8');
    const parsed = JSON.parse(content) as unknown;
    assertValidStore(parsed);
    return parsed;
  } catch (error: unknown) {
    if (isMissingStoreError(error)) throw error;
    if (error instanceof StoreError) throw error;
    throw new StoreError(error);
  }
}

async function writeStoreFile(store: Store): Promise<void> {
  const storePath = getStorePath();
  const dir = path.dirname(storePath);
  const tempPath = path.join(
    dir,
    `${STORE_FILE_NAME}.${process.pid}.${Date.now()}.${randomUUID()}.tmp`,
  );

  try {
    await mkdir(dir, { recursive: true });
    await writeFile(tempPath, `${JSON.stringify(store, null, 2)}
`, 'utf8');
    await rename(tempPath, storePath);
  } catch (error: unknown) {
    throw new StoreError(error);
  }
}

function enqueueWrite(operation: () => Promise<void>): Promise<void> {
  const run = writeQueue.then(operation, operation);
  writeQueue = run.catch(() => undefined);
  return run;
}

function isMissingStoreError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'ENOENT'
  );
}

function isSeedFile(value: unknown): value is SeedFile {
  if (!isRecord(value)) return false;
  if (!Array.isArray(value.catchRecords)) return false;
  return value.catchRecords.every(isSeedRecord);
}

function isSeedRecord(value: unknown): value is SeedRecord {
  if (!isRecord(value)) return false;
  return (
    typeof value.caughtAt === 'string' &&
    typeof value.anglerName === 'string' &&
    (value.fishCategory === 'predatory' || value.fishCategory === 'non-predatory') &&
    typeof value.fishSpecies === 'string' &&
    typeof value.fishCount === 'number' &&
    typeof value.totalWeightKg === 'number'
  );
}

function assertValidStore(value: unknown): asserts value is Store {
  if (!isRecord(value)) throw new StoreError(new Error('Store must be an object'));
  const keys = Object.keys(value);
  if (keys.length !== 1 || keys[0] !== 'catchRecords') {
    throw new StoreError(new Error('Store must contain only catchRecords'));
  }
  if (!Array.isArray(value.catchRecords)) {
    throw new StoreError(new Error('catchRecords must be an array'));
  }

  const ids = new Set<string>();
  for (const record of value.catchRecords) {
    assertValidCatchRecord(record);
    if (ids.has(record.id)) {
      throw new StoreError(new Error('Duplicate catch record id'));
    }
    ids.add(record.id);
  }
}

function assertValidCatchRecord(value: unknown): asserts value is CatchRecord {
  if (!isRecord(value)) throw new StoreError(new Error('Catch record must be an object'));
  const expectedKeys = [
    'id',
    'caughtAt',
    'anglerName',
    'fishCategory',
    'fishSpecies',
    'fishCount',
    'totalWeightKg',
  ];
  const keys = Object.keys(value);
  if (
    keys.length !== expectedKeys.length ||
    !expectedKeys.every((key) => keys.includes(key))
  ) {
    throw new StoreError(new Error('Catch record has invalid fields'));
  }

  const { id, caughtAt, anglerName, fishCategory, fishSpecies, fishCount, totalWeightKg } =
    value as Record<string, unknown>;

  if (typeof id !== 'string' || id.trim().length === 0) {
    throw new StoreError(new Error('Invalid catch record id'));
  }
  if (!isValidCaughtAt(caughtAt)) {
    throw new StoreError(new Error('Invalid caughtAt'));
  }
  if (!isValidName(anglerName)) {
    throw new StoreError(new Error('Invalid anglerName'));
  }
  if (fishCategory !== 'predatory' && fishCategory !== 'non-predatory') {
    throw new StoreError(new Error('Invalid fishCategory'));
  }
  if (!isValidFishSpecies(fishCategory, fishSpecies)) {
    throw new StoreError(new Error('Invalid fishSpecies'));
  }
  if (!isValidFishCount(fishCount)) {
    throw new StoreError(new Error('Invalid fishCount'));
  }
  if (!isValidTotalWeightKg(totalWeightKg)) {
    throw new StoreError(new Error('Invalid totalWeightKg'));
  }
}

function isValidCaughtAt(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
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
    return false;
  }
  const today = new Date();
  const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return date.getTime() <= todayUtc;
}

function isValidName(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length >= 1 && value.length <= 100;
}

function isValidFishSpecies(category: FishCategory, value: unknown): value is string {
  if (typeof value !== 'string') return false;
  if (value.trim().length < 1 || value.length > 100) return false;
  return FISH_SPECIES_BY_CATEGORY[category].includes(value);
}

function isValidFishCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1;
}

function isValidTotalWeightKg(value: unknown): value is number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return false;
  return Math.abs(value * 100 - Math.round(value * 100)) < 1e-9;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
