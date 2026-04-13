/**
 * Create an Octokit instance using the GITHUB_MASTER_TOKEN.
 * This ensures all GitHub interactions are proxied through a single administrative account.
 */

import { Octokit } from "@octokit/rest";

export const getMasterOctokit = () => {
  const token = process.env.GITHUB_MASTER_TOKEN;
  if (!token) {
    throw new Error("GITHUB_MASTER_TOKEN is not defined in environment variables");
  }

  return new Octokit({
    auth: token,
  });
};

/**
 * @deprecated Use getMasterOctokit instead for proxied operations.
 */
export const createOctokitInstance = (token: string, options?: any) => {
  if (!token) throw new Error("Auth token is required to initialize Octokit");

  return new Octokit({
    ...options,
    auth: token,
  });
};
