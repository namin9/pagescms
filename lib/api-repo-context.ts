import { createHttpError } from "@/lib/api-error";
import { getConfig } from "@/lib/config-store";
import { requireApiUserSession } from "@/lib/session-server";
import type { Config } from "@/types/config";
import type { User } from "@/types/user";

type RepoRef = {
  owner: string;
  repo: string;
  branch: string;
};

type RepoReadContext = {
  user: User;
  token: string;
  config: Config;
};

const getRepoReadContext = async ({ owner, repo, branch }: RepoRef): Promise<RepoReadContext> => {
  const sessionResult = await requireApiUserSession();
  if ("response" in sessionResult) {
    throw createHttpError("Not signed in.", sessionResult.response?.status ?? 401);
  }

  const user = sessionResult.user as any; // Better-Auth session user with tenant info
  const tenant = user.tenant;

  if (!tenant) {
    throw createHttpError("No tenant assigned to this user.", 403);
  }

  // 보안 강화: 세션의 테넌트 정보와 URL 파라미터가 일치하는지 확인
  if (tenant.owner !== owner || tenant.repo !== repo) {
    throw createHttpError("Access denied: Tenant mismatch.", 403);
  }

  const masterToken = process.env.GITHUB_MASTER_TOKEN;
  if (!masterToken) {
    throw createHttpError("Server configuration error: GITHUB_MASTER_TOKEN not set.", 500);
  }

  const config = await getConfig(owner, repo, branch, {
    getToken: async () => masterToken,
  });
  
  if (!config) throw createHttpError(`Configuration not found for ${owner}/${repo}/${branch}.`, 404);

  return { user, token: masterToken, config };
};

export { getRepoReadContext };
