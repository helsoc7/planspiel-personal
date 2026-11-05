import { useEffect, useState } from "react";
import { Dices, Play, Lock, BarChart3, RotateCcw, Check, Undo2 } from "lucide-react";
import { ABGABE_STATUS_LABEL, RUNDEN_STATUS_LABEL, type AbgabeDto, type BewertungDto, type GruppeDto, type RundenStatus } from "@planspiel/core";
import { api } from "@/api/client";
import { Ereigniskarte } from "@/components/spiel/Runde";
import { Auswahl, Button, Chip, Eingabe, Hinweis, Karte, Leer, Seitentitel } from "@/components/ui";
import { cn } from "@/lib/cn";
import { aktuelleRunde, useKurs } from "../kontext";

export function Steuerung() {
  const { id, daten: d, spiel, neu, gehe } = useKurs();
  const [nr, setNr] = useState(Math.max(0, aktuelleRunde(d)));
  const [fehler, setFehler] = useState("");
  const [laedt, setLaedt] = useState("");
  useEffect(() => setNr(Math.max(0, aktuelleRunde(d))), [d.runden.map((r) => r.status).join()]);

  if (!d.gruppen.length) return <Leer titel="Noch keine Gruppen" text="Lege zuerst Gruppen an und ordne die Teilnehmenden zu."><Button onClick={() => gehe("gruppen")}>Zu den Gruppen</Button></Leer>;

  const st = d.runden.find((r) => r.nr === nr)!.status;
  const rd = spiel.runden[nr];
  const vorigeFertig = d.runden.filter((r) => r.nr < nr).every((r) => r.status === "ausgewertet");
  const abg = (g: GruppeDto) => d.abgaben.find((a) => a.gruppeId === g.id && a.runde === nr);
  const bew = (g: GruppeDto) => d.bewertungen.find((b) => b.gruppeId === g.id && b.runde === nr);
  const anzahl = d.gruppen.filter((g) => { const a = abg(g); return a && a.status !== "entwurf"; }).length;
  const ohneWurf = d.gruppen.filter((g) => bew(g)?.wurf == null).length;

  async function tun(key: string, f: () => Promise<unknown>) {
    setLaedt(key); setFehler("");
    try { await f(); await neu(); } catch (e) { setFehler((e as Error).message); } finally { setLaedt(""); }
  }
  const status = (s: RundenStatus, n = nr) => tun(s, () => api.rundeStatus(id, n, s));

  const aktion = (() => {
    if (st === "gesperrt") return vorigeFertig ? <Button onClick={() => status("offen")} laedt={laedt === "offen"}><Play />Runde freigeben</Button> : <span className="text-sm text-grau">Erst die vorige Runde auswerten</span>;
    if (st === "offen") return <Button onClick={() => status("geschlossen")} laedt={laedt === "geschlossen"}><Lock />Abgabe schließen</Button>;
    if (st === "geschlossen") return <>
      <Button variante="sekundaer" onClick={() => status("offen")} laedt={laedt === "offen"}><RotateCcw />Wieder öffnen</Button>
      <Button variante="sekundaer" onClick={() => tun("wurf", () => api.wuerfeln(id, nr))} laedt={laedt === "wurf"} disabled={!ohneWurf}><Dices />Fehlende würfeln</Button>
      <Button onClick={() => status("ausgewertet")} laedt={laedt === "ausgewertet"}><BarChart3 />Auswerten</Button>
    </>;
    return nr + 1 < d.runden.length
      ? <Button onClick={() => tun("weiter", async () => { await api.rundeStatus(id, nr + 1, "offen"); setNr(nr + 1); })} laedt={laedt === "weiter"}><Play />Runde {nr + 1} freigeben</Button>
      : <span className="text-sm font-bold text-gut">Spiel abgeschlossen</span>;
  })();

  return (
    <div className="flex flex-col gap-5">
      <Seitentitel titel="Spielsteuerung" rechts={<Chip ton="info" className="text-sm">Kurscode {d.kurs.code}</Chip>} />
      <div className="flex flex-wrap gap-1.5" aria-label="Runden">
        {d.runden.map((r) => (
          <button key={r.nr} onClick={() => setNr(r.nr)} aria-current={r.nr === nr}
            className={cn("flex h-10 min-w-10 items-center justify-center rounded-full border px-3 text-sm font-extrabold",
              r.nr === nr ? "border-navy bg-navy text-white" : r.status === "ausgewertet" ? "border-gut/30 bg-gut-flaeche text-gut-text" : r.status === "gesperrt" ? "border-grau-linie bg-white text-grau" : "border-navy bg-hell text-navy")}>
            {r.nr}
          </button>
        ))}
      </div>

      <Karte className="flex flex-col gap-4 p-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-sm text-grau">Runde {nr}{rd.termin ? ` · ${rd.termin}` : ""}</div>
            <div className="flex flex-wrap items-center gap-2"><h2 className="text-2xl font-extrabold">{rd.titel}</h2><Chip ton={st === "offen" ? "info" : st === "ausgewertet" ? "gut" : "neutral"}>{RUNDEN_STATUS_LABEL[st]}</Chip></div>
          </div>
          <div className="flex flex-wrap gap-2">{aktion}</div>
        </div>
        {st !== "gesperrt" && (
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <span><span className="font-extrabold">{anzahl} von {d.gruppen.length}</span> Gruppen haben abgegeben</span>
            <span><span className="font-extrabold">{d.gruppen.length - ohneWurf} von {d.gruppen.length}</span> gewürfelt</span>
          </div>
        )}
        {fehler && <Hinweis ton="schlecht">{fehler}</Hinweis>}
        <details className="rounded-lg bg-white p-3"><summary className="cursor-pointer text-sm font-bold text-navy">Ereigniskarte anzeigen</summary><div className="mt-3"><Ereigniskarte runde={rd} akteure={spiel.akteure} /></div></details>
      </Karte>

      <div className="flex flex-col gap-3">
        {d.gruppen.map((g) => <GruppenZeile key={`${g.id}-${nr}`} g={g} nr={nr} abgabe={abg(g)} bewertung={bew(g)} gesperrt={st === "gesperrt"} ausgewertet={st === "ausgewertet"} />)}
      </div>
    </div>
  );
}

function GruppenZeile({ g, nr, abgabe, bewertung, gesperrt, ausgewertet }: { g: GruppeDto; nr: number; abgabe?: AbgabeDto; bewertung?: BewertungDto; gesperrt: boolean; ausgewertet: boolean }) {
  const { id, daten: d, spiel, neu } = useKurs();
  const rd = spiel.runden[nr];
  const a = spiel.akteure.find((x) => x.id === g.akteur)!;
  const [wurf, setWurf] = useState(bewertung?.wurf ?? null);
  const [punkte, setPunkte] = useState(bewertung?.punkte ?? 0);
  const [kommentar, setKommentar] = useState(bewertung?.kommentar ?? "");
  const [gespeichert, setGespeichert] = useState(false);
  const [fehler, setFehler] = useState("");
  useEffect(() => { setWurf(bewertung?.wurf ?? null); setPunkte(bewertung?.punkte ?? 0); setKommentar(bewertung?.kommentar ?? ""); }, [bewertung?.wurf, bewertung?.punkte, bewertung?.kommentar]);

  const o = rd.optionen.find((x) => x.key === abgabe?.entscheidung.option);
  const mitglieder = d.mitglieder.filter((m) => m.gruppeId === g.id).map((m) => m.name).join(", ");

  async function speichern(neuWurf = wurf, neuPunkte = punkte) {
    setFehler("");
    try {
      await api.bewerten(id, nr, g.id, { wurf: neuWurf, punkte: neuPunkte, kommentar });
      setGespeichert(true); setTimeout(() => setGespeichert(false), 1500);
      await neu();
    } catch (e) { setFehler((e as Error).message); }
  }
  const abgabeStatus = async (s: "freigegeben" | "zurueckgegeben") => { if (abgabe) { await api.abgabeStatus(id, abgabe.id, s); await neu(); } };

  return (
    <Karte weiss className="p-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="h-9 w-1 rounded" style={{ background: a.farbe }} />
        <div className="min-w-0 flex-1">
          <div className="font-extrabold">{g.name} <span className="font-normal text-grau">· {a.kurz}</span></div>
          <div className="truncate text-xs text-grau">{mitglieder || "Noch niemand zugeordnet"}</div>
        </div>
        <Chip ton={!abgabe ? "neutral" : abgabe.status === "entwurf" ? "warn" : abgabe.status === "zurueckgegeben" ? "schlecht" : "gut"}>
          {abgabe ? ABGABE_STATUS_LABEL[abgabe.status] : "Keine Abgabe"}
        </Chip>
      </div>
      {!gesperrt && (
        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_380px]">
          <div className="flex flex-col gap-2 text-sm">
            {rd.optionen.length > 0 && <div><span className="font-bold">Entscheidung: </span>{o ? `${o.key} · ${o.label}` : "–"}</div>}
            {o && "hinweis" in o && !!o.hinweis && <div className="rounded-lg bg-hell-aktiv px-3 py-2 text-grau-text"><span className="font-bold">Hinweis: </span>{String(o.hinweis)}</div>}
            {!!abgabe?.entscheidung.zusatz.length && <div><span className="font-bold">Zusatz: </span>{abgabe.entscheidung.zusatz.map((k) => {
              const z = spiel.zusatz.find((x) => x.key === k); const p = abgabe.entscheidung.partner?.[k];
              return `${z?.label ?? k}${p ? ` (mit ${d.gruppen.find((x) => x.id === p)?.name})` : ""}`;
            }).join(", ")}</div>}
            {abgabe?.begruendung
              ? <details><summary className="cursor-pointer font-bold text-navy">Begründung lesen</summary><p className="mt-2 whitespace-pre-line rounded-lg bg-grau-flaeche p-3">{abgabe.begruendung}</p></details>
              : <div className="text-grau">Noch keine Begründung</div>}
            {abgabe && abgabe.status === "abgegeben" && !ausgewertet && (
              <div className="flex gap-2">
                <Button klein onClick={() => abgabeStatus("freigegeben")}><Check />Freigeben</Button>
                <Button klein variante="sekundaer" onClick={() => abgabeStatus("zurueckgegeben")}><Undo2 />Zurückgeben</Button>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2 rounded-lg bg-grau-flaeche p-3">
            <div className="grid grid-cols-[1fr_120px] gap-2">
              <div className="flex flex-col gap-1">
                <label htmlFor={`w-${g.id}`} className="text-xs font-bold text-grau-text">Würfel</label>
                <Auswahl id={`w-${g.id}`} value={wurf ?? ""} disabled={ausgewertet} onChange={(e) => { const w = e.target.value ? +e.target.value : null; setWurf(w); speichern(w, punkte); }}>
                  <option value="">–</option>
                  {spiel.zufall.map((z) => <option key={z.wurf} value={z.wurf}>{z.wurf} · {z.label}</option>)}
                </Auswahl>
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor={`p-${g.id}`} className="text-xs font-bold text-grau-text">Punkte</label>
                <Auswahl id={`p-${g.id}`} value={punkte} disabled={ausgewertet} onChange={(e) => { setPunkte(+e.target.value); speichern(wurf, +e.target.value); }}>
                  {Array.from({ length: rd.maxPunkte + 1 }, (_, i) => <option key={i} value={i}>{i} von {rd.maxPunkte}</option>)}
                </Auswahl>
              </div>
            </div>
            <label htmlFor={`k-${g.id}`} className="text-xs font-bold text-grau-text">Kommentar für die Gruppe</label>
            <Eingabe id={`k-${g.id}`} value={kommentar} disabled={ausgewertet} onChange={(e) => setKommentar(e.target.value)} onBlur={() => kommentar !== (bewertung?.kommentar ?? "") && speichern()} />
            <div className="h-4 text-xs">{gespeichert ? <span className="font-bold text-gut">Gespeichert</span> : fehler && <span className="font-bold text-schlecht">{fehler}</span>}</div>
          </div>
        </div>
      )}
    </Karte>
  );
}
