import nextConfig from "eslint-config-next";

const config = [
  ...nextConfig,
  {
    ignores: ["drizzle/**", ".pglite/**"],
  },
];

export default config;
