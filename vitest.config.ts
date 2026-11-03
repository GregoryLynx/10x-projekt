/// <reference types="vitest/config" />
import { getViteConfig } from "astro/config";

// Astro's config merge skips null, so a no-op adapter replaces the Cloudflare hooks.
const omitCloudflareAdapter = () => undefined;

export default getViteConfig(
  {
    test: {
      environment: "node",
      include: ["tests/**/*.test.ts"],
    },
  },
  {
    adapter: {
      name: "vitest-no-adapter",
      hooks: {
        "astro:config:setup": omitCloudflareAdapter,
        "astro:routes:resolved": omitCloudflareAdapter,
        "astro:config:done": omitCloudflareAdapter,
        "astro:build:setup": omitCloudflareAdapter,
        "astro:build:start": omitCloudflareAdapter,
        "astro:build:done": omitCloudflareAdapter,
      },
    },
  },
);
