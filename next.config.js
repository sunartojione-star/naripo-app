// /** @type {import('next').NextConfig} */
// const nextConfig = {
//   reactStrictMode: true,
//   images: {
//     domains: [
//       'localhost',
//       'via.placeholder.com',
//       'api.example.com',
//       'localhost:8081',
//       '127.0.0.1:8081',
//     ],
//     unoptimized: process.env.NODE_ENV === 'development', // Disable optimization in dev
//   },
//   env: {
//     NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081/api',
//   },
// };

// module.exports = nextConfig;

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
        protocol: "https",
        hostname: "via.placeholder.com",
      },
      {
        protocol: "https",
        hostname: "api.example.com",
      },
    ],
    unoptimized: process.env.NODE_ENV === "development",
  },
  env: {
    NEXT_PUBLIC_API_URL:
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081/api",
  },
};

module.exports = nextConfig; // Sesuaikan dengan module.exports = nextConfig;
