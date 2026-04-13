import { loadEnvConfig } from "@next/env";
 
if (process.env.NEXT_RUNTIME !== "edge" && process.env.NODE_ENV !== "production") {
  const projectDir = process.cwd();
  loadEnvConfig(projectDir);
}