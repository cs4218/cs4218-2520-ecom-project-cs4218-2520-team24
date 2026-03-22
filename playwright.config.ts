import { defineConfig, devices } from '@playwright/test';
import { DbStorage } from './tests/helpers/db-storage';

DbStorage.cleanup();

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60 * 1000,
  fullyParallel: true,
  workers: process.env.CI ? 1 : 4,
  reporter: 'html',
  globalSetup: './tests/global-setup.ts',
  globalTeardown: './tests/global-teardown.ts',

  use: {
    baseURL: 'http://localhost:3000',
  },

  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});