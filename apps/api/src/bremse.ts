import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";

/**
 * Einfache Bremse gegen das Durchprobieren von Codes und Passwörtern:
 * höchstens `max` fehlgeschlagene Versuche je IP-Adresse in `fensterMs`.
 * Liegt im Speicher und reicht für einen einzelnen Server.
 */
export function bremse(max = 20, fensterMs = 10 * 60_000) {
  const fehl = new Map<string, number[]>();
  return createMiddleware(async (c, next) => {
    if (process.env.NODE_ENV === "test") return next();
    const ip = c.req.header("x-forwarded-for")?.split(",")[0].trim() || c.req.header("x-real-ip") || "lokal";
    const jetzt = Date.now();
    const liste = (fehl.get(ip) ?? []).filter((t) => jetzt - t < fensterMs);
    if (liste.length >= max) throw new HTTPException(429, { message: "Zu viele Versuche. Bitte in ein paar Minuten noch einmal." });
    await next();
    if (c.res.status === 401 || c.res.status === 404 || c.res.status === 409) { liste.push(jetzt); fehl.set(ip, liste); }
  });
}
