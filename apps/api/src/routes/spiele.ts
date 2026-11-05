import { Hono } from "hono";
import type { SpielpaketKurz } from "@planspiel/core";
import { angemeldet, type AuthVars } from "../auth";
import * as repo from "../repo";
import { registry } from "../spiele";

export const spiele = new Hono<AuthVars>().use(angemeldet).get("/", async (c) => {
  const liste: SpielpaketKurz[] = (await repo.spielpakete.liste()).map((p) => ({
    id: p.id, version: p.version, name: p.name, thema: p.inhalt.thema, status: p.status as SpielpaketKurz["status"],
    runden: p.inhalt.runden.length, akteure: p.inhalt.akteure.length, begriffAkteure: p.inhalt.begriffe.akteure,
    fabrik: p.inhalt.fabrik, spielbar: registry.typen().includes(p.inhalt.fabrik),
  }));
  return c.json(liste);
});
