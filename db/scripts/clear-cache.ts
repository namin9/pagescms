import { db } from '../index';
import { cacheFileTable, cachePermissionTable, configTable, cacheFileMetaTable } from '../schema';

async function clearCache() {
  console.log('Clearing cache tables (SQLite/D1)...');

  try {
    // SQLite에서는 TRUNCATE 대신 DELETE FROM을 사용합니다.
    await db.delete(cacheFileTable);
    await db.delete(cachePermissionTable);
    await db.delete(configTable);
    await db.delete(cacheFileMetaTable);

    console.log('✅ Cache tables cleared successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error clearing cache:', error);
    process.exit(1);
  }
}

clearCache();
