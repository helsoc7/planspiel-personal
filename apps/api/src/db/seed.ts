import path from "node:path";
import { fileURLToPath } from "node:url";
import { nordbyte } from "@planspiel/game-nordbyte";
import { hash } from "../auth";
import * as repo from "../repo";
import { migrate } from "./migrate";
import { pool, q } from "./pool";

/**
 * Alle mitgelieferten Spielpakete. Ein neues Planspiel kommt als eigenes Paket unter games/
 * dazu und wird hier eingetragen. Läuft es mit einer neuen Spiellogik, braucht es zusätzlich
 * eine Fabrik in packages/engine (siehe standardRegistry).
 */
const PAKETE = [nordbyte];

/** Spielpakete in die Datenbank schreiben. Sie erscheinen danach in der Auswahl beim Kurs anlegen. */
export async function paketeEinspielen() {
  for (const p of PAKETE) await repo.spielpakete.speichern(p);
}

/** Demo-Daten: Helen (Admin und Spielleitung), acht Teilnehmende, vier Gruppen, Runde 0 offen. */
export async function demo() {
  await migrate();
  await paketeEinspielen();
  const vorhanden = await repo.benutzer.perEmail("helen@demo.de");
  if (vorhanden) {
    if (!vorhanden.istAdmin) await repo.benutzer.adminSetzen(vorhanden.id);
    console.log("Demo-Daten sind schon da");
    return;
  }
  const pw = await hash("planspiel");
  const helen = await repo.benutzer.anlegen("helen@demo.de", "Helen Haveloh", pw, true);
  const kurs = await repo.kurse.anlegen({ name: "Bachelor Professional HR 2026/27", codeTeilnehmer: "NB2026", codeLeitung: "SL-NB2026", spielId: "nordbyte", spielVersion: 1, beginn: "2026-11-25", ende: "2027-05-13", von: helen.id, runden: nordbyte.runden.length });
  const gruppen = [["Team Atlas", "cloud"], ["Team Beacon", "sd"], ["Team Compass", "dev"], ["Team Delta", "sec"]] as const;
  const leute = [["Lena", "Atlas"], ["Jonas", "Atlas"], ["Sara", "Beacon"], ["Mehmet", "Beacon"], ["Aylin", "Compass"], ["Tim", "Compass"], ["Daniel", "Delta"], ["Nora", "Delta"]];
  const ids: Record<string, string> = {};
  for (const [name, akteur] of gruppen) ids[name] = (await repo.gruppen.anlegen(kurs.id, name, akteur)).id;
  for (const [name, team] of leute) {
    const b = await repo.benutzer.anlegen(`${name.toLowerCase()}@demo.de`, name, pw);
    await repo.mitglieder.beitreten(kurs.id, b.id);
    await repo.mitglieder.gruppeSetzen(kurs.id, b.id, ids[`Team ${team}`]);
  }
  await q("update runden set status='offen' where kurs_id=$1 and nr=0", [kurs.id]);
  console.log("Demo-Daten angelegt. Anmeldung: helen@demo.de / planspiel (Admin, Spielleitung), sara@demo.de / planspiel (Teilnehmerin). Codes: NB2026 (Teilnehmende), SL-NB2026 (Spielleitung)");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  demo().then(() => pool.end());
}
