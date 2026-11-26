import { rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const e2eDataDir = path.resolve(
  fileURLToPath(new URL('../', import.meta.url)),
  'test-results',
  'angler-journal-e2e-data',
);

export default async function globalTeardown(): Promise<void> {
  await rm(e2eDataDir, { recursive: true, force: true });
}
