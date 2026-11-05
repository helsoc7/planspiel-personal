import type { KennzahlDefinition, Spielpaket } from "./paket";

/** Was eine Gruppe in einer Runde entscheidet. */
export interface Entscheidung {
  option?: string;
  zusatz: string[];
  /** Partnergruppe je Zusatzmaßnahme, z. B. { Z2: "<gruppe-id>" }. */
  partner?: Record<string, string>;
}

/** Was die Spielleitung in einer Runde festlegt. */
export interface Bewertung {
  wurf: number | null;
  punkte: number;
  /** Korrekturen für eigene Maßnahmen, je Kennzahl. */
  korrektur?: Record<string, number>;
}

export interface RundenEingabe {
  entscheidung: Entscheidung;
  bewertung: Bewertung;
}

export interface Ursache {
  quelle: string;
  art: "ereignis" | "option" | "zusatz" | "wuerfel" | "korrektur" | "folge" | "zugang";
  /** Veränderung je Kennzahl oder Ressource. */
  aenderungen: Record<string, number>;
}

export interface RessourcenStand {
  verfuegbar: number;
  verbraucht: number;
  rest: number;
}

/** Ein Baustein des Gesamtwerts, z. B. "Kapazität: 30 % × 73 = 21,8". */
export interface WertAnteil {
  id: string;
  name: string;
  rechnung: string;
  punkte: number;
}

export interface RundenErgebnis {
  werte: Record<string, number>;
  ressourcen: Record<string, RessourcenStand>;
  gesamtwert: number;
  /** Wie sich der Gesamtwert zusammensetzt. Die Fabrik erklärt ihre eigene Formel. */
  anteile: WertAnteil[];
  ursachen: Ursache[];
}

export interface ZielStatus {
  erreicht: boolean;
  bedingungen: { id: string; text: string; erfuellt: boolean; detail?: string }[];
}

/** Eingabe einer Gruppe für die Bereinigung einer Runde (z. B. Rotation mit Partner). */
export interface GruppenEntscheidung {
  gruppeId: string;
  akteur: string;
  entscheidung: Entscheidung;
}

export interface Regelwerk {
  startwerte(akteur: string): RundenErgebnis;
  /** Rechnet alle Runden einer Gruppe durch. */
  simuliere(akteur: string, eingaben: RundenEingabe[]): RundenErgebnis[];
  /** Kosten einer Entscheidung, damit Frontend und Backend dasselbe prüfen. */
  kosten(runde: number, entscheidung: Entscheidung): Record<string, number>;
  /** Entfernt ungültige Teile, z. B. Rotationen ohne passende Partnergruppe. */
  bereinigeRunde(entscheidungen: GruppenEntscheidung[]): Map<string, Entscheidung>;
  pruefeZiel(stand: { akteur: string; ergebnisse: RundenErgebnis[] }[], bisRunde: number): ZielStatus;
}

export interface Planspiel {
  paket: Spielpaket;
  regelwerk: Regelwerk;
  kennzahlen: KennzahlDefinition[];
}

/** Die abstrakte Fabrik: macht aus einem Spielpaket ein lauffähiges Planspiel. */
export interface PlanspielFabrik {
  typ: string;
  erstelle(paket: Spielpaket): Planspiel;
}
