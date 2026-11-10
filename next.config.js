/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  async rewrites() {
    return [
      {
        source: "/api-backend/:path*",
        destination: "http://103.125.42.217:8081/api/:path*",
      },
      {
        source: "/uploads/:path*",
        destination: "http://103.125.42.217:8081/uploads/:path*",
      },
      {
        source: "/images/:path*",
        destination: "http://103.125.42.217:8081/images/:path*",
      },
    ];
  },
};

module.exports = nextConfig;