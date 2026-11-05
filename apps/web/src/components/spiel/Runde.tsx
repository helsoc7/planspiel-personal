/** Bausteine der laufenden Runde: Schritte, Ereigniskarte, Optionen, Ressourcen. */
import { Check, ExternalLink } from "lucide-react";
import type { OeffentlichesPaket, RessourceDefinition } from "@planspiel/core";
import { cn } from "@/lib/cn";
import { ressource } from "@/lib/kennzahl";
import { Karte, Kosten } from "../ui";

export function Schrittleiste({ schritte, aktiv, setzen }: { schritte: string[]; aktiv: number; setzen: (i: number) => void }) {
  return (
    <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Schritte">
      {schritte.map((s, i) => {
        const an = i === aktiv, fertig = i < aktiv;
        return (
          <li key={s} className="min-w-0">
            <button onClick={() => setzen(i)} aria-current={an ? "step" : undefined}
              className={cn("flex min-h-11 w-full items-center justify-center gap-2 rounded-full border px-3 text-sm",
                an ? "border-navy bg-navy font-extrabold text-white" : "border-grau-linie bg-grau-flaeche", fertig ? "font-bold text-navy" : !an && "text-grau")}>
              <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-extrabold",
                an ? "bg-white text-navy" : fertig ? "bg-navy text-white" : "border border-grau-linie bg-white text-grau")}>
                {fertig ? <Check className="h-3 w-3" /> : i + 1}
              </span>
              <span className="truncate">{s}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

type R = OeffentlichesPaket["runden"][number];
export function Ereigniskarte({ runde, akteurId, akteure }: { runde: R; akteurId?: string; akteure: OeffentlichesPaket["akteure"] }) {
  const label = "text-xs font-extrabold uppercase tracking-wider";
  return (
    <div className="flex flex-col gap-4">
      <Karte className="p-5">
        <div className={cn(label, "text-navy")}>Ereignis</div>
        <p className="mt-2 text-[17px] leading-relaxed">{runde.ereignis}</p>
        {runde.quelle && (
          runde.quelle.url
            ? <a href={runde.quelle.url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-blau hover:underline">Quelle: {runde.quelle.text}<ExternalLink className="h-3.5 w-3.5" /></a>
            : <div className="mt-3 text-sm text-grau">Quelle: {runde.quelle.text}</div>
        )}
      </Karte>
      <div className="grid gap-4 md:grid-cols-2">
        <Karte className="p-5">
          <div className={cn(label, "text-grau")}>{akteurId ? "Lage in eurer Abteilung" : "Lage je Abteilung"}</div>
          {akteurId
            ? <p className="mt-2 leading-relaxed">{runde.lage[akteurId] ?? "–"}</p>
            : <ul className="mt-2 flex flex-col gap-2">{akteure.map((a) => <li key={a.id} className="text-sm"><span className="font-bold">{a.kurz}: </span>{runde.lage[a.id] ?? "–"}</li>)}</ul>}
        </Karte>
        <Karte className="p-5">
          <div className={cn(label, "text-grau")}>Auftrag</div>
          <p className="mt-2 leading-relaxed">{runde.auftrag}</p>
        </Karte>
      </div>
    </div>
  );
}

export function KostenPlaketten({ kosten, ressourcen }: { kosten: Record<string, number>; ressourcen: RessourceDefinition[] }) {
  return (
    <span className="flex shrink-0 gap-1.5">
      {ressourcen.map((r) => <Kosten key={r.id}>{ressource(r, kosten[r.id] ?? 0)}</Kosten>)}
    </span>
  );
}

export function OptionKarte({ kennung, titel, kosten, ressourcen, gewaehlt, waehlen, gesperrt }: {
  kennung: string; titel: string; kosten: Record<string, number>; ressourcen: RessourceDefinition[]; gewaehlt: boolean; waehlen: () => void; gesperrt?: boolean;
}) {
  return (
    <button type="button" onClick={waehlen} disabled={gesperrt} aria-pressed={gewaehlt}
      className={cn("flex min-h-16 w-full items-center gap-3 rounded-[10px] text-left disabled:cursor-default",
        gewaehlt ? "border-2 border-navy bg-hell-aktiv px-[15px] py-[13px]" : "border border-grau-linie bg-white px-4 py-3.5 enabled:hover:border-grau-rahmen")}>
      <span className={cn("h-[18px] w-[18px] shrink-0 rounded-full bg-white", gewaehlt ? "border-[5px] border-navy" : "border-[1.5px] border-[#9A9AA6]")} />
      <span className="flex-1 font-bold">{kennung} · {titel}</span>
      <KostenPlaketten kosten={kosten} ressourcen={ressourcen} />
    </button>
  );
}

export function ZusatzKarte({ titel, kosten, ressourcen, aktiv, umschalten, gesperrt, children }: {
  titel: string; kosten: Record<string, number>; ressourcen: RessourceDefinition[]; aktiv: boolean; umschalten: () => void; gesperrt?: boolean; children?: React.ReactNode;
}) {
  return (
    <div className={cn("rounded-[10px]", aktiv ? "border-2 border-navy bg-hell-aktiv" : "border border-grau-linie bg-white")}>
      <button type="button" onClick={umschalten} disabled={gesperrt} aria-pressed={aktiv}
        className={cn("flex min-h-16 w-full items-center gap-3 text-left disabled:cursor-default", aktiv ? "px-[13px] py-[11px]" : "px-3.5 py-3")}>
        <span className={cn("flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px]", aktiv ? "bg-navy" : "border-[1.5px] border-[#9A9AA6] bg-white")}>
          {aktiv && <Check className="h-3 w-3 text-white" strokeWidth={3.5} />}
        </span>
        <span className="flex-1 text-sm font-bold">{titel}</span>
        <KostenPlaketten kosten={kosten} ressourcen={ressourcen} />
      </button>
      {aktiv && children && <div className="px-3.5 pb-3">{children}</div>}
    </div>
  );
}

export function Ressourcenleiste({ ressourcen, verbraucht, verfuegbar }: { ressourcen: RessourceDefinition[]; verbraucht: Record<string, number>; verfuegbar: Record<string, number> }) {
  return (
    <Karte className="grid gap-6 px-5 py-4 sm:grid-cols-2">
      {ressourcen.map((r) => {
        const v = verbraucht[r.id] ?? 0, max = verfuegbar[r.id] ?? r.proRunde, ueber = v > max;
        return (
          <div key={r.id}>
            <div className="flex justify-between gap-2 text-sm">
              <span className="font-bold">{r.name}</span>
              <span className={ueber ? "font-extrabold text-schlecht" : "text-grau"}>{ressource(r, v)} von {ressource(r, max)}</span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[#E6E6E6]">
              <div className={cn("h-full rounded-full", ueber ? "bg-schlecht" : "bg-navy")} style={{ width: `${Math.min(100, (v / (max || 1)) * 100)}%` }} />
            </div>
            {ueber && <div className="mt-1 text-xs font-bold text-schlecht">Zu viel verplant. Nehmt eine Maßnahme heraus.</div>}
          </div>
        );
      })}
    </Karte>
  );
}
