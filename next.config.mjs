/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Artefacto estático em `out/` — servir com S3 + CloudFront (sem Node na AWS).
  output: "export",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
