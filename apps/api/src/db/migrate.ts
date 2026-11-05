import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "./pool";

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../migrations");

export async function migrate() {
  await pool.query("create table if not exists _migrationen (name text primary key, am timestamptz default now())");
  const done = new Set((await pool.query("select name from _migrationen")).rows.map((r) => r.name));
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".sql")).sort()) {
    if (done.has(f)) continue;
    await pool.query("begin");
    try {
      await pool.query(fs.readFileSync(path.join(dir, f), "utf8"));
      await pool.query("insert into _migrationen(name) values ($1)", [f]);
      await pool.query("commit");
      console.log(`Migration ${f} ausgeführt`);
    } catch (e) {
      await pool.query("rollback");
      throw e;
    }
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  migrate().then(() => pool.end());
}
