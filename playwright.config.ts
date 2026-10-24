import { defineConfig } from '@playwright/test';

export default defineConfig({
    testDir: 'tests',
    timeout: 30_000,
    use: { baseURL: 'http://127.0.0.1:5180', colorScheme: 'dark', channel: 'msedge' },
    webServer: { command: 'npm run dev', url: 'http://127.0.0.1:5180', reuseExistingServer: true, timeout: 60_000 },
});
