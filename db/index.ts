import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const url = process.env.DATABASE_URL || "postgresql://invalid:invalid@127.0.0.1:1/invalid";
export const pool = new Pool({ connectionString: url, max: 5, ssl: url.includes("localhost") || url.includes("127.0.0.1") ? undefined : { rejectUnauthorized: false } });
export const db = drizzle(pool);
