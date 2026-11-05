import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { angemeldet, hash, pruefe, token, type AuthVars } from "../auth";
import * as repo from "../repo";
import { registrieren } from "../services/kurs";

export const auth = new Hono<AuthVars>()
  .post("/registrieren", zValidator("json", z.object({
    code: z.string().trim().min(4).max(20), email: z.string().email(), name: z.string().trim().min(2).max(80), passwort: z.string().min(8),
  })), async (c) => {
    const r = await registrieren(c.req.valid("json"));
    return c.json({ token: await token(r.benutzer.id), benutzer: r.benutzer, kursId: r.kursId, rolle: r.rolle }, 201);
  })
  .post("/anmelden", zValidator("json", z.object({ email: z.string(), passwort: z.string() })), async (c) => {
    const d = c.req.valid("json");
    const b = await repo.benutzer.perEmail(d.email);
    if (!b || !(await pruefe(d.passwort, b.passwort_hash))) throw new HTTPException(401, { message: "E-Mail oder Passwort falsch" });
    const { passwort_hash: _h, ...benutzer } = b;
    return c.json({ token: await token(b.id), benutzer });
  })
  /** Eigenes Passwort ändern. Pflicht nach einem Einmalpasswort. Gibt eine neue Sitzung zurück. */
  .post("/passwort", angemeldet, zValidator("json", z.object({ aktuell: z.string(), neu: z.string().min(8).max(200) })), async (c) => {
    const d = c.req.valid("json");
    const b = await repo.benutzer.mitHash(c.get("benutzerId"));
    if (!b || !(await pruefe(d.aktuell, b.passwort_hash))) throw new HTTPException(400, { message: "Das aktuelle Passwort stimmt nicht" });
    if (d.aktuell === d.neu) throw new HTTPException(400, { message: "Das neue Passwort muss sich vom alten unterscheiden" });
    await repo.benutzer.passwortSetzen(b.id, await hash(d.neu), false);
    return c.json({ token: await token(b.id), benutzer: (await repo.benutzer.perId(b.id))! });
  })
  .get("/ich", angemeldet, async (c) => {
    const b = await repo.benutzer.perId(c.get("benutzerId"));
    if (!b) throw new HTTPException(401, { message: "Bitte anmelden" });
    return c.json(b);
  });
