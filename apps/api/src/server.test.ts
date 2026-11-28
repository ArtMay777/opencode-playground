import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { app } from './server.ts';
import { __resetStoreForTests, getSeedPath } from './store.ts';
import type { CatchRecord, CatchRecordInput } from './types.ts';

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
  vi.restoreAllMocks();
  vi.useRealTimers();
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

const validInput: CatchRecordInput = {
  caughtAt: '2026-04-12',
  anglerName: 'Oleksii',
  fishCategory: 'predatory',
  fishSpecies: 'pike',
  fishCount: 2,
  totalWeightKg: 3.4,
};

function postCatchRecord(input: unknown = validInput) {
  return request(app).post('/api/catch-records').send(input as object);
}

describe('POST /api/catch-records', () => {
  it('creates a catch record, trims strings, stores normalized values, and returns 201', async () => {
    const response = await postCatchRecord({
      ...validInput,
      anglerName: '  Oleksii  ',
      fishSpecies: '  pike  ',
    });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      ...validInput,
      anglerName: 'Oleksii',
      fishSpecies: 'pike',
      id: expect.stringMatching(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      ),
    });

    const list = await request(app).get('/api/catch-records');
    expect(list.status).toBe(200);
    expect(list.body).toHaveLength(11);
    expect(list.body[10]).toEqual(response.body);
  });

  it('allows duplicate identical records', async () => {
    const first = await postCatchRecord(validInput);
    const second = await postCatchRecord(validInput);

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(second.body.id).not.toBe(first.body.id);
    const list = await request(app).get('/api/catch-records');
    expect(list.body).toHaveLength(12);
  });

  it('returns 400 Invalid JSON for malformed JSON with JSON content type', async () => {
    const response = await request(app)
      .post('/api/catch-records')
      .set('Content-Type', 'application/json')
      .send('{bad json');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ field: 'body', message: 'Invalid JSON' });
  });

  it('returns 400 Invalid request body for missing/non-JSON content type, empty, null, array, non-object', async () => {
    const missingOrNonJson = await request(app)
      .post('/api/catch-records')
      .type('form')
      .send('caughtAt=2026-04-12');
    expect(missingOrNonJson.status).toBe(400);
    expect(missingOrNonJson.body).toEqual({ field: 'body', message: 'Invalid request body' });

    const emptyBody = await request(app)
      .post('/api/catch-records')
      .set('Content-Type', 'application/json')
      .send('');
    expect(emptyBody.status).toBe(400);
    expect(emptyBody.body).toEqual({ field: 'body', message: 'Invalid request body' });

    const nullBody = await request(app)
      .post('/api/catch-records')
      .set('Content-Type', 'application/json')
      .send('null');
    expect(nullBody.status).toBe(400);
    expect(nullBody.body).toEqual({ field: 'body', message: 'Invalid request body' });

    const arrayBody = await request(app).post('/api/catch-records').send([validInput]);
    expect(arrayBody.status).toBe(400);
    expect(arrayBody.body).toEqual({ field: 'body', message: 'Invalid request body' });

    const stringBody = await request(app)
      .post('/api/catch-records')
      .set('Content-Type', 'application/json')
      .send('"not-object"');
    expect(stringBody.status).toBe(400);
    expect(stringBody.body).toEqual({ field: 'body', message: 'Invalid request body' });
  });

  it('rejects unknown fields with ASCII-alphabetically first name', async () => {
    const response = await postCatchRecord({ ...validInput, zzz: 1, aaa: 2 });
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ field: 'body', message: 'Unexpected field: aaa' });
  });

  it('rejects id field as unknown field', async () => {
    const response = await postCatchRecord({ ...validInput, id: 'mine' });
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ field: 'body', message: 'Unexpected field: id' });
  });

  it('checks missing fields in fixed field order', async () => {
    const response = await postCatchRecord({
      anglerName: 'Oleksii',
      fishCategory: 'predatory',
      fishSpecies: 'pike',
      fishCount: 2,
      totalWeightKg: 3.4,
    });
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ field: 'caughtAt', message: 'Date is required' });
  });

  it('uses exact missing-field messages for category/count/weight', async () => {
    const missingCategory = await postCatchRecord({
      caughtAt: validInput.caughtAt,
      anglerName: validInput.anglerName,
      fishSpecies: validInput.fishSpecies,
      fishCount: validInput.fishCount,
      totalWeightKg: validInput.totalWeightKg,
    });
    expect(missingCategory.body).toEqual({
      field: 'fishCategory',
      message: 'Fish category must be predatory or non-predatory',
    });

    const missingCount = await postCatchRecord({
      caughtAt: validInput.caughtAt,
      anglerName: validInput.anglerName,
      fishCategory: validInput.fishCategory,
      fishSpecies: validInput.fishSpecies,
      totalWeightKg: validInput.totalWeightKg,
    });
    expect(missingCount.body).toEqual({
      field: 'fishCount',
      message: 'Fish count must be an integer of at least 1',
    });

    const missingWeight = await postCatchRecord({
      caughtAt: validInput.caughtAt,
      anglerName: validInput.anglerName,
      fishCategory: validInput.fishCategory,
      fishSpecies: validInput.fishSpecies,
      fishCount: validInput.fishCount,
    });
    expect(missingWeight.body).toEqual({
      field: 'totalWeightKg',
      message: 'Total weight must be a number greater than 0',
    });
  });

  it('returns only first validation error in fixed field order', async () => {
    const response = await postCatchRecord({
      caughtAt: 'bad',
      anglerName: '',
      fishCategory: 'bad',
      fishSpecies: '',
      fishCount: 0,
      totalWeightKg: -1,
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ field: 'caughtAt', message: 'Date must be a valid date' });
  });

  it('validates wrong types with exact messages', async () => {
    const cases: Array<[Record<string, unknown>, { field: string; message: string }]> = [
      [{ ...validInput, caughtAt: 123 }, { field: 'caughtAt', message: 'Date must be a valid date' }],
      [{ ...validInput, anglerName: 123 }, { field: 'anglerName', message: 'Angler must be a string' }],
      [{ ...validInput, fishCategory: 123 }, { field: 'fishCategory', message: 'Fish category must be predatory or non-predatory' }],
      [{ ...validInput, fishSpecies: 123 }, { field: 'fishSpecies', message: 'Fish species must be a string' }],
      [{ ...validInput, fishCount: '2' }, { field: 'fishCount', message: 'Fish count must be an integer of at least 1' }],
      [{ ...validInput, totalWeightKg: '3.4' }, { field: 'totalWeightKg', message: 'Total weight must be a number greater than 0' }],
    ];

    for (const [input, expected] of cases) {
      const response = await postCatchRecord(input);
      expect(response.status).toBe(400);
      expect(response.body).toEqual(expected);
    }
  });

  it('validates date rules including invalid calendar date and UTC future boundary', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-22T12:00:00Z'));

    const invalidCalendar = await postCatchRecord({ ...validInput, caughtAt: '2026-02-30' });
    expect(invalidCalendar.body).toEqual({ field: 'caughtAt', message: 'Date must be a valid date' });

    const future = await postCatchRecord({ ...validInput, caughtAt: '2026-06-23' });
    expect(future.body).toEqual({ field: 'caughtAt', message: 'Date cannot be in the future' });

    const today = await postCatchRecord({ ...validInput, caughtAt: '2026-06-22' });
    expect(today.status).toBe(201);
  });

  it('validates weight as finite >0 with at most two decimal places; accepts 1e-2', async () => {
    const zero = await postCatchRecord({ ...validInput, totalWeightKg: 0 });
    expect(zero.body).toEqual({ field: 'totalWeightKg', message: 'Total weight must be a number greater than 0' });

    const tooManyDecimals = await postCatchRecord({ ...validInput, totalWeightKg: 1.234 });
    expect(tooManyDecimals.body).toEqual({
      field: 'totalWeightKg',
      message: 'Total weight can have at most two decimal places',
    });

    const exponent = await postCatchRecord({ ...validInput, totalWeightKg: 1e-2 });
    expect(exponent.status).toBe(201);
    expect(exponent.body.totalWeightKg).toBe(0.01);
  });

  it('validates fish species/category match and length/trim rules', async () => {
    const mismatch = await postCatchRecord({ ...validInput, fishCategory: 'non-predatory', fishSpecies: 'perch' });
    expect(mismatch.body).toEqual({
      field: 'fishSpecies',
      message: 'Fish species does not match the selected category',
    });

    const blankAngler = await postCatchRecord({ ...validInput, anglerName: '   ' });
    expect(blankAngler.body).toEqual({ field: 'anglerName', message: 'Angler is required' });

    const longSpecies = await postCatchRecord({ ...validInput, fishSpecies: 'p'.repeat(101) });
    expect(longSpecies.body).toEqual({ field: 'fishSpecies', message: 'Fish species must be 100 characters or fewer' });
  });
});

describe('PUT /api/catch-records/:id', () => {
  it('updates an existing record, trims strings, and returns 200', async () => {
    const response = await request(app).put('/api/catch-records/seed-1').send({
      ...validInput,
      anglerName: '  Oleksii  ',
      fishSpecies: ' perch ',
      caughtAt: '2026-04-13',
      fishCount: 5,
      totalWeightKg: 2,
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: 'seed-1',
      caughtAt: '2026-04-13',
      anglerName: 'Oleksii',
      fishCategory: 'predatory',
      fishSpecies: 'perch',
      fishCount: 5,
      totalWeightKg: 2,
    });

    const list = await request(app).get('/api/catch-records');
    const updated = (list.body as CatchRecord[]).find((r) => r.id === 'seed-1');
    expect(updated).toEqual(response.body);
  });

  it('returns 404 for missing record', async () => {
    const response = await request(app).put('/api/catch-records/missing').send(validInput);
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ message: 'Catch record not found' });
  });

  it('returns 400 for invalid body and does not change record', async () => {
    const before = await request(app).get('/api/catch-records');
    const response = await request(app).put('/api/catch-records/seed-1').send({
      ...validInput,
      fishCount: 0,
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ field: 'fishCount', message: 'Fish count must be an integer of at least 1' });

    const after = await request(app).get('/api/catch-records');
    expect(after.body).toEqual(before.body);
  });
});

describe('DELETE /api/catch-records/:id', () => {
  it('deletes an existing record and returns 204', async () => {
    const response = await request(app).delete('/api/catch-records/seed-1');
    expect(response.status).toBe(204);
    expect(response.text).toBe('');

    const list = await request(app).get('/api/catch-records');
    expect(list.body).toHaveLength(9);
    expect((list.body as CatchRecord[]).some((r) => r.id === 'seed-1')).toBe(false);
  });

  it('returns 404 for missing record', async () => {
    const response = await request(app).delete('/api/catch-records/missing');
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ message: 'Catch record not found' });
  });
});
