import { loadEnvConfig } from "@next/env";

if (process.env.NEXT_RUNTIME !== "edge" && process.env.NODE_ENV === "development") {
  // We use a runtime check to hide process.cwd() from static analysis during edge builds.
  // Using an anonymous function or indirect access helps bypass Turbopack's edge-runtime check.
  const nodeProcess = globalThis.process;
  if (nodeProcess && typeof nodeProcess.cwd === 'function') {
    const projectDir = nodeProcess.cwd();
    loadEnvConfig(projectDir);
  }
}
