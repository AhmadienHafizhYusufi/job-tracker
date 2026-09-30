import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Menghasilkan server mandiri yang ringan untuk image Docker
  output: "standalone",
};

export default nextConfig;
