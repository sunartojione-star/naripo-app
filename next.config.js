/** @type {import('next').NextConfig} */
const backendUrl = process.env.BACKEND_URL || "https://naripo-pdaren.duckdns.org";

const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  async rewrites() {
    return [
      {
        source: "/api-backend/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
      {
        source: "/uploads/:path*",
        destination: `${backendUrl}/uploads/:path*`,
      },
      {
        source: "/images/:path*",
        destination: `${backendUrl}/images/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;