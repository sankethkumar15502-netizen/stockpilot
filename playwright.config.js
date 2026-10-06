import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser', timeout: 60000, fullyParallel: false, workers: 1,
  reporter: 'list', use: { baseURL: 'http://localhost:5174', actionTimeout: 10000, viewport: { width: 1440, height: 1050 }, trace: 'retain-on-failure' },
  webServer: [
    { command: 'node backend/test/browser-server.js', url: 'http://localhost:4001/api/health', timeout: 60000,
      env: { FRONTEND_URL: 'http://localhost:5174', NODE_ENV: 'test' } },
    { command: 'npm run dev -w frontend -- --port 5174', url: 'http://localhost:5174', timeout: 30000,
      env: { VITE_API_URL: 'http://localhost:4001/api' } },
  ],
});
