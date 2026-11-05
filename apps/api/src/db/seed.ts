import path from "node:path";
import { fileURLToPath } from "node:url";
import { nordbyte } from "@planspiel/game-nordbyte";
import { hash } from "../auth";
import * as repo from "../repo";
import { migrate } from "./migrate";
import { pool, q } from "./pool";

/** Alle mitgelieferten Spielpakete in die Datenbank schreiben. */
export async function paketeEinspielen() {
  await repo.spielpakete.speichern(nordbyte);
}

/** Demo-Daten: eine Spielleitung, acht Teilnehmende, vier Gruppen, Runde 0 offen. */
export async function demo() {
  await migrate();
  await paketeEinspielen();
  if (await repo.benutzer.perEmail("helen@demo.de")) {
    console.log("Demo-Daten sind schon da");
    return;
  }
  const pw = await hash("planspiel");
  const helen = await repo.benutzer.anlegen("helen@demo.de", "Helen Haveloh", pw);
  const kurs = await repo.kurse.anlegen({ name: "Bachelor Professional HR 2026/27", code: "NB2026", spielId: "nordbyte", spielVersion: 1, beginn: "2026-11-25", ende: "2027-05-13", von: helen.id, runden: nordbyte.runden.length });
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
  console.log("Demo-Daten angelegt. Anmeldung: helen@demo.de / planspiel (Spielleitung), sara@demo.de / planspiel (Teilnehmerin)");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  demo().then(() => pool.end());
}
