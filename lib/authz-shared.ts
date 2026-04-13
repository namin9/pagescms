import type { User } from "@/types/user";

// UserLike 타입을 더 유연하게 정의 (Better-Auth 유저 객체 포함)
type UserLike = (Partial<User> & { tenantId?: string | null }) | null | undefined;

/**
 * 기존: GitHub 계정으로 로그인했는지 확인
 * 변경: GitHub 계정 또는 테넌트 관리자로 로그인했는지 확인
 */
const hasGithubIdentity = (user: UserLike): boolean => {
  return Boolean(user?.githubUsername || user?.tenantId);
};

const assertGithubIdentity = (
  user: UserLike,
  message = "이 작업을 수행할 권한이 없습니다.",
) => {
  if (!hasGithubIdentity(user)) {
    throw new Error(message);
  }
};

export { hasGithubIdentity, assertGithubIdentity };
