import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { angemeldet, hash, pruefe, token, type AuthVars } from "../auth";
import * as repo from "../repo";

export const auth = new Hono<AuthVars>()
  .post("/registrieren", zValidator("json", z.object({ email: z.string().email(), name: z.string().min(2).max(80), passwort: z.string().min(8) })), async (c) => {
    const d = c.req.valid("json");
    if (await repo.benutzer.perEmail(d.email)) throw new HTTPException(409, { message: "Diese E-Mail ist schon registriert" });
    const b = await repo.benutzer.anlegen(d.email, d.name, await hash(d.passwort));
    return c.json({ token: await token(b.id), benutzer: b }, 201);
  })
  .post("/anmelden", zValidator("json", z.object({ email: z.string(), passwort: z.string() })), async (c) => {
    const d = c.req.valid("json");
    const b = await repo.benutzer.perEmail(d.email);
    if (!b || !(await pruefe(d.passwort, b.passwort_hash))) throw new HTTPException(401, { message: "E-Mail oder Passwort falsch" });
    return c.json({ token: await token(b.id), benutzer: { id: b.id, email: b.email, name: b.name } });
  })
  .get("/ich", angemeldet, async (c) => {
    const b = await repo.benutzer.perId(c.get("benutzerId"));
    if (!b) throw new HTTPException(401, { message: "Bitte anmelden" });
    return c.json(b);
  });
