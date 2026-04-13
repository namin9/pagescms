"use server";

import { db } from "@/db";
import { tenantTable, userTable } from "@/db/schema";
import { getServerSession } from "@/lib/session-server";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { desc, eq } from "drizzle-orm";

/**
 * 어드민 권한 체크 헬퍼
 */
async function ensureAdmin() {
  const session = await getServerSession();
  const adminEmails = (process.env.ADMIN_EMAILS || "").split(",").map(e => e.trim());
  
  if (!session?.user?.email || !adminEmails.includes(session.user.email)) {
    throw new Error("접근 권한이 없습니다.");
  }
}

/**
 * 모든 테넌트 조회
 */
export async function getTenantsAction() {
  await ensureAdmin();
  return await db.select().from(tenantTable).orderBy(desc(tenantTable.createdAt));
}

/**
 * 새 테넌트(고객사) 등록
 */
export async function createTenantAction(data: {
  name: string;
  githubOwner: string;
  githubRepo: string;
  githubBranch: string;
}) {
  await ensureAdmin();

  const id = crypto.randomUUID();
  await db.insert(tenantTable).values({
    id,
    name: data.name,
    githubOwner: data.githubOwner,
    githubRepo: data.githubRepo,
    githubBranch: data.githubBranch,
  });

  revalidatePath("/super-admin");
  return { success: true };
}

/**
 * 모든 유저 조회 (테넌트 정보 포함)
 */
export async function getUsersAction() {
  await ensureAdmin();
  
  const users = await db.select({
    id: userTable.id,
    name: userTable.name,
    email: userTable.email,
    tenantId: userTable.tenantId,
    createdAt: userTable.createdAt,
    tenantName: tenantTable.name,
  })
  .from(userTable)
  .leftJoin(tenantTable, eq(userTable.tenantId, tenantTable.id));
  
  // 클라이언트에서 tenant.name으로 접근하므로 구조를 맞춰줌
  return users.map(u => ({
    ...u,
    tenant: u.tenantName ? { name: u.tenantName } : null
  }));
}

/**
 * 고객사 관리자 계정 생성
 */
export async function createUserAction(data: {
  email: string;
  name: string;
  password: string;
  tenantId: string;
}) {
  await ensureAdmin();

  // Better-Auth API를 사용하여 유저 생성 (비밀번호 자동 해싱)
  // user.additionalFields에 tenantId가 등록되어 있어야 함
  const result = await auth.api.signUpEmail({
    body: {
      email: data.email,
      password: data.password,
      name: data.name,
      tenantId: data.tenantId, // schema.ts에 추가한 tenantId
    },
  });

  if (!result) {
    throw new Error("유저 생성에 실패했습니다.");
  }

  revalidatePath("/super-admin");
  return { success: true };
}
