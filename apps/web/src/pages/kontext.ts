import { createContext, useContext } from "react";
import type { ErgebnisDto, KursDaten, OeffentlichesPaket, Spielpaket } from "@planspiel/core";

export type KursKontext = {
  id: string;
  daten: KursDaten;
  /** Für Teilnehmende ohne Wirkungen; für die Spielleitung vollständig. */
  spiel: OeffentlichesPaket & Partial<Pick<Spielpaket, "regeln">>;
  erg: ErgebnisDto;
  vorschau: boolean;
  setVorschau: (v: boolean) => void;
  neu: () => Promise<void>;
  gehe: (bereich: string) => void;
};
export const Kurs = createContext<KursKontext>(null as unknown as KursKontext);
export const useKurs = () => useContext(Kurs);

/** Höchste Runde, die nicht gesperrt ist; -1 vor dem Start. */
export const aktuelleRunde = (d: KursDaten) => Math.max(-1, ...d.runden.filter((r) => r.status !== "gesperrt").map((r) => r.nr));
