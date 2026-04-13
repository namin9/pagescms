import "./envConfig";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

/**
 * Cloudflare D1 Database adapter for Drizzle.
 * 
 * 빌드 타임에는 D1 바인딩이 없으므로, 에러를 던지는 대신 
 * 런타임에 실제 DB 요청이 들어올 때만 초기화되도록 Proxy를 사용합니다.
 */

const createDbProxy = () => {
  let _db: any = null;

  return new Proxy({} as any, {
    get(target, prop, receiver) {
      if (!_db) {
        const runtimeDb = (process.env as any).DB;
        if (!runtimeDb) {
          // 빌드 중에는 에러를 내지 않고 빈 객체처럼 행동하게 하여 컴파일 에러를 방지합니다.
          if (process.env.NEXT_RUNTIME === 'nodejs' || typeof (process.env as any).DB === 'undefined') {
             return undefined;
          }
          throw new Error("D1 binding 'DB' not found. Please configure it in your Cloudflare project settings.");
        }
        _db = drizzle(runtimeDb, { schema });
      }
      
      const value = Reflect.get(_db, prop, receiver);
      return typeof value === 'function' ? value.bind(_db) : value;
    }
  });
};

export const db = createDbProxy();
