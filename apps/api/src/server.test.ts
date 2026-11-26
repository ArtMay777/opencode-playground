import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { app } from './server.ts';
import { __resetStoreForTests, getSeedPath } from './store.ts';
import type { CatchRecord } from './types.ts';

const repoStorePath = path.resolve(process.cwd(), '../../data/store.json');

let dataDir: string;
let originalDataDir: string | undefined;

beforeEach(() => {
  originalDataDir = process.env.DATA_DIR;
  dataDir = mkdtempSync(path.join(tmpdir(), 'angler-api-'));
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
});

function readSeedRecords(): CatchRecord[] {
  const seed = JSON.parse(readFileSync(getSeedPath(), 'utf8')) as {
    catchRecords: Array<Omit<CatchRecord, 'id'>>;
  };
  return seed.catchRecords.map((record, index) => ({ id: `seed-${index + 1}`, ...record }));
}

describe('GET /api/version', () => {
  it('responds with the API name and a semantic version', async () => {
    const response = await request(app).get('/api/version');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/application\/json/);
    expect(response.body).toEqual({
      name: 'api',
      version: expect.stringMatching(/^\d+\.\d+\.\d+/),
    });
  });

  it('returns 404 for unknown routes', async () => {
    const response = await request(app).get('/api/does-not-exist');

    expect(response.status).toBe(404);
  });
});

describe('GET /api/catch-records', () => {
  it('returns seeded catch records with deterministic IDs on first use', async () => {
    const response = await request(app).get('/api/catch-records');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/application\/json/);
    expect(response.body).toEqual(readSeedRecords());
  });

  it('seeds through an imported app/Supertest request and does not write real data/store.json', async () => {
    const hadRepoStore = existsSync(repoStorePath);
    const repoStoreBefore = hadRepoStore ? readFileSync(repoStorePath, 'utf8') : null;

    const response = await request(app).get('/api/catch-records');

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(10);
    expect(readFileSync(path.join(dataDir, 'store.json'), 'utf8')).toContain('"catchRecords"');

    const hasRepoStoreAfter = existsSync(repoStorePath);
    expect(hasRepoStoreAfter).toBe(hadRepoStore);
    if (hadRepoStore) {
      expect(readFileSync(repoStorePath, 'utf8')).toBe(repoStoreBefore);
    }
  });

  it('returns safe 500 for corrupt store', async () => {
    writeFileSync(path.join(dataDir, 'store.json'), '{not-json', 'utf8');

    const response = await request(app).get('/api/catch-records');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ message: 'Internal server error' });
  });
});
