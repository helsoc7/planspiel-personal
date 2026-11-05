/**
 * Spielablauf: Rechte, Regeln des Rundenablaufs und Berechnung.
 * Kennt kein konkretes Spiel, sondern nur das Regelwerk aus der Fabrik.
 */
import { randomInt, randomBytes } from "node:crypto";
import {
  erlaubterUebergang, type AbgabeEingabe, type AbgabeStatus, type BewertungEingabe, type Entscheidung, type ErgebnisDto,
  type GruppenEntscheidung, type KursDaten, type KursKurz, type RundenEingabe, type RundenStatus,
} from "@planspiel/core";
import * as repo from "../repo";
import { konflikt, nichtGefunden, ungueltig, verboten } from "../fehler";
import { paket, spiel } from "../spiele";

async function zugang(kursId: string, benutzerId: string) {
  const kurs = await repo.kurse.perId(kursId).catch(() => undefined);
  if (!kurs) throw nichtGefunden("Kurs nicht gefunden");
  const m = await repo.mitglieder.von(kursId, benutzerId);
  if (!m) throw verboten("Du bist nicht in diesem Kurs");
  return { kurs, rolle: m.rolle, gruppeId: m.gruppe_id };
}

async function nurLeitung(kursId: string, benutzerId: string) {
  const z = await zugang(kursId, benutzerId);
  if (z.rolle !== "leitung") throw verboten("Nur für die Spielleitung");
  return z;
}

export async function meineKurse(benutzerId: string): Promise<KursKurz[]> {
  return (await repo.kurse.vonBenutzer(benutzerId)).map((k) => ({
    id: k.id, name: k.name, code: k.code, spielId: k.spiel_id, spielVersion: k.spiel_version, spielName: k.spiel_name,
    rolle: k.rolle, beginn: k.beginn, ende: k.ende, aktuelleRunde: k.aktuelle_runde, rundenGesamt: k.runden_gesamt,
  }));
}

export async function kursAnlegen(benutzerId: string, d: { name: string; spielId: string; spielVersion: number; beginn?: string; ende?: string }) {
  const p = await paket(d.spielId, d.spielVersion).catch(() => { throw ungueltig("Spielpaket nicht gefunden"); });
  const code = randomBytes(3).toString("hex").toUpperCase();
  const k = await repo.kurse.anlegen({ ...d, code, von: benutzerId, runden: p.runden.length });
  return { id: k.id, code: k.code };
}

export async function beitreten(benutzerId: string, code: string) {
  const k = await repo.kurse.perCode(code.trim());
  if (!k) throw nichtGefunden("Kein Kurs mit diesem Code");
  await repo.mitglieder.beitreten(k.id, benutzerId);
  return { id: k.id };
}

export async function spielFuerKurs(kursId: string, benutzerId: string) {
  const { kurs, rolle } = await zugang(kursId, benutzerId);
  const { oeffentlich } = await import("@planspiel/core");
  const p = await paket(kurs.spiel_id, kurs.spiel_version);
  return rolle === "leitung" ? p : oeffentlich(p);
}

/** Berechnet alle Gruppen. vorschau: laufende Runde schon einrechnen (nur Spielleitung). */
async function berechne(kursId: string, vorschau: boolean) {
  const kurs = (await repo.kurse.perId(kursId))!;
  const sp = await spiel(kurs.spiel_id, kurs.spiel_version);
  const [gruppen, runden, abgaben, bewertungen] = await Promise.all([
    repo.gruppen.liste(kursId), repo.runden.liste(kursId), repo.abgaben.liste(kursId), repo.bewertungen.liste(kursId),
  ]);
  const zaehlt = (st: RundenStatus) => st === "ausgewertet" || (vorschau && st !== "gesperrt");
  const eingaben = new Map<string, RundenEingabe[]>(gruppen.map((g) => [g.id, []]));
  for (const r of runden) {
    const z = zaehlt(r.status);
    const ents: GruppenEntscheidung[] = gruppen.map((g) => {
      const a = abgaben.find((x) => x.gruppeId === g.id && x.runde === r.nr);
      const nutzen = z && a && (a.status === "abgegeben" || a.status === "freigegeben" || (vorschau && a.status === "entwurf"));
      return { gruppeId: g.id, akteur: g.akteur, entscheidung: nutzen ? a!.entscheidung : { zusatz: [] } };
    });
    const bereinigt = sp.regelwerk.bereinigeRunde(ents);
    for (const g of gruppen) {
      const b = bewertungen.find((x) => x.gruppeId === g.id && x.runde === r.nr);
      eingaben.get(g.id)!.push({
        entscheidung: bereinigt.get(g.id)!,
        bewertung: z && b ? { wurf: b.wurf, punkte: b.punkte, korrektur: b.korrektur } : { wurf: null, punkte: 0 },
      });
    }
  }
  let bisRunde = -1;
  for (const r of runden) if (zaehlt(r.status)) bisRunde = Math.max(bisRunde, r.nr);
  const verlauf = gruppen.map((g) => ({ g, alle: sp.regelwerk.simuliere(g.akteur, eingaben.get(g.id)!) }));
  return { sp, gruppen, runden, bisRunde, verlauf };
}

export async function ergebnisse(kursId: string, benutzerId: string, vorschau: boolean): Promise<ErgebnisDto> {
  const z = await zugang(kursId, benutzerId);
  const { sp, bisRunde, verlauf } = await berechne(kursId, vorschau && z.rolle === "leitung");
  const stand = verlauf.map(({ g, alle }) => ({ akteur: g.akteur, ergebnisse: alle }));
  return {
    bisRunde,
    gruppen: verlauf.map(({ g, alle }) => ({ gruppeId: g.id, akteur: g.akteur, start: sp.regelwerk.startwerte(g.akteur), verlauf: alle.slice(0, bisRunde + 1) })),
    ziel: sp.regelwerk.pruefeZiel(stand, bisRunde),
  };
}

async function rahmen(kursId: string, gruppeId: string, runde: number) {
  const { verlauf } = await berechne(kursId, false);
  const v = verlauf.find((x) => x.g.id === gruppeId);
  const r = v?.alle[runde];
  if (!r) return null;
  return Object.fromEntries(Object.entries(r.ressourcen).map(([k, s]) => [k, s.verfuegbar]));
}

export async function kursDaten(kursId: string, benutzerId: string): Promise<KursDaten> {
  const z = await zugang(kursId, benutzerId);
  const leitung = z.rolle === "leitung";
  const [kurse, gruppen, mitglieder, runden] = await Promise.all([
    meineKurse(benutzerId), repo.gruppen.liste(kursId), repo.mitglieder.liste(kursId), repo.runden.liste(kursId),
  ]);
  const ausgewertetBis = Math.max(-1, ...runden.filter((r) => r.status === "ausgewertet").map((r) => r.nr));
  const offen = runden.find((r) => r.status === "offen");
  const abgaben = leitung ? await repo.abgaben.liste(kursId) : z.gruppeId ? await repo.abgaben.liste(kursId, z.gruppeId) : [];
  const bewertungen = leitung ? await repo.bewertungen.liste(kursId) : z.gruppeId ? await repo.bewertungen.liste(kursId, z.gruppeId, ausgewertetBis) : [];
  return {
    kurs: kurse.find((k) => k.id === kursId)!,
    ich: { benutzerId, rolle: z.rolle, gruppeId: z.gruppeId },
    gruppen, runden, abgaben, bewertungen,
    // Teilnehmende sehen nur die eigene Gruppe, ohne fremde E-Mail-Adressen
    mitglieder: leitung ? mitglieder : mitglieder
      .filter((m) => m.benutzerId === benutzerId || (z.gruppeId && m.gruppeId === z.gruppeId))
      .map((m) => (m.benutzerId === benutzerId ? m : { ...m, email: "" })),
    rahmen: !leitung && z.gruppeId && offen ? await rahmen(kursId, z.gruppeId, offen.nr) : null,
  };
}

export async function abgabeSpeichern(kursId: string, benutzerId: string, nr: number, e: AbgabeEingabe) {
  const z = await zugang(kursId, benutzerId);
  if (z.rolle !== "teilnehmer" || !z.gruppeId) throw verboten("Nur Teilnehmende einer Gruppe geben ab");
  const runde = (await repo.runden.liste(kursId)).find((r) => r.nr === nr);
  if (!runde) throw nichtGefunden("Runde nicht gefunden");
  const alt = await repo.abgaben.von(z.gruppeId, nr);
  const darf = runde.status === "offen" || (runde.status === "geschlossen" && alt?.status === "zurueckgegeben");
  if (!darf) throw konflikt("Diese Runde ist nicht offen für Abgaben");
  if (alt?.status === "freigegeben") throw konflikt("Die Abgabe wurde schon freigegeben");

  const sp = await spiel(z.kurs.spiel_id, z.kurs.spiel_version);
  const rd = sp.paket.runden[nr];
  const ent: Entscheidung = { option: e.entscheidung.option || undefined, zusatz: [...new Set(e.entscheidung.zusatz)], partner: e.entscheidung.partner };
  if (ent.option && !rd.optionen.some((o) => o.key === ent.option)) throw ungueltig("Unbekannte Option");
  for (const k of ent.zusatz) if (!sp.paket.zusatz.some((x) => x.key === k)) throw ungueltig(`Unbekannte Zusatzmaßnahme ${k}`);
  if (e.abgeben && rd.optionen.length > 0 && !ent.option) throw ungueltig("Bitte eine Hauptentscheidung wählen");
  if (e.abgeben && rd.optionen.length === 0 && ent.zusatz.length) throw ungueltig("In dieser Runde gibt es keine Zusatzmaßnahmen");
  const gruppen = await repo.gruppen.liste(kursId);
  for (const [k, gid] of Object.entries(ent.partner ?? {})) {
    if (!ent.zusatz.includes(k)) continue;
    if (gid === z.gruppeId || !gruppen.some((g) => g.id === gid)) throw ungueltig("Ungültige Partnergruppe");
  }
  if (e.abgeben) {
    for (const k of ent.zusatz) if (sp.paket.zusatz.find((x) => x.key === k)?.partner && !ent.partner?.[k]) throw ungueltig("Bitte eine Partnerabteilung für die Rotation wählen");
    const kosten = sp.regelwerk.kosten(nr, ent);
    const r = await rahmen(kursId, z.gruppeId, nr);
    if (r) for (const [res, k] of Object.entries(kosten)) if (k > (r[res] ?? Infinity)) {
      const name = sp.paket.ressourcen.find((x) => x.id === res)?.name ?? res;
      throw ungueltig(`${name} reicht nicht: ${k} von ${r[res]}`);
    }
  }
  const status: AbgabeStatus = e.abgeben ? "abgegeben" : "entwurf";
  return repo.abgaben.speichern(kursId, z.gruppeId, nr, ent, e.begruendung ?? "", status, benutzerId);
}

export async function rundeStatusSetzen(kursId: string, benutzerId: string, nr: number, status: RundenStatus) {
  await nurLeitung(kursId, benutzerId);
  const runden = await repo.runden.liste(kursId);
  const r = runden.find((x) => x.nr === nr);
  if (!r) throw nichtGefunden("Runde nicht gefunden");
  if (!erlaubterUebergang(r.status, status)) throw konflikt(`Von "${r.status}" nach "${status}" geht nicht`);
  if (status === "offen" && r.status === "gesperrt" && runden.some((x) => x.nr < nr && x.status !== "ausgewertet"))
    throw konflikt("Erst die vorige Runde auswerten");
  await repo.runden.setzen(kursId, nr, status);
}

export async function abgabeStatusSetzen(kursId: string, benutzerId: string, abgabeId: string, status: AbgabeStatus) {
  await nurLeitung(kursId, benutzerId);
  const a = await repo.abgaben.perId(kursId, abgabeId);
  if (!a) throw nichtGefunden("Abgabe nicht gefunden");
  if (status !== "freigegeben" && status !== "zurueckgegeben") throw ungueltig("Nur freigeben oder zurückgeben");
  await repo.abgaben.statusSetzen(kursId, abgabeId, status);
}

export async function bewerten(kursId: string, benutzerId: string, nr: number, gruppeId: string, b: BewertungEingabe) {
  const { kurs } = await nurLeitung(kursId, benutzerId);
  const sp = await spiel(kurs.spiel_id, kurs.spiel_version);
  const max = sp.paket.runden[nr]?.maxPunkte ?? 3;
  if (b.punkte < 0 || b.punkte > max) throw ungueltig(`Punkte zwischen 0 und ${max}`);
  if (b.wurf !== null && !sp.paket.zufall.some((z) => z.wurf === b.wurf)) throw ungueltig("Ungültiger Wurf");
  if (!(await repo.gruppen.liste(kursId)).some((g) => g.id === gruppeId)) throw nichtGefunden("Gruppe nicht gefunden");
  await repo.bewertungen.speichern(kursId, gruppeId, nr, { wurf: b.wurf, punkte: b.punkte, korrektur: b.korrektur ?? {}, kommentar: b.kommentar ?? "" });
}

export async function wuerfeln(kursId: string, benutzerId: string, nr: number) {
  const { kurs } = await nurLeitung(kursId, benutzerId);
  const sp = await spiel(kurs.spiel_id, kurs.spiel_version);
  const seiten = sp.paket.zufall.map((z) => z.wurf);
  const vorhanden = (await repo.bewertungen.liste(kursId)).filter((b) => b.runde === nr && b.wurf !== null);
  for (const g of await repo.gruppen.liste(kursId)) {
    if (vorhanden.some((b) => b.gruppeId === g.id)) continue;
    await repo.bewertungen.wurfSetzen(kursId, g.id, nr, seiten[randomInt(seiten.length)]);
  }
}

export async function gruppeAnlegen(kursId: string, benutzerId: string, name: string, akteur: string) {
  const { kurs } = await nurLeitung(kursId, benutzerId);
  const p = await paket(kurs.spiel_id, kurs.spiel_version);
  if (!p.akteure.some((a) => a.id === akteur)) throw ungueltig("Unbekannte Abteilung");
  try {
    return await repo.gruppen.anlegen(kursId, name.trim(), akteur);
  } catch {
    throw konflikt("Eine Gruppe mit diesem Namen gibt es schon");
  }
}

export async function gruppeLoeschen(kursId: string, benutzerId: string, gruppeId: string) {
  await nurLeitung(kursId, benutzerId);
  await repo.gruppen.loeschen(kursId, gruppeId);
}

export async function mitgliedZuordnen(kursId: string, benutzerId: string, mitgliedId: string, gruppeId: string | null) {
  await nurLeitung(kursId, benutzerId);
  if (gruppeId && !(await repo.gruppen.liste(kursId)).some((g) => g.id === gruppeId)) throw nichtGefunden("Gruppe nicht gefunden");
  if (!(await repo.mitglieder.gruppeSetzen(kursId, mitgliedId, gruppeId))) throw nichtGefunden("Teilnehmer:in nicht gefunden");
}
