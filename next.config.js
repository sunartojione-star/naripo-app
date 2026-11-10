/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "8081",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "8081",
      },
      {
        protocol: "http",
        hostname: "103.125.42.217",
        port: "8081",
      },
      {
        protocol: "https",
        hostname: "via.placeholder.com",
      },
      {
        protocol: "https",
        hostname: "api.example.com",
      },
    ],
    unoptimized: true,
  },
  // Proxy jembatan agar tidak diblokir browser (Mixed Content)
  async rewrites() {
    return [
      {
        source: "/api-backend/:path*",
        destination: "http://103.125.42.217:8081/api/:path*",
      },
    ];
  },
};

module.exports = nextConfig;