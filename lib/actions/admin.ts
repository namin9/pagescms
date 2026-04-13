"use server";

import { db } from "@/db";
import { cacheFileTable, cachePermissionTable, configTable, cacheFileMetaTable, sessionTable } from "@/db/schema";
import { requireAdminSession } from "@/lib/admin";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

/**
 * 모든 유저 로그아웃 (모든 세션 삭제)
 */
export async function logoutAllUsers() {
  const sessionResult = await requireAdminSession();
  if ("response" in sessionResult) return sessionResult.response;

  try {
    await db.delete(sessionTable);
    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    console.error("Failed to logout all users:", error);
    throw new Error("모든 유저 로그아웃 처리 중 오류가 발생했습니다.");
  }
}

/**
 * 특정 유저 로그아웃 (해당 유저의 모든 세션 삭제)
 */
export async function logoutUserSessions(userId: string) {
  const sessionResult = await requireAdminSession();
  if ("response" in sessionResult) return sessionResult.response;

  try {
    await db.delete(sessionTable).where(eq(sessionTable.userId, userId));
    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    console.error("Failed to logout user sessions:", error);
    throw new Error("유저 로그아웃 처리 중 오류가 발생했습니다.");
  }
}

/**
 * 글로벌 캐시 초기화 (기존 clearCacheAction과 동일)
 */
export async function resetGlobalCache() {
  const sessionResult = await requireAdminSession();
  if ("response" in sessionResult) return sessionResult.response;

  try {
    await db.delete(cacheFileTable);
    await db.delete(cachePermissionTable);
    await db.delete(configTable);
    await db.delete(cacheFileMetaTable);

    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    console.error("Failed to reset global cache:", error);
    throw new Error("캐시 초기화 중 오류가 발생했습니다.");
  }
}

/**
 * 기존 코드와의 호환성을 위한 별칭
 */
export const clearCacheAction = resetGlobalCache;
