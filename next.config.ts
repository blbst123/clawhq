import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  // Static export — no server needed, gateway serves these files directly
};

export default nextConfig;
