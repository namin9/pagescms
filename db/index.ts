import "./envConfig";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

/**
 * Cloudflare D1 Database adapter for Drizzle.
 * Ensure you have defined a 'DB' binding in your Cloudflare Pages/Workers settings.
 */

const getDb = () => {
  // Cloudflare Pages/Workers environment
  const runtimeDb = (process.env as any).DB;
  
  if (!runtimeDb) {
    throw new Error("D1 binding 'DB' not found. Please configure it in your Cloudflare project settings.");
  }

  return drizzle(runtimeDb, { schema });
};

export const db = getDb();
