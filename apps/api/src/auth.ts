import bcrypt from "bcryptjs";
import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { SignJWT, jwtVerify } from "jose";
import { config } from "./config";

export type AuthVars = { Variables: { benutzerId: string } };

export const hash = (pw: string) => bcrypt.hash(pw, 10);
export const pruefe = (pw: string, h: string) => bcrypt.compare(pw, h);

export async function token(benutzerId: string) {
  return new SignJWT({}).setProtectedHeader({ alg: "HS256" }).setSubject(benutzerId).setIssuedAt().setExpirationTime("30d").sign(config.jwtSecret);
}

export const angemeldet = createMiddleware<AuthVars>(async (c, next) => {
  const h = c.req.header("authorization");
  if (!h?.startsWith("Bearer ")) throw new HTTPException(401, { message: "Bitte anmelden" });
  try {
    const { payload } = await jwtVerify(h.slice(7), config.jwtSecret);
    c.set("benutzerId", payload.sub as string);
  } catch {
    throw new HTTPException(401, { message: "Sitzung abgelaufen" });
  }
  await next();
});
