import type {
  Entscheidung, GruppenEntscheidung, Planspiel, PlanspielFabrik, Regelwerk, RundenEingabe, RundenErgebnis,
  Spielpaket, Ursache, WertAnteil, ZielStatus,
} from "@planspiel/core";

/**
 * Standardfabrik für Personal-Planspiele: Stellen, Soll, Kompetenz, Klima, Recht,
 * Budget und Führungszeit. NordByte ist das erste Paket dafür; weitere Personal-Spiele
 * brauchen nur ein neues Paket, keinen neuen Code.
 */
type W = { dFTE?: number; dFTEnext?: number; dKomp?: number; dKlima?: number; dRecht?: number; dSoll?: number; dSollReset?: boolean; pflichtplatz?: number; abweichung?: Record<string, Record<string, number | string>> };
type ZW = { dFTE?: number | "abwerbung"; dFTEnext?: number; dKomp?: number; nurMitZugang?: boolean };
type Regeln = { rotStrafeBudget: number; rotStrafeKlima: number; pflichtplaetze: { soll: number; start: number }; gewichte: { kap: number; komp: number; klima: number; recht: number; proPunkt: number } };

const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
const U = (quelle: string, art: Ursache["art"], a: Record<string, number>): Ursache => ({
  quelle, art, aenderungen: Object.fromEntries(Object.entries(a).filter(([, v]) => v)),
});

class PersonalRegelwerk implements Regelwerk {
  private R: Regeln;
  constructor(private p: Spielpaket) {
    this.R = p.regeln as unknown as Regeln;
  }

  private ressource(id: string) {
    return this.p.ressourcen.find((r) => r.id === id)!;
  }

  private wert(kap: number, komp: number, klima: number, recht: number, punkte: number) {
    const g = this.R.gewichte;
    return g.kap * Math.min(100, kap * 100) + g.komp * komp + g.klima * klima * 10 + g.recht * [100, 50, 0][recht] + g.proPunkt * punkte;
  }

  /** Dieselbe Formel wie wert(), Baustein für Baustein erklärt. */
  private anteile(kap: number, komp: number, klima: number, recht: number, punkte: number): WertAnteil[] {
    const g = this.R.gewichte;
    const n = (id: string) => this.p.kennzahlen.find((k) => k.id === id)?.name ?? id;
    const pz = (x: number) => `${Math.round(x * 100)} %`;
    const z = (x: number) => (Math.round(x * 10) / 10).toLocaleString("de-DE");
    const kapP = Math.min(100, kap * 100);
    const stufe = this.p.kennzahlen.find((k) => k.id === "recht")?.stufen?.[recht] ?? String(recht);
    return [
      { id: "kap", name: n("kap"), rechnung: `${pz(g.kap)} × ${z(kapP)}${kap > 1 ? " (höchstens 100)" : ""}`, punkte: g.kap * kapP },
      { id: "komp", name: n("komp"), rechnung: `${pz(g.komp)} × ${z(komp)}`, punkte: g.komp * komp },
      { id: "klima", name: n("klima"), rechnung: `${pz(g.klima)} × ${z(klima * 10)} (${z(klima)} × 10)`, punkte: g.klima * klima * 10 },
      { id: "recht", name: n("recht"), rechnung: `${pz(g.recht)} × ${[100, 50, 0][recht]} (${stufe})`, punkte: g.recht * [100, 50, 0][recht] },
      { id: "punkte", name: "Begründungspunkte", rechnung: `${z(punkte)} × ${g.proPunkt} (alle Runden zusammen)`, punkte: g.proPunkt * punkte },
    ];
  }

  private akteur(id: string) {
    const a = this.p.akteure.find((x) => x.id === id);
    if (!a) throw new Error(`Unbekannter Akteur ${id}`);
    return a;
  }

  startwerte(akteur: string): RundenErgebnis {
    const s = this.akteur(akteur).start;
    const kap = s.fte / s.soll;
    return {
      werte: { kap, komp: s.komp, klima: s.klima, recht: s.recht ?? 0, fte: s.fte, soll: s.soll, zugang: 0, punkte: 0, pflicht: 0 },
      ressourcen: {
        budget: { verfuegbar: this.ressource("budget").proRunde, verbraucht: 0, rest: this.ressource("budget").proRunde },
        fz: { verfuegbar: this.ressource("fz").proRunde, verbraucht: 0, rest: this.ressource("fz").proRunde },
      },
      gesamtwert: this.wert(kap, s.komp, s.klima, s.recht ?? 0, 0),
      anteile: this.anteile(kap, s.komp, s.klima, s.recht ?? 0, 0),
      ursachen: [],
    };
  }

  /** Wirkung einer Option für einen Akteur, inklusive Abweichungen. */
  private wirkung(runde: number, key: string | undefined, akteur: string) {
    const rd = this.p.runden[runde];
    const o = rd?.optionen.find((x) => x.key === key);
    const e = { dFTE: 0, dFTEnext: 0, dKomp: 0, dKlima: 0, dRecht: 0, dSoll: 0, pflichtplatz: 0, budget: 0, fz: 0 };
    if (!o) return { ...e, label: "" };
    const w = (o.wirkung ?? {}) as W;
    for (const k of ["dFTE", "dFTEnext", "dKomp", "dKlima", "dRecht", "dSoll", "pflichtplatz"] as const) e[k] = (w[k] as number) || 0;
    e.budget = o.kosten.budget || 0;
    e.fz = o.kosten.fz || 0;
    if (w.dSollReset) e.dSoll = -((rd.wirkungAlle?.[akteur]?.dSoll as number) || 0);
    const ab = w.abweichung?.[akteur];
    if (ab) for (const k in ab) if (k !== "hinweis") (e as Record<string, number>)[k] = Number(ab[k]);
    return { ...e, label: o.label };
  }

  kosten(runde: number, ent: Entscheidung) {
    const rd = this.p.runden[runde];
    const o = rd?.optionen.find((x) => x.key === ent.option);
    const out: Record<string, number> = { budget: o?.kosten.budget || 0, fz: o?.kosten.fz || 0 };
    for (const k of ent.zusatz) {
      const z = this.p.zusatz.find((x) => x.key === k);
      if (z) for (const r in z.kosten) out[r] = (out[r] || 0) + z.kosten[r];
    }
    return out;
  }

  bereinigeRunde(alle: GruppenEntscheidung[]) {
    const out = new Map<string, Entscheidung>();
    const byId = new Map(alle.map((g) => [g.gruppeId, g]));
    for (const g of alle) {
      const zusatz = g.entscheidung.zusatz.filter((k) => {
        const z = this.p.zusatz.find((x) => x.key === k);
        if (!z?.partner) return true;
        const partnerId = g.entscheidung.partner?.[k];
        const p = partnerId ? byId.get(partnerId) : undefined;
        return !!p && p.gruppeId !== g.gruppeId && p.entscheidung.zusatz.includes(z.partner.gegenstueck) && p.entscheidung.partner?.[z.partner.gegenstueck] === g.gruppeId;
      });
      out.set(g.gruppeId, { ...g.entscheidung, zusatz });
    }
    return out;
  }

  simuliere(akteurId: string, eingaben: RundenEingabe[]): RundenErgebnis[] {
    const a = this.akteur(akteurId);
    const budgetProRunde = this.ressource("budget").proRunde;
    const fzProRunde = this.ressource("fz").proRunde;
    const out: RundenErgebnis[] = [];
    let prev = { soll: a.start.soll, fte: a.start.fte, pipe: 0, komp: a.start.komp, klima: a.start.klima, recht: a.start.recht ?? 0, rest: 0, punkte: 0 };

    eingaben.forEach((inp, r) => {
      const rd = this.p.runden[r];
      const ent = inp.entscheidung;
      const bew = inp.bewertung;
      const k = bew.korrektur ?? {};
      const e = this.wirkung(r, ent.option, akteurId);
      const g = { dSoll: 0, dFTE: 0, dKomp: 0, ...(rd?.wirkungAlle?.[akteurId] ?? {}) };
      const zs = ent.zusatz.map((key) => this.p.zusatz.find((z) => z.key === key)).filter((z): z is NonNullable<typeof z> => !!z);
      const Z = (f: keyof W) => zs.reduce((s, z) => s + (((z.wirkung ?? {}) as W)[f] as number || 0), 0);
      const ZK = (f: string) => zs.reduce((s, z) => s + (z.kosten[f] || 0), 0);
      const karte = this.p.zufall.find((x) => x.wurf === bew.wurf);
      const kw = (karte?.wirkung ?? {}) as ZW;
      const rot = prev.recht === 2;

      const avail = prev.rest + budgetProRunde - (rot ? this.R.rotStrafeBudget : 0);
      const kosten = e.budget + ZK("budget");
      const fz = e.fz + ZK("fz");
      const soll = prev.soll + g.dSoll + e.dSoll;
      const dfte = kw.dFTE === "abwerbung" ? (prev.klima >= 7 ? 0 : -1) : (kw.dFTE as number) || 0;
      const fte = prev.fte + prev.pipe + g.dFTE + e.dFTE + Z("dFTE") + dfte + (k.fte || 0);
      const basis = e.dFTEnext + Z("dFTEnext");
      const dn = kw.nurMitZugang ? (basis > 0 ? kw.dFTEnext || 0 : 0) : kw.dFTEnext || 0;
      const pipe = basis + dn;
      const wK = kw.dKomp || 0;
      const komp = clamp(prev.komp + g.dKomp + e.dKomp + Z("dKomp") + wK + (k.komp || 0), 0, 100);
      const klima = clamp(prev.klima + e.dKlima + Z("dKlima") + (k.klima || 0) - (rot ? this.R.rotStrafeKlima : 0), 1, 10);
      const recht = clamp(prev.recht + e.dRecht + Z("dRecht") + (k.recht || 0), 0, 2);
      const kap = soll ? fte / soll : 0;
      const punkte = prev.punkte + (bew.punkte || 0);

      const ursachen: Ursache[] = [];
      if (prev.pipe) ursachen.push(U("Zugang aus der Vorrunde", "zugang", { fte: prev.pipe }));
      if (rot) ursachen.push(U("Folge der roten Ampel aus der Vorrunde", "folge", { klima: -this.R.rotStrafeKlima, budget: -this.R.rotStrafeBudget }));
      if (g.dSoll || g.dFTE || g.dKomp) ursachen.push(U(`Ereignis: ${rd.titel}`, "ereignis", { soll: g.dSoll, fte: g.dFTE, komp: g.dKomp }));
      if (ent.option) ursachen.push(U(`Option ${ent.option}: ${e.label}`, "option", { soll: e.dSoll, fte: e.dFTE, zugang: e.dFTEnext, komp: e.dKomp, klima: e.dKlima, recht: e.dRecht, budget: -e.budget, fz: -e.fz }));
      for (const z of zs) {
        const w = (z.wirkung ?? {}) as W;
        ursachen.push(U(`${z.key}: ${z.label}`, "zusatz", { fte: w.dFTE || 0, zugang: w.dFTEnext || 0, komp: w.dKomp || 0, klima: w.dKlima || 0, recht: w.dRecht || 0, budget: -(z.kosten.budget || 0), fz: -(z.kosten.fz || 0) }));
      }
      if (karte) ursachen.push(U(`Würfel ${karte.wurf}: ${karte.label}`, "wuerfel", { fte: dfte, zugang: dn, komp: wK }));
      if (k.fte || k.komp || k.klima || k.recht) ursachen.push(U("Korrektur der Spielleitung", "korrektur", { fte: k.fte || 0, komp: k.komp || 0, klima: k.klima || 0, recht: k.recht || 0 }));

      out.push({
        werte: { kap, komp, klima, recht, fte, soll, zugang: pipe, punkte, pflicht: e.pflichtplatz },
        ressourcen: {
          budget: { verfuegbar: avail, verbraucht: kosten, rest: avail - kosten },
          fz: { verfuegbar: fzProRunde, verbraucht: fz, rest: fzProRunde - fz },
        },
        gesamtwert: this.wert(kap, komp, klima, recht, punkte),
        anteile: this.anteile(kap, komp, klima, recht, punkte),
        ursachen,
      });
      prev = { soll, fte, pipe, komp, klima, recht, rest: avail - kosten, punkte };
    });
    return out;
  }

  pruefeZiel(stand: { akteur: string; ergebnisse: RundenErgebnis[] }[], bisRunde: number): ZielStatus {
    const pf = this.R.pflichtplaetze;
    const at = (s: (typeof stand)[number]) => (bisRunde < 0 ? this.startwerte(s.akteur) : s.ergebnisse[bisRunde]);
    let pflicht = pf.start;
    for (const s of stand) for (let i = 0; i <= bisRunde; i++) pflicht += s.ergebnisse[i]?.werte.pflicht || 0;
    const kap = stand.length > 0 && stand.every((s) => at(s).werte.kap >= 0.9);
    const rot = stand.every((s) => at(s).werte.recht < 2);
    const pfl = pflicht >= pf.soll - 1;
    const t = Object.fromEntries(this.p.ziel.bedingungen.map((b) => [b.id, b.text]));
    return {
      erreicht: kap && rot && pfl,
      bedingungen: [
        { id: "kap", text: t.kap, erfuellt: kap },
        { id: "rot", text: t.rot, erfuellt: rot },
        { id: "pflicht", text: t.pflicht, erfuellt: pfl, detail: `${pflicht} von ${pf.soll}` },
      ],
    };
  }
}

export class PersonalStandardFabrik implements PlanspielFabrik {
  typ = "personal-standard";
  erstelle(paket: Spielpaket): Planspiel {
    return { paket, regelwerk: new PersonalRegelwerk(paket), kennzahlen: paket.kennzahlen };
  }
}
