/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  async rewrites() {
    return [
      // 1. Jembatan API Backend
      {
        source: "/api-backend/:path*",
        destination: "http://103.125.42.217:8081/api/:path*",
      },
      // 2. Jembatan Gambar Uploads agar aman di HTTPS
      {
        source: "/uploads/:path*",
        destination: "http://103.125.42.217:8081/uploads/:path*",
      },
      // 3. Jembatan Gambar Images
      {
        source: "/images/:path*",
        destination: "http://103.125.42.217:8081/images/:path*",
      },
    ];
  },
};

module.exports = nextConfig;