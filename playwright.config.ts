import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir:"./e2e",
  fullyParallel:true,
  retries:process.env.CI?1:0,
  workers:process.env.CI?1:undefined,
  reporter:process.env.CI?"github":"list",
  use:{baseURL:"http://127.0.0.1:3000",trace:"retain-on-failure",...devices["iPhone 15"]},
  webServer:{command:"npm run dev -- --hostname 127.0.0.1",url:"http://127.0.0.1:3000/demo?role=parent&section=today",reuseExistingServer:!process.env.CI,timeout:120000},
});
