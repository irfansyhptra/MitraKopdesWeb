/** @type {import('next').NextConfig} */
const nextConfig = {
  // Izinkan impor modul TS dari ../shared (di luar folder app).
  // Pemeriksa berbasis API menghindari keluaran `tsc --showConfig` yang
  // terpotong ketika proses build berjalan di container CI.
  experimental: { externalDir: true, useTypeScriptCli: false },
};

export default nextConfig;
