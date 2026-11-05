/**
 * Generische Auswertungs-Bausteine. Spalten, Formate und Farben kommen aus den
 * Kennzahl-Definitionen des Spielpakets, nicht aus dem Code.
 */
import { CheckCircle2, ChevronDown, ChevronUp, Circle } from "lucide-react";
import { Fragment, useState } from "react";
import type { ErgebnisDto, GruppeDto, KennzahlDefinition, OeffentlichesPaket, RundenErgebnis, Ursache } from "@planspiel/core";
import { cn } from "@/lib/cn";
import { AMPEL_TON, anteil, formatiere, istGut, ressource, vorzeichen, zahl } from "@/lib/kennzahl";
import { Chip, Karte } from "../ui";

type P = Pick<OeffentlichesPaket, "kennzahlen" | "ressourcen" | "akteure" | "begriffe" | "ziel">;

export function ZielLeiste({ ziel, text }: { ziel: ErgebnisDto["ziel"]; text: string }) {
  return (
    <Karte className="flex flex-wrap items-center gap-x-6 gap-y-3 px-5 py-4">
      <div className="flex items-center gap-2"><span className="font-extrabold">{text}</span><Chip ton={ziel.erreicht ? "gut" : "neutral"}>{ziel.erreicht ? "Erreicht" : "Offen"}</Chip></div>
      <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
        {ziel.bedingungen.map((b) => (
          <span key={b.id} className={cn("flex items-center gap-1.5", !b.erfuellt && "text-grau")}>
            {b.erfuellt ? <CheckCircle2 className="h-4 w-4 text-gut" /> : <Circle className="h-4 w-4" />}{b.text}
            {b.detail && <span className="text-xs text-grau">({b.detail})</span>}
          </span>
        ))}
      </div>
    </Karte>
  );
}

function Wert({ def, v, vorher, farbe }: { def: KennzahlDefinition; v: number; vorher?: number; farbe: string }) {
  if (def.format === "ampel") {
    const i = Math.round(v);
    return <Chip ton={AMPEL_TON[i] ?? "neutral"} punkt>{formatiere(def, v)}</Chip>;
  }
  const gut = istGut(def, v);
  const d = vorher === undefined ? 0 : v - vorher;
  const dGut = def.richtung === "hoeher_besser" ? d > 0 : d < 0;
  return (
    <div>
      <div className="tabular-nums">
        {formatiere(def, v)}
        {Math.abs(d) > 1e-9 && <span className={cn("ml-1.5 text-xs font-bold", dGut ? "text-gut" : "text-schlecht")}>{vorzeichen(def.format === "prozent" ? d * 100 : d)}</span>}
      </div>
      <div className="mt-1 h-1.5 w-20 max-w-full overflow-hidden rounded-full bg-[#E6E6E6]">
        <div className="h-full rounded-full" style={{ width: `${anteil(def, v) * 100}%`, background: gut === null ? farbe : gut ? "#15803D" : "#C2410C" }} />
      </div>
    </div>
  );
}

export function Vergleichstabelle({ paket, gruppen, erg, meineGruppe, auswahl, waehlen }: {
  paket: P; gruppen: GruppeDto[]; erg: ErgebnisDto; meineGruppe?: string | null; auswahl?: string; waehlen?: (g: string) => void;
}) {
  const spalten = paket.kennzahlen.filter((k) => k.inTabelle);
  const budget = paket.ressourcen.find((r) => r.uebertrag);
  const reihen = [...gruppen].sort((a, b) => (a.id === meineGruppe ? -1 : b.id === meineGruppe ? 1 : a.name.localeCompare(b.name)));
  const grid = { gridTemplateColumns: `minmax(0,2.4fr) repeat(${spalten.length + 1}, minmax(0,1fr))${budget ? " minmax(0,0.9fr)" : ""}` };
  const [offen, setOffen] = useState<Set<string>>(new Set());
  const umschalten = (id: string) => setOffen((o) => { const n = new Set(o); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  return (
    <div className="overflow-x-auto">
      <div role="table" className="min-w-[760px]">
        <div role="row" className="grid gap-3 bg-blau px-5 py-3 text-sm font-extrabold text-white" style={grid}>
          <span>{paket.begriffe.akteur}</span><span className="pr-2 text-right">{paket.begriffe.gesamtwert}</span>
          {spalten.map((k) => <span key={k.id}>{k.name}</span>)}
          {budget && <span className="text-right">{budget.name}</span>}
        </div>
        {reihen.map((g) => {
          const a = paket.akteure.find((x) => x.id === g.akteur)!;
          const v = erg.gruppen.find((x) => x.gruppeId === g.id);
          if (!v) return null;
          const jetzt = erg.bisRunde >= 0 ? v.verlauf[erg.bisRunde] : v.start;
          const vorher = erg.bisRunde > 0 ? v.verlauf[erg.bisRunde - 1] : erg.bisRunde === 0 ? v.start : undefined;
          const auf = offen.has(g.id);
          return (
            <Fragment key={g.id}>
            <div role="row" onClick={() => waehlen?.(g.id)}
              className={cn("grid min-h-[72px] items-center gap-3 border-b border-grau-flaeche px-5 py-3", waehlen && "cursor-pointer hover:bg-hell-aktiv", g.id === auswahl ? "bg-hell-aktiv" : g.id === meineGruppe ? "bg-[#F7F9FC]" : "bg-white")} style={grid}>
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="h-9 w-1 shrink-0 rounded" style={{ background: a.farbe }} />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 font-extrabold">{g.name}{g.id === meineGruppe && <Chip>Ihr</Chip>}</div>
                  <div className="truncate text-xs text-grau">{a.name}</div>
                </div>
              </div>
              <button type="button" onClick={(e) => { e.stopPropagation(); umschalten(g.id); }} aria-expanded={auf}
                aria-label={`Berechnung ${paket.begriffe.gesamtwert} ${g.name} ${auf ? "zuklappen" : "aufklappen"}`}
                className="group -my-1 flex items-start justify-end gap-1 rounded-lg py-1 pl-1 pr-2 text-right hover:bg-hell">
                <span>
                  <span className="block text-base font-extrabold tabular-nums">{zahl(jetzt.gesamtwert)}</span>
                  {vorher && Math.abs(jetzt.gesamtwert - vorher.gesamtwert) > 1e-9 && (
                    <span className={cn("block text-xs font-bold", jetzt.gesamtwert > vorher.gesamtwert ? "text-gut" : "text-schlecht")}>{vorzeichen(jetzt.gesamtwert - vorher.gesamtwert, 1)}</span>
                  )}
                </span>
                {auf ? <ChevronUp className="mt-1 h-4 w-4 shrink-0 text-navy" /> : <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-grau group-hover:text-navy" />}
              </button>
              {spalten.map((k) => <Wert key={k.id} def={k} v={jetzt.werte[k.id]} vorher={vorher?.werte[k.id]} farbe={a.farbe} />)}
              {budget && <div className="text-right tabular-nums">{ressource(budget, jetzt.ressourcen[budget.id]?.rest ?? 0)}</div>}
            </div>
            {auf && <Berechnung paket={paket} start={v.start} verlauf={v.verlauf} bis={erg.bisRunde} />}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}

const EXTRA: Record<string, string> = { fte: "Stellen", soll: "Soll", zugang: "Zugang nächste Runde" };

export function UrsachenTabelle({ paket, ergebnis }: { paket: P; ergebnis: RundenErgebnis }) {
  const name = (k: string) => paket.kennzahlen.find((x) => x.id === k)?.name ?? paket.ressourcen.find((x) => x.id === k)?.name ?? EXTRA[k] ?? k;
  const schlechtWennPlus = (k: string) => paket.kennzahlen.find((x) => x.id === k)?.richtung === "niedriger_besser" || k === "soll";
  const spalten = [...new Set(ergebnis.ursachen.flatMap((u: Ursache) => Object.keys(u.aenderungen)))];
  if (!ergebnis.ursachen.length) return <p className="text-sm text-grau">In dieser Runde hat sich nichts verändert.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead><tr className="bg-blau text-left text-white">
          <th className="px-3 py-2.5 font-extrabold">Ursache</th>
          {spalten.map((k) => <th key={k} className="px-3 py-2.5 font-extrabold">{name(k)}</th>)}
          {!spalten.length && <th className="px-3 py-2.5 font-extrabold">Wirkung</th>}
        </tr></thead>
        <tbody>
          {ergebnis.ursachen.map((u, i) => (
            <tr key={i} className="border-b border-grau-flaeche">
              <td className="px-3 py-2.5">{u.quelle}</td>
              {!Object.keys(u.aenderungen).length && <td colSpan={Math.max(1, spalten.length)} className="px-3 py-2.5 text-grau">keine Auswirkung</td>}
              {!!Object.keys(u.aenderungen).length && spalten.map((k) => {
                const v = u.aenderungen[k];
                if (!v) return <td key={k} className="px-3 py-2.5 text-[#8A8A95]">–</td>;
                const res = paket.ressourcen.some((r) => r.id === k);
                const gut = res ? v > 0 : schlechtWennPlus(k) ? v < 0 : v > 0;
                return <td key={k} className={cn("px-3 py-2.5 font-bold tabular-nums", gut ? "text-gut" : "text-schlecht")}>{vorzeichen(v, Number.isInteger(v) ? 0 : 1)}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function KennzahlKachel({ titel, wert, detail, ton }: { titel: string; wert: string; detail?: string; ton?: "gut" | "warn" | "schlecht" }) {
  return (
    <Karte className="p-4">
      <div className="text-xs text-grau">{titel}</div>
      <div className="mt-1 flex items-center gap-2">
        {ton && <span className={cn("h-3 w-3 rounded-full", ton === "gut" ? "bg-gut" : ton === "warn" ? "bg-[#CA8A04]" : "bg-schlecht")} />}
        <span className="text-2xl font-extrabold tabular-nums">{wert}</span>
      </div>
      {detail && <div className="mt-0.5 text-xs text-grau">{detail}</div>}
    </Karte>
  );
}

export function KennzahlErklaerungen({ paket }: { paket: P }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {paket.kennzahlen.map((k) => <Karte key={k.id} className="p-4"><div className="font-extrabold">{k.name}</div><p className="mt-1 text-sm text-grau-text">{k.erklaerung}</p></Karte>)}
      {paket.ressourcen.map((r) => <Karte key={r.id} className="p-4"><div className="font-extrabold">{r.name}</div><p className="mt-1 text-sm text-grau-text">{ressource(r, r.proRunde)} je Runde. {r.uebertrag ? "Rest wird übertragen." : "Rest verfällt."}</p></Karte>)}
    </div>
  );
}

export function VerlaufChart({ paket, gruppen, erg }: { paket: P; gruppen: GruppeDto[]; erg: ErgebnisDto }) {
  if (erg.bisRunde < 0) return <p className="text-sm text-grau">Der Verlauf erscheint ab der ersten ausgewerteten Runde.</p>;
  const W = 720, H = 260, L = 40, R = 16, T = 16, B = 32;
  const reihen = gruppen.map((g) => {
    const v = erg.gruppen.find((x) => x.gruppeId === g.id)!;
    return { g, farbe: paket.akteure.find((a) => a.id === g.akteur)?.farbe ?? "#154A8D", werte: [v.start.gesamtwert, ...v.verlauf.map((e) => e.gesamtwert)] };
  });
  const alle = reihen.flatMap((r) => r.werte);
  const lo = Math.floor(Math.min(...alle) / 10) * 10, hi = Math.ceil(Math.max(...alle) / 10) * 10 || 10;
  const n = erg.bisRunde + 2;
  const x = (i: number) => L + (n > 1 ? (i / (n - 1)) * (W - L - R) : 0);
  const y = (v: number) => T + (1 - (v - lo) / (hi - lo || 1)) * (H - T - B);
  const ticks = Array.from({ length: (hi - lo) / 10 + 1 }, (_, i) => lo + i * 10);
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`${paket.begriffe.gesamtwert} je Runde`}>
        {ticks.map((t) => <g key={t}><line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="#E6E6E6" /><text x={L - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#5F5F6E">{t}</text></g>)}
        {Array.from({ length: n }, (_, i) => <text key={i} x={x(i)} y={H - 10} textAnchor="middle" fontSize="11" fill="#5F5F6E">{i === 0 ? "Start" : `R${i - 1}`}</text>)}
        {reihen.map((r) => (
          <g key={r.g.id}>
            <polyline fill="none" stroke={r.farbe} strokeWidth="2.5" points={r.werte.map((v, i) => `${x(i)},${y(v)}`).join(" ")} />
            {r.werte.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r="3.5" fill={r.farbe} />)}
          </g>
        ))}
      </svg>
      <div className="mt-2 flex flex-wrap gap-4 text-sm">
        {reihen.map((r) => <span key={r.g.id} className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: r.farbe }} />{r.g.name}</span>)}
      </div>
    </div>
  );
}

export function PaketKarte({ titel, thema, status, runden, akteure, freigegeben, gewaehlt, waehlen }: {
  titel: string; thema: string; status: string; runden: string; akteure: string; freigegeben: boolean; gewaehlt: boolean; waehlen: () => void;
}) {
  return (
    <button type="button" onClick={waehlen} disabled={!freigegeben} aria-pressed={gewaehlt}
      className={cn("block h-full w-full rounded-karte text-left", gewaehlt ? "border-2 border-navy bg-hell-aktiv p-[17px]" : freigegeben ? "border border-grau-linie bg-white p-[18px] hover:border-grau-rahmen" : "cursor-not-allowed border border-dashed border-grau-rahmen bg-[#F7F9FC] p-[18px]")}>
      <span className="flex items-center justify-between gap-2"><span className="text-lg font-extrabold">{titel}</span><Chip ton={freigegeben ? "gut" : "neutral"}>{status}</Chip></span>
      <span className="mt-1 block text-sm text-grau-text">{thema}</span>
      <span className="mt-4 flex flex-wrap gap-x-3.5 gap-y-1 text-xs text-grau"><span>{runden}</span><span>{akteure}</span></span>
    </button>
  );
}

/** Aufgeklappte Berechnung des Gesamtwerts: Zusammensetzung jetzt und Entwicklung über die Runden. */
function Berechnung({ paket, start, verlauf, bis }: { paket: P; start: RundenErgebnis; verlauf: RundenErgebnis[]; bis: number }) {
  const jetzt = bis >= 0 ? verlauf[bis] : start;
  const reihen = [{ label: "Start", e: start, vorher: undefined as RundenErgebnis | undefined }, ...verlauf.map((e, i) => ({ label: `Runde ${i}`, e, vorher: i === 0 ? start : verlauf[i - 1] }))];
  return (
    <div role="row" className="grid gap-4 border-b border-grau-linie bg-hell-aktiv px-5 py-4 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
      <div>
        <div className="mb-2 text-sm font-extrabold">So setzt sich der {paket.begriffe.gesamtwert} zusammen{bis >= 0 ? ` (nach Runde ${bis})` : ""}</div>
        <table className="w-full text-sm">
          <tbody>
            {jetzt.anteile.map((a) => (
              <tr key={a.id} className="border-b border-white">
                <td className="py-1.5 pr-3 font-bold">{a.name}</td>
                <td className="py-1.5 pr-3 text-grau-text">{a.rechnung}</td>
                <td className="py-1.5 text-right tabular-nums">{zahl(a.punkte)}</td>
              </tr>
            ))}
            <tr><td className="pt-2 font-extrabold" colSpan={2}>{paket.begriffe.gesamtwert}</td><td className="pt-2 text-right font-extrabold tabular-nums">{zahl(jetzt.gesamtwert)}</td></tr>
          </tbody>
        </table>
      </div>
      <div>
        <div className="mb-2 text-sm font-extrabold">Entwicklung über die Runden</div>
        <table className="w-full text-sm">
          <tbody>
            {reihen.map(({ label, e, vorher }) => {
              const d = vorher ? e.gesamtwert - vorher.gesamtwert : 0;
              const neuePunkte = vorher ? (e.werte.punkte ?? 0) - (vorher.werte.punkte ?? 0) : 0;
              return (
                <tr key={label} className="border-b border-white">
                  <td className="py-1.5 pr-3 text-grau-text">{label}</td>
                  <td className="py-1.5 pr-3 text-right font-bold tabular-nums">{zahl(e.gesamtwert)}</td>
                  <td className={cn("py-1.5 pr-3 text-right text-xs font-bold tabular-nums", d > 1e-9 ? "text-gut" : d < -1e-9 ? "text-schlecht" : "text-grau")}>{vorher ? (Math.abs(d) > 1e-9 ? vorzeichen(d, 1) : "±0") : ""}</td>
                  <td className="py-1.5 text-xs text-grau">{neuePunkte > 0 ? `+${zahl(neuePunkte, 0)} Begründungspunkte` : ""}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="mt-2 text-xs text-grau">Was genau sich verändert hat, steht unten unter „Was hat sich verändert?“.</p>
      </div>
    </div>
  );
}
