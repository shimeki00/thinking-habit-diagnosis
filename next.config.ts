import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // 親ディレクトリの別lockfileを誤検出しないよう、トレースルートをこのプロジェクトに固定
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
