/** @type {import('next').NextConfig} */
const nextConfig = {
  // Izinkan impor modul TS dari ../shared (di luar folder app).
  experimental: { externalDir: true },
};

export default nextConfig;
