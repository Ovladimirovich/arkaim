import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      // Проксируем API-запросы на бэкенд
      {
        source: '/api/:path*',
        destination: 'http://localhost:8642/:path*',
      },
      // Проксируем auth-запросы
      {
        source: '/auth/:path*',
        destination: 'http://localhost:8642/auth/:path*',
      },
      // Проксируем book-запросы
      {
        source: '/book/:path*',
        destination: 'http://localhost:8642/book/:path*',
      },
      // Проксируем xray-запросы
      {
        source: '/xray/:path*',
        destination: 'http://localhost:8642/xray/:path*',
      },
    ];
  },
};

export default nextConfig;
