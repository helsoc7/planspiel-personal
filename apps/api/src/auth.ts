import bcrypt from "bcryptjs";
import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { SignJWT, jwtVerify } from "jose";
import { config } from "./config";
import * as repo from "./repo";

export type AuthVars = { Variables: { benutzerId: string } };

export const hash = (pw: string) => bcrypt.hash(pw, 10);
export const pruefe = (pw: string, h: string) => bcrypt.compare(pw, h);

/** Sitzung als JWT. pv = Passwortversion: Nach einer Passwortänderung sind ältere Sitzungen ungültig. */
export async function token(benutzerId: string) {
  const pv = (await repo.benutzer.sitzung(benutzerId))?.version ?? 0;
  return new SignJWT({ pv }).setProtectedHeader({ alg: "HS256" }).setSubject(benutzerId).setIssuedAt().setExpirationTime("30d").sign(config.jwtSecret);
}

export const angemeldet = createMiddleware<AuthVars>(async (c, next) => {
  const h = c.req.header("authorization");
  if (!h?.startsWith("Bearer ")) throw new HTTPException(401, { message: "Bitte anmelden" });
  let aendern = false;
  try {
    const { payload } = await jwtVerify(h.slice(7), config.jwtSecret);
    // Nach einer Passwortänderung gelten ältere Sitzungen nicht mehr
    const s = await repo.benutzer.sitzung(payload.sub as string);
    if (!s || ((payload.pv as number | undefined) ?? 0) !== s.version) throw new Error("veraltet");
    c.set("benutzerId", payload.sub as string);
    aendern = s.aendern;
  } catch {
    throw new HTTPException(401, { message: "Sitzung abgelaufen. Bitte neu anmelden." });
  }
  // Mit Einmalpasswort geht nur: eigenes Konto lesen und Passwort ändern
  if (aendern && !/\/api\/auth\/(ich|passwort)$/.test(c.req.path)) throw new HTTPException(403, { message: "Bitte lege zuerst ein eigenes Passwort fest" });
  await next();
});
