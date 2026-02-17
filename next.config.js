/** @type {import("next").NextConfig} */
const nextConfig = {
  // SECURITY: Credentials moved to environment variables.
  // Never hardcode credentials in config files.
  // All environment variables are loaded from .env.local (gitignored).

  // Fix Turbopack workspace-root inference issues (common on Windows with multiple lockfiles).
  // Forces Turbopack to treat this repository as the root so it can resolve `next` reliably.
  turbopack: {
    root: __dirname,
  },
};

module.exports = nextConfig;
