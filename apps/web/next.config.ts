import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // O selo do modo dev fica no canto inferior esquerdo, sobre o avatar do Rail, e intercepta os cliques dos testes de navegador.
  devIndicators: false,
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
