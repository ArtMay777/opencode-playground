import { rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(fileURLToPath(new URL('../', import.meta.url)));
const e2eDataDir = path.join(repoRoot, 'test-results', 'angler-journal-e2e-data');

export default async function globalSetup(): Promise<void> {
  await rm(e2eDataDir, { recursive: true, force: true });
}
