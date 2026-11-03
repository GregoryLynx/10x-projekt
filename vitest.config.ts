/// <reference types="vitest/config" />
import { getViteConfig } from "astro/config";

// Astro's config merge skips null, so a no-op adapter replaces the Cloudflare hooks.
const omitCloudflareAdapter = () => undefined;

// Vite's resolved env sets BASE_URL to the app base "/". Keep the preview origin the shell passed in.
const previewOrigin = process.env.BASE_URL;
const resolvedPreviewOrigin = previewOrigin && !previewOrigin.startsWith("/") ? previewOrigin : "http://localhost:4321";

export default getViteConfig(
  {
    test: {
      environment: "node",
      include: ["tests/**/*.test.ts"],
      env: {
        PREVIEW_ORIGIN: resolvedPreviewOrigin,
      },
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
