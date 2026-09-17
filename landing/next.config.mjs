/** @type {import('next').NextConfig} */
const nextConfig = {
  // Landing sepenuhnya statis (SSG) — bisa di-host di CDN mana pun.
  output: 'export',
  images: { unoptimized: true },
};

export default nextConfig;
