/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      allowedOrigins: ["*.app.github.dev", "localhost:3000"],
    },
  },
};

module.exports = nextConfig;
