import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { logger } from "hono/logger";
import { auth } from "./routes/auth";
import { kurse } from "./routes/kurse";
import { spiele } from "./routes/spiele";

export const app = new Hono()
  .use(cors())
  .use(process.env.NODE_ENV === "test" ? async (_c, n) => n() : logger())
  .get("/api/gesund", (c) => c.json({ ok: true }))
  .route("/api/auth", auth)
  .route("/api/spiele", spiele)
  .route("/api/kurse", kurse);

app.onError((err, c) => {
  if (err instanceof HTTPException) return c.json({ fehler: err.message }, err.status);
  if ((err as { status?: number }).status === 400) return c.json({ fehler: "Ungültige Eingabe" }, 400);
  console.error(err);
  return c.json({ fehler: "Interner Fehler" }, 500);
});
