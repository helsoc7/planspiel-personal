import pg from "pg";
import { config } from "../config";

// numeric als Zahl lesen
pg.types.setTypeParser(1700, (v) => Number(v));
pg.types.setTypeParser(1082, (v) => v);

export const pool = new pg.Pool({ connectionString: config.databaseUrl });

export async function q<T = Record<string, unknown>>(sql: string, params: unknown[] = []) {
  const r = await pool.query(sql, params);
  return r.rows as T[];
}

export async function tx<T>(fn: (c: pg.PoolClient) => Promise<T>) {
  const c = await pool.connect();
  try {
    await c.query("begin");
    const out = await fn(c);
    await c.query("commit");
    return out;
  } catch (e) {
    await c.query("rollback");
    throw e;
  } finally {
    c.release();
  }
}
