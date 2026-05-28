import path from 'node:path';

const outputFileTracingRoot = process.env.NEXT_OUTPUT_FILE_TRACING_ROOT
  ? path.resolve(process.env.NEXT_OUTPUT_FILE_TRACING_ROOT)
  : path.join(process.cwd(), '..');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  distDir: process.env.NEXT_DIST_DIR || '.next',
  output: 'standalone',
  outputFileTracingRoot,
  eslint: {
    ignoreDuringBuilds: false
  }
};

export default nextConfig;
