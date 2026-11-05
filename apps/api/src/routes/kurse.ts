import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { angemeldet, type AuthVars } from "../auth";
import * as s from "../services/kurs";

const nr = z.object({ id: z.string().uuid(), nr: z.coerce.number().int().min(0) });
const entscheidung = z.object({
  option: z.string().optional(),
  zusatz: z.array(z.string()).max(20),
  partner: z.record(z.string().uuid()).optional(),
});

export const kurse = new Hono<AuthVars>()
  .use(angemeldet)
  .get("/", async (c) => c.json(await s.meineKurse(c.get("benutzerId"))))
  .post("/", zValidator("json", z.object({
    name: z.string().min(2).max(120), spielId: z.string(), spielVersion: z.number().int(),
    beginn: z.string().optional(), ende: z.string().optional(),
  })), async (c) => c.json(await s.kursAnlegen(c.get("benutzerId"), c.req.valid("json")), 201))
  .post("/beitreten", zValidator("json", z.object({ code: z.string().trim().min(4).max(20) })), async (c) =>
    c.json(await s.beitreten(c.get("benutzerId"), c.req.valid("json").code)))
  .post("/:id/mitglieder/:uid/passwort", zValidator("param", z.object({ id: z.string().uuid(), uid: z.string().uuid() })), async (c) => {
    const p = c.req.valid("param");
    return c.json(await s.passwortZuruecksetzen(p.id, c.get("benutzerId"), p.uid));
  })
  .post("/:id/codes", zValidator("json", z.object({ art: z.enum(["teilnehmer", "leitung"]), aktion: z.enum(["neu", "sperren"]) })), async (c) => {
    const d = c.req.valid("json");
    return c.json(await s.codeAendern(c.req.param("id"), c.get("benutzerId"), d.art, d.aktion));
  })
  .get("/:id", async (c) => c.json(await s.kursDaten(c.req.param("id"), c.get("benutzerId"))))
  .get("/:id/spiel", async (c) => c.json(await s.spielFuerKurs(c.req.param("id"), c.get("benutzerId"))))
  .get("/:id/ergebnisse", async (c) => c.json(await s.ergebnisse(c.req.param("id"), c.get("benutzerId"), c.req.query("vorschau") === "1")))
  .post("/:id/gruppen", zValidator("json", z.object({ name: z.string().min(1).max(60), akteur: z.string() })), async (c) => {
    const d = c.req.valid("json");
    return c.json(await s.gruppeAnlegen(c.req.param("id"), c.get("benutzerId"), d.name, d.akteur), 201);
  })
  .delete("/:id/gruppen/:gid", async (c) => {
    await s.gruppeLoeschen(c.req.param("id"), c.get("benutzerId"), c.req.param("gid"));
    return c.body(null, 204);
  })
  .patch("/:id/mitglieder/:uid", zValidator("json", z.object({ gruppeId: z.string().uuid().nullable() })), async (c) => {
    await s.mitgliedZuordnen(c.req.param("id"), c.get("benutzerId"), c.req.param("uid"), c.req.valid("json").gruppeId);
    return c.body(null, 204);
  })
  .post("/:id/runden/:nr/status", zValidator("param", nr), zValidator("json", z.object({ status: z.enum(["gesperrt", "offen", "geschlossen", "ausgewertet"]) })), async (c) => {
    const p = c.req.valid("param");
    await s.rundeStatusSetzen(p.id, c.get("benutzerId"), p.nr, c.req.valid("json").status);
    return c.body(null, 204);
  })
  .put("/:id/runden/:nr/abgabe", zValidator("param", nr), zValidator("json", z.object({
    entscheidung, begruendung: z.string().max(5000), abgeben: z.boolean(),
  })), async (c) => {
    const p = c.req.valid("param");
    return c.json(await s.abgabeSpeichern(p.id, c.get("benutzerId"), p.nr, c.req.valid("json")));
  })
  .patch("/:id/abgaben/:aid", zValidator("json", z.object({ status: z.enum(["freigegeben", "zurueckgegeben"]) })), async (c) => {
    await s.abgabeStatusSetzen(c.req.param("id"), c.get("benutzerId"), c.req.param("aid"), c.req.valid("json").status);
    return c.body(null, 204);
  })
  .put("/:id/runden/:nr/bewertungen/:gid", zValidator("param", nr.extend({ gid: z.string().uuid() })), zValidator("json", z.object({
    wurf: z.number().int().nullable(), punkte: z.number().min(0).max(10),
    korrektur: z.record(z.number()).optional(), kommentar: z.string().max(2000).optional(),
  })), async (c) => {
    const p = c.req.valid("param");
    await s.bewerten(p.id, c.get("benutzerId"), p.nr, p.gid, c.req.valid("json"));
    return c.body(null, 204);
  })
  .post("/:id/runden/:nr/wuerfeln", zValidator("param", nr), async (c) => {
    const p = c.req.valid("param");
    await s.wuerfeln(p.id, c.get("benutzerId"), p.nr);
    return c.body(null, 204);
  });
