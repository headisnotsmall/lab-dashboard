/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    // 啟用 src/instrumentation.ts（自動同步排程）
    instrumentationHook: true,
  },
}

module.exports = nextConfig
