"use server";

import { db } from "@/db";
import { cacheFileTable, cachePermissionTable, configTable, cacheFileMetaTable } from "@/db/schema";
import { requireAdminSession } from "@/lib/session-server";
import { revalidatePath } from "next/cache";

export async function clearCacheAction() {
  await requireAdminSession();

  try {
    // SQLite/D1에서는 TRUNCATE 대신 DELETE FROM을 사용합니다.
    await db.delete(cacheFileTable);
    await db.delete(cachePermissionTable);
    await db.delete(configTable);
    await db.delete(cacheFileMetaTable);

    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    console.error("Failed to clear cache:", error);
    throw new Error("캐시를 비우는 도중 오류가 발생했습니다.");
  }
}
