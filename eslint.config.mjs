import nextConfig from "eslint-config-next";

const config = [
  ...nextConfig,
  {
    ignores: ["drizzle/**"],
  },
];

export default config;
