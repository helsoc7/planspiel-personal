/**
 * Das Spielpaket: alles, was ein Planspiel ausmacht, als Daten.
 * Die Oberfläche kennt nur diese Typen, nie ein konkretes Spiel.
 */

export type KennzahlFormat = "prozent" | "zahl" | "skala" | "ampel" | "geld";

export interface KennzahlDefinition {
  id: string;
  name: string;
  /** Kurze Erklärung für die Legende "Kennzahlen erklärt". */
  erklaerung: string;
  format: KennzahlFormat;
  min?: number;
  max?: number;
  /** Ab diesem Wert gilt die Kennzahl als gut (grüner Balken). */
  gutAb?: number;
  richtung: "hoeher_besser" | "niedriger_besser";
  /** Für Ampeln: Bezeichnungen der Stufen, von gut nach schlecht. */
  stufen?: string[];
  /** Spalte in der Vergleichstabelle anzeigen. */
  inTabelle: boolean;
}

export interface RessourceDefinition {
  id: string;
  name: string;
  einheit: string;
  proRunde: number;
  /** Wird ein Rest in die nächste Runde übertragen? */
  uebertrag: boolean;
}

export interface Akteur {
  id: string;
  name: string;
  kurz: string;
  farbe: string;
  start: Record<string, number>;
}

export interface Option {
  key: string;
  label: string;
  kosten: Record<string, number>;
  /** Wirkungen sind Sache der Fabrik. Sie werden Teilnehmenden nicht ausgeliefert. */
  wirkung?: Record<string, unknown>;
  hinweis?: string;
}

export interface Zusatzmassnahme extends Option {
  /** Braucht eine Partnergruppe, die das Gegenstück wählt. */
  partner?: { gegenstueck: string };
}

export interface Zufallskarte {
  wurf: number;
  label: string;
  text: string;
  wirkung?: Record<string, unknown>;
}

export interface RundenInhalt {
  nr: number;
  titel: string;
  termin?: string;
  ereignis: string;
  quelle?: { text: string; url?: string };
  /** Lage je Akteur-ID. */
  lage: Record<string, string>;
  auftrag: string;
  optionen: Option[];
  bewertung: string;
  /** Höchstzahl Begründungspunkte in dieser Runde. */
  maxPunkte: number;
  wirkungAlle?: Record<string, Record<string, number>>;
}

export interface Spielpaket {
  id: string;
  version: number;
  name: string;
  thema: string;
  /** Welche Fabrik das Paket ausführt. */
  fabrik: string;
  begriffe: { akteur: string; akteure: string; gesamtwert: string };
  akteure: Akteur[];
  kennzahlen: KennzahlDefinition[];
  ressourcen: RessourceDefinition[];
  ziel: { text: string; bedingungen: { id: string; text: string }[] };
  runden: RundenInhalt[];
  zusatz: Zusatzmassnahme[];
  zufall: Zufallskarte[];
  /** Fabrikspezifische Regeln, z. B. Strafen oder Gewichte. */
  regeln: Record<string, unknown>;
}

/** Was Teilnehmende sehen dürfen: ohne Wirkungen und Auswertungshinweise. */
export type OeffentlichesPaket = Omit<Spielpaket, "runden" | "zusatz" | "zufall" | "regeln"> & {
  runden: (Omit<RundenInhalt, "optionen" | "wirkungAlle"> & { optionen: Omit<Option, "wirkung" | "hinweis">[] })[];
  zusatz: Omit<Zusatzmassnahme, "wirkung" | "hinweis">[];
  zufall: Zufallskarte[];
};

export function oeffentlich(p: Spielpaket): OeffentlichesPaket {
  const { regeln: _r, ...rest } = p;
  return {
    ...rest,
    runden: p.runden.map(({ wirkungAlle: _w, ...r }) => ({
      ...r,
      optionen: r.optionen.map(({ wirkung: _x, hinweis: _h, ...o }) => o),
    })),
    zusatz: p.zusatz.map(({ wirkung: _x, hinweis: _h, ...z }) => z),
    zufall: p.zufall.map(({ wirkung: _x, ...z }) => z),
  };
}
