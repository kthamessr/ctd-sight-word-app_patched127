import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: 'export', // Enable static HTML export for GitHub Pages
  basePath: process.env.NODE_ENV === 'production' ? '/ctd-sight-word-app' : '', // basePath only for GitHub Pages in production
  images: {
    unoptimized: true, // Required for static export
  },
  reactCompiler: false, // Disabled to allow build with setState-in-effect patterns
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
