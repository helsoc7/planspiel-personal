import type { KennzahlDefinition, RessourceDefinition } from "@planspiel/core";

/** Formatiert einen Wert anhand der Kennzahl-Definition aus dem Spielpaket. */
export function formatiere(def: KennzahlDefinition, v: number) {
  switch (def.format) {
    case "prozent": return `${Math.round(v * 100)} %`;
    case "ampel": return def.stufen?.[Math.round(v)] ?? String(v);
    case "skala": return `${zahl(v, 0)} / ${def.max ?? 10}`;
    case "geld": return `${zahl(v, 0)} T€`;
    default: return zahl(v, 0);
  }
}

export function istGut(def: KennzahlDefinition, v: number) {
  if (def.format === "ampel") return v === 0;
  if (def.gutAb === undefined) return null;
  return def.richtung === "hoeher_besser" ? v >= def.gutAb : v <= def.gutAb;
}

export function anteil(def: KennzahlDefinition, v: number) {
  const min = def.min ?? 0, max = def.max ?? 100;
  return Math.max(0, Math.min(1, (v - min) / (max - min || 1)));
}

export const zahl = (x: number, d = 1) =>
  (Math.round(x * 10 ** d) / 10 ** d).toLocaleString("de-DE", { minimumFractionDigits: d, maximumFractionDigits: d });

export const vorzeichen = (x: number, d = 0) => (x > 0 ? "+" : x < 0 ? "−" : "") + zahl(Math.abs(x), d);

export function ressource(r: RessourceDefinition | undefined, v: number) {
  return r ? `${zahl(v, 0)} ${r.einheit}`.trim() : zahl(v, 0);
}

export const AMPEL_TON = ["gut", "warn", "schlecht"] as const;
