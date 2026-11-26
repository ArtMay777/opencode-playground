import { rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, devices } from '@playwright/test';

const isCI = Boolean(process.env.CI);

// E2E uses its own ports and an isolated store, never the development defaults
// or the real data/store.json.
const apiPort = 3101;
const webPort = 5174;
const e2eDataDir = 'test-results/angler-journal-e2e-data';

// Playwright starts web servers before globalSetup, so clear the directory here
// as well: the API must see a fresh store before it starts.
rmSync(path.resolve(fileURLToPath(new URL('./', import.meta.url)), e2eDataDir), {
  recursive: true,
  force: true,
});

// https://playwright.dev/docs/test-configuration
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  workers: 1,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',
  use: {
    baseURL: `http://localhost:${webPort}`,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // Playwright starts both apps before the tests and stops them afterwards.
  // E2E never reuses a locally running dev server: it would use the real store.
  webServer: [
    {
      command: 'npm run dev -w apps/api',
      url: `http://localhost:${apiPort}/api/version`,
      reuseExistingServer: false,
      env: {
        PORT: String(apiPort),
        API_PORT: String(apiPort),
        DATA_DIR: e2eDataDir,
      },
    },
    {
      command: 'npm run dev -w apps/web',
      url: `http://localhost:${webPort}`,
      reuseExistingServer: false,
      env: {
        API_PORT: String(apiPort),
        WEB_PORT: String(webPort),
      },
    },
  ],
});
