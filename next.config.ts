import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  // No basePath — gateway serves this at root via controlUi.root
};

export default nextConfig;
