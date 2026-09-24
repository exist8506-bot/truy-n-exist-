import { defineConfig } from '@playwright/test';
export default defineConfig({
  timeout:90000,
  workers:1,
  use:{baseURL:'http://127.0.0.1:8787',headless:true},
  webServer:{command:'node server/server.js',url:'http://127.0.0.1:8787/api/v1/health',reuseExistingServer:false,timeout:120000}
});
