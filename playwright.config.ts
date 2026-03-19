import { defineConfig, devices } from '@playwright/test';
import { startMongo } from './tests/mongodb-manager';

// Start MongoMemoryServer using the shared manager
const mongoServer = await startMongo();
const mongoUri = mongoServer.getUri();
process.env.MONGO_URL = mongoUri;
console.log(`Global MongoMemoryServer started at: ${mongoUri}`);

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60 * 1000,
  expect: {
    timeout: 5000
  },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Stay on 1 worker for DB consistency in E2E
  reporter: 'html',
  
  // Custom seeding now happens in globalSetup using the shared MONGO_URL
  globalSetup: './tests/global-setup',

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: false,
    timeout: 180 * 1000,
    env: {
       NODE_ENV: 'test',
       PLAYWRIGHT: 'true',
       BROWSER: 'none', // Prevent React from opening a browser tab
    },
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
