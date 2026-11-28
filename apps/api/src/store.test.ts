import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { __resetStoreForTests, ensureStoreInitialized, getSeedPath, getStorePath, readStore, StoreError, writeStore } from './store.ts';
import type { Store } from './types.ts';

const repoStorePath = path.resolve(process.cwd(), '../../data/store.json');

let dataDir: string;
let originalDataDir: string | undefined;
let repoStoreExisted: boolean;
let repoStoreContent: string | undefined;

beforeEach(() => {
  repoStoreExisted = existsSync(repoStorePath);
  repoStoreContent = repoStoreExisted ? readFileSync(repoStorePath, 'utf8') : undefined;
  originalDataDir = process.env.DATA_DIR;
  dataDir = mkdtempSync(path.join(tmpdir(), 'angler-store-'));
  process.env.DATA_DIR = dataDir;
  __resetStoreForTests();
});

afterEach(() => {
  __resetStoreForTests();
  if (originalDataDir === undefined) {
    delete process.env.DATA_DIR;
  } else {
    process.env.DATA_DIR = originalDataDir;
  }
  rmSync(dataDir, { recursive: true, force: true });
  expect(existsSync(repoStorePath)).toBe(repoStoreExisted);
  if (repoStoreExisted) {
    expect(readFileSync(repoStorePath, 'utf8')).toBe(repoStoreContent);
  }
  vi.restoreAllMocks();
});

function readSeedCatchRecords() {
  const seed = JSON.parse(readFileSync(getSeedPath(), 'utf8')) as {
    catchRecords: Array<Record<string, unknown>>;
  };
  return seed.catchRecords;
}

describe('store initialization and seeding', () => {
  it('initializes store from seed on first use with deterministic seed IDs', async () => {
    await ensureStoreInitialized();

    const storePath = getStorePath();
    expect(storePath).toBe(path.join(dataDir, 'store.json'));
    expect(existsSync(storePath)).toBe(true);

    const store = JSON.parse(readFileSync(storePath, 'utf8')) as Store;
    const seedRecords = readSeedCatchRecords();

    expect(store.catchRecords).toHaveLength(10);
    expect(store.catchRecords.map((record) => record.id)).toEqual(
      Array.from({ length: 10 }, (_, index) => `seed-${index + 1}`),
    );
    expect(store.catchRecords.map((record) => { const { id, ...rest } = record; void id; return rest; })).toEqual(seedRecords);
    expect(existsSync(repoStorePath)).toBe(repoStoreExisted);
    if (repoStoreExisted) {
      expect(readFileSync(repoStorePath, 'utf8')).toBe(repoStoreContent);
    }
  });

  it('is idempotent when initializing an already missing store', async () => {
    await ensureStoreInitialized();
    const first = JSON.parse(readFileSync(getStorePath(), 'utf8')) as Store;

    await ensureStoreInitialized();
    const second = JSON.parse(readFileSync(getStorePath(), 'utf8')) as Store;

    expect(second).toEqual(first);
  });

  it('reads an existing valid store without rewriting seed semantics', async () => {
    const existing: Store = {
      catchRecords: [
        {
          id: 'existing-1',
          caughtAt: '2026-06-01',
          anglerName: 'Test Angler',
          fishCategory: 'predatory',
          fishSpecies: 'pike',
          fishCount: 1,
          totalWeightKg: 2.5,
        },
      ],
    };
    writeFileSync(getStorePath(), JSON.stringify(existing), 'utf8');

    const store = await readStore();

    expect(store).toEqual(existing);
  });

  it('returns a safe 500 StoreError for invalid/corrupt store and does not overwrite it', async () => {
    const storePath = getStorePath();
    writeFileSync(storePath, '{not-json', 'utf8');

    await expect(readStore()).rejects.toMatchObject({
      status: 500,
      body: { message: 'Internal server error' },
    });
    await expect(readStore()).rejects.toBeInstanceOf(StoreError);
    expect(readFileSync(storePath, 'utf8')).toBe('{not-json');
  });

  it('clears rejected initialization cache so a later retry can succeed', async () => {
    rmSync(dataDir, { recursive: true, force: true });
    writeFileSync(dataDir, 'not a directory', 'utf8');

    await expect(ensureStoreInitialized()).rejects.toBeInstanceOf(StoreError);

    rmSync(dataDir, { force: true });
    await expect(ensureStoreInitialized()).resolves.toBeUndefined();

    const store = await readStore();
    expect(store.catchRecords).toHaveLength(10);
  });
});

describe('store writes', () => {
  it('writes a validated store atomically through the store path', async () => {
    await ensureStoreInitialized();
    const next: Store = {
      catchRecords: [
        {
          id: 'seed-1',
          caughtAt: '2026-04-12',
          anglerName: 'Oleksii',
          fishCategory: 'predatory',
          fishSpecies: 'pike',
          fishCount: 2,
          totalWeightKg: 3.4,
        },
      ],
    };

    await writeStore(next);

    expect(JSON.parse(readFileSync(getStorePath(), 'utf8')) as Store).toEqual(next);
  });

  it('rejects invalid store writes', async () => {
    const invalid = {
      catchRecords: [
        {
          id: 'bad',
          caughtAt: '2026-02-30',
          anglerName: 'Oleksii',
          fishCategory: 'predatory',
          fishSpecies: 'pike',
          fishCount: 1,
          totalWeightKg: 1,
        },
      ],
    } as unknown as Store;

    await expect(writeStore(invalid)).rejects.toBeInstanceOf(StoreError);
  });
});
