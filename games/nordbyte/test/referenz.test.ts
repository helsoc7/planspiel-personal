// Prüft die Engine gegen 120 Referenzfälle aus der Excel-Tabelle.
import fs from "node:fs";
import { SpielRegistry } from "@planspiel/core";
import { PersonalStandardFabrik } from "@planspiel/engine";
import { nordbyte } from "../src/index";

type Alt = { opt: string; zus: string[]; wurf: number | null; begr: number; kFTE: number; kKomp: number; kKlima: number; kRecht: number };
const faelle = JSON.parse(fs.readFileSync(new URL("../referenzfaelle.json", import.meta.url), "utf8")) as { team: string; inputs: Alt[]; wert: number[]; kap: number[] }[];
const spiel = new SpielRegistry().registriere(new PersonalStandardFabrik()).lade(nordbyte);

let abweichungen = 0;
for (const f of faelle) {
  const eingaben = f.inputs.map((i) => ({
    entscheidung: { option: i.opt || undefined, zusatz: i.zus },
    bewertung: { wurf: i.wurf, punkte: i.begr, korrektur: { fte: i.kFTE, komp: i.kKomp, klima: i.kKlima, recht: i.kRecht } },
  }));
  spiel.regelwerk.simuliere(f.team, eingaben).forEach((e, r) => {
    if (Math.abs(e.gesamtwert - f.wert[r]) > 1e-9 || Math.abs(e.werte.kap - f.kap[r]) > 1e-9) abweichungen++;
    if (Math.abs(e.anteile.reduce((s, a) => s + a.punkte, 0) - e.gesamtwert) > 1e-9) abweichungen++;
  });
}
console.log(`${faelle.length} Referenzfälle, ${faelle.length * 11} Runden, Abweichungen: ${abweichungen}`);
process.exit(abweichungen ? 1 : 0);
