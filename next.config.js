/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: __dirname,
  },
  // ⚠️ SECURITY: Credentials moved to environment variables
  // Never hardcode credentials in config files
  // All environment variables are now loaded from .env.local (gitignored)
};

module.exports = nextConfig;
