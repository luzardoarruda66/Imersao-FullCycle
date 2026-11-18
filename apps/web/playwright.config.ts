import { defineConfig, devices } from "@playwright/test";

// Roda no serviço `e2e` do Compose (LLD, seção 10), contra o `web` e a `chat-api` de pé.
// O Chromium enxerga `localhost` como o contêiner `web`: o cookie `Secure` da sessão só vale em `localhost` ou HTTPS.
export default defineConfig({
  testDir: "./e2e",
  workers: 1,
  fullyParallel: false,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3000",
    launchOptions: { args: ["--host-resolver-rules=MAP localhost web"] },
    trace: "retain-on-failure",
  },
  projects: [
    { name: "principal", use: { ...devices["Desktop Chrome"] }, testIgnore: /api-parada/ },
    // Roda com a `chat-api` parada: `scripts/e2e.sh` a para e sobe de novo.
    { name: "api-parada", use: { ...devices["Desktop Chrome"] }, testMatch: /api-parada\.spec\.ts/ },
  ],
});
