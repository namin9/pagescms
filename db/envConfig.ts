import { loadEnvConfig } from "@next/env";

if (process.env.NEXT_RUNTIME !== "edge" && process.env.NODE_ENV === "development") {
  // Only call process.cwd() when we are sure we are in a Node.js development environment.
  const getProjectDir = () => process.cwd();
  loadEnvConfig(getProjectDir());
}