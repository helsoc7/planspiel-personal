import { useEffect, useMemo, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { ABGABE_STATUS_LABEL } from "@planspiel/core";
import { api } from "@/api/client";
import { KennzahlKachel } from "@/components/spiel/Auswertung";
import { Ereigniskarte, OptionKarte, Ressourcenleiste, Schrittleiste, ZusatzKarte } from "@/components/spiel/Runde";
import { Abschnitt, Auswahl, Button, Chip, Hinweis, Karte, Leer, Seitentitel, Textfeld } from "@/components/ui";
import { AMPEL_TON, formatiere, istGut } from "@/lib/kennzahl";
import { aktuelleRunde, useKurs } from "../kontext";

const SCHRITTE = ["Lage verstehen", "Entscheiden", "Begründen", "Prüfen und abgeben"];

export function AktuelleRunde() {
  const { id, daten: d, spiel, erg, neu, gehe } = useKurs();
  const gruppe = d.gruppen.find((g) => g.id === d.ich.gruppeId);
  const r = aktuelleRunde(d);
  const status = d.runden.find((x) => x.nr === r)?.status;
  const abgabe = gruppe && d.abgaben.find((a) => a.gruppeId === gruppe.id && a.runde === r);

  const [schritt, setSchritt] = useState(0);
  const [option, setOption] = useState<string | undefined>();
  const [zusatz, setZusatz] = useState<string[]>([]);
  const [partner, setPartner] = useState<Record<string, string>>({});
  const [text, setText] = useState("");
  const [meldung, setMeldung] = useState<{ ton: "gut" | "schlecht"; text: string } | null>(null);
  const [laedt, setLaedt] = useState(false);

  // Beim Rundenwechsel den gespeicherten Stand übernehmen
  useEffect(() => {
    setOption(abgabe?.entscheidung.option);
    setZusatz(abgabe?.entscheidung.zusatz ?? []);
    setPartner(abgabe?.entscheidung.partner ?? {});
    setText(abgabe?.begruendung ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [r, abgabe?.id]);
  useEffect(() => { setSchritt(0); setMeldung(null); }, [r]);

  const rd = r >= 0 ? spiel.runden[r] : undefined;
  const kosten = useMemo(() => {
    const k: Record<string, number> = {};
    const add = (c: Record<string, number>) => { for (const x in c) k[x] = (k[x] ?? 0) + c[x]; };
    const o = rd?.optionen.find((x) => x.key === option);
    if (o) add(o.kosten);
    for (const z of zusatz) { const zz = spiel.zusatz.find((x) => x.key === z); if (zz) add(zz.kosten); }
    return k;
  }, [rd, option, zusatz, spiel.zusatz]);

  if (!gruppe) return <Leer titel="Du bist noch keiner Gruppe zugeordnet" text="Die Spielleitung ordnet dich einer Gruppe zu. Danach siehst du hier die aktuelle Runde."><Button variante="sekundaer" onClick={() => gehe("anleitung")}>Anleitung lesen</Button></Leer>;
  if (!rd || !status) return <Leer titel="Das Spiel startet bald" text="Sobald die Spielleitung die erste Runde freigibt, seht ihr hier Ereignis, Auftrag und eure Möglichkeiten." />;

  const akteur = spiel.akteure.find((a) => a.id === gruppe.akteur)!;
  const bearbeitbar = (status === "offen" && abgabe?.status !== "freigegeben") || (status === "geschlossen" && abgabe?.status === "zurueckgegeben");
  const abgegeben = abgabe && abgabe.status !== "entwurf" && abgabe.status !== "zurueckgegeben";
  const mitOptionen = rd.optionen.length > 0;
  const rahmen = d.rahmen ?? Object.fromEntries(spiel.ressourcen.map((x) => [x.id, x.proRunde]));
  const zuViel = spiel.ressourcen.some((x) => (kosten[x.id] ?? 0) > (rahmen[x.id] ?? Infinity));
  const v = erg.gruppen.find((x) => x.gruppeId === gruppe.id);
  const jetzt = v ? (erg.bisRunde >= 0 ? v.verlauf[erg.bisRunde] : v.start) : undefined;
  const andere = d.gruppen.filter((g) => g.id !== gruppe.id);

  async function speichern(abgeben: boolean) {
    setLaedt(true); setMeldung(null);
    try {
      await api.abgabe(id, r, { entscheidung: { option, zusatz, partner: Object.fromEntries(Object.entries(partner).filter(([k]) => zusatz.includes(k))) }, begruendung: text, abgeben });
      setMeldung({ ton: "gut", text: abgeben ? "Abgegeben. Bis zum Rundenschluss könnt ihr noch ändern." : "Entwurf gespeichert." });
      await neu();
    } catch (e) {
      setMeldung({ ton: "schlecht", text: (e as Error).message });
    } finally {
      setLaedt(false);
    }
  }

  const umschalten = (k: string) => setZusatz((z) => (z.includes(k) ? z.filter((x) => x !== k) : [...z, k]));
  const opt = rd.optionen.find((o) => o.key === option);

  return (
    <div className="flex flex-col gap-5">
      <Seitentitel unter={`Runde ${r}${rd.termin ? ` · ${rd.termin}` : ""}`} titel={rd.titel}
        rechts={abgabe && <Chip ton={abgegeben ? "gut" : "warn"}>{ABGABE_STATUS_LABEL[abgabe.status]}</Chip>} />
      <Schrittleiste schritte={SCHRITTE} aktiv={schritt} setzen={setSchritt} />
      {!bearbeitbar && <Hinweis ton="info">{status === "ausgewertet" ? "Diese Runde ist ausgewertet. Das Ergebnis steht in der Übersicht." : abgabe?.status === "freigegeben" ? "Eure Abgabe ist freigegeben." : "Die Abgabe ist geschlossen. Die Spielleitung wertet aus."}</Hinweis>}

      {schritt === 0 && (
        <>
          <Ereigniskarte runde={rd} akteurId={akteur.id} akteure={spiel.akteure} />
          {jetzt && (
            <Abschnitt titel="Eure Kennzahlen">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {spiel.kennzahlen.map((k) => {
                  const w = jetzt.werte[k.id], gut = istGut(k, w);
                  return <KennzahlKachel key={k.id} titel={k.name} wert={formatiere(k, w)}
                    detail={k.id === "kap" ? `${jetzt.werte.fte} / ${jetzt.werte.soll} Stellen` : undefined}
                    ton={k.format === "ampel" ? AMPEL_TON[Math.round(w)] : gut === null ? undefined : gut ? "gut" : "warn"} />;
                })}
              </div>
            </Abschnitt>
          )}
        </>
      )}

      {schritt === 1 && (
        mitOptionen ? (
          <>
            <Ressourcenleiste ressourcen={spiel.ressourcen} verbraucht={kosten} verfuegbar={rahmen} />
            <Abschnitt titel="Hauptentscheidung" rechts={<span className="text-sm text-grau">genau eine</span>}>
              <div className="flex flex-col gap-2">
                {rd.optionen.map((o) => <OptionKarte key={o.key} kennung={o.key} titel={o.label} kosten={o.kosten} ressourcen={spiel.ressourcen} gewaehlt={option === o.key} waehlen={() => setOption(o.key)} gesperrt={!bearbeitbar} />)}
              </div>
            </Abschnitt>
            <Abschnitt titel="Zusatzmaßnahmen" rechts={<span className="text-sm text-grau">optional</span>}>
              <div className="grid items-start gap-2 md:grid-cols-2">
                {spiel.zusatz.map((z) => (
                  <ZusatzKarte key={z.key} titel={z.label} kosten={z.kosten} ressourcen={spiel.ressourcen} aktiv={zusatz.includes(z.key)} umschalten={() => umschalten(z.key)} gesperrt={!bearbeitbar}>
                    {z.partner && (
                      <div className="flex flex-col gap-1">
                        <label htmlFor={`p-${z.key}`} className="text-xs font-bold text-grau-text">Partnerabteilung (muss {z.partner.gegenstueck} wählen)</label>
                        <Auswahl id={`p-${z.key}`} value={partner[z.key] ?? ""} disabled={!bearbeitbar} onChange={(e) => setPartner((p) => ({ ...p, [z.key]: e.target.value }))}>
                          <option value="">Bitte wählen</option>
                          {andere.map((g) => <option key={g.id} value={g.id}>{g.name} · {spiel.akteure.find((a) => a.id === g.akteur)?.kurz}</option>)}
                        </Auswahl>
                      </div>
                    )}
                  </ZusatzKarte>
                ))}
              </div>
            </Abschnitt>
          </>
        ) : <Hinweis>Diese Runde hat keine Entscheidungsoptionen. Es zählt nur eure Begründung.</Hinweis>
      )}

      {schritt === 2 && (
        <Karte className="flex flex-col gap-3 p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-xl font-extrabold">Begründung</h2>
            <span className="text-sm text-grau">0 bis {rd.maxPunkte} Begründungspunkte</span>
          </div>
          <div className="rounded-lg bg-hell-aktiv px-4 py-3 text-sm"><span className="font-bold">Darauf achtet die Spielleitung: </span>{rd.bewertung.replace(/^Begründungspunkte 0[–-]\d:\s*/, "")}</div>
          <label htmlFor="begr" className="text-sm font-bold">Eure Begründung</label>
          <Textfeld id="begr" rows={9} value={text} onChange={(e) => setText(e.target.value)} disabled={!bearbeitbar} placeholder={`Auftrag: ${rd.auftrag}`} />
          <div className="text-xs text-grau">{text.trim() ? `${text.trim().split(/\s+/).length} Wörter` : "Noch keine Begründung"}</div>
        </Karte>
      )}

      {schritt === 3 && (
        <Karte className="flex flex-col gap-4 p-5">
          <h2 className="text-xl font-extrabold">Eure Abgabe</h2>
          <dl className="grid gap-x-4 gap-y-2.5 sm:grid-cols-[180px_1fr]">
            {mitOptionen && <><dt className="text-grau">Hauptentscheidung</dt><dd className="font-bold">{opt ? `${opt.key} · ${opt.label}` : <span className="text-schlecht">Noch nicht gewählt</span>}</dd></>}
            {mitOptionen && <><dt className="text-grau">Zusatzmaßnahmen</dt><dd>{zusatz.length ? zusatz.map((k) => {
              const z = spiel.zusatz.find((x) => x.key === k)!; const p = partner[k] && d.gruppen.find((g) => g.id === partner[k]);
              return <div key={k}>{z.label}{z.partner && <span className="text-grau"> · mit {p ? p.name : <span className="text-schlecht">Partner fehlt</span>}</span>}</div>;
            }) : "Keine"}</dd></>}
            {mitOptionen && <><dt className="text-grau">Ressourcen</dt><dd>{spiel.ressourcen.map((x) => `${x.name} ${kosten[x.id] ?? 0} von ${rahmen[x.id]}`).join(" · ")}</dd></>}
            <dt className="text-grau">Begründung</dt><dd>{text.trim() ? `${text.trim().split(/\s+/).length} Wörter` : <span className="text-schlecht">Noch leer</span>}</dd>
          </dl>
          {zuViel && <Hinweis ton="schlecht">Ihr habt mehr verplant, als verfügbar ist.</Hinweis>}
          {abgegeben && <div className="flex items-center gap-2 rounded-lg bg-gut-flaeche px-4 py-3 text-sm font-semibold text-gut-text"><CheckCircle2 className="h-5 w-5" />Abgegeben. Änderungen sind bis zum Rundenschluss möglich.</div>}
        </Karte>
      )}

      {meldung && <Hinweis ton={meldung.ton}>{meldung.text}</Hinweis>}
      <Karte weiss className="flex flex-wrap items-center gap-3 px-4 py-3">
        <Button variante="sekundaer" onClick={() => setSchritt((s) => Math.max(0, s - 1))} disabled={schritt === 0}>Zurück</Button>
        {bearbeitbar && <Button variante="leise" onClick={() => speichern(false)} laedt={laedt}>Entwurf speichern</Button>}
        <span className="flex-1" />
        {schritt < 3
          ? <Button onClick={() => setSchritt((s) => s + 1)}>Weiter</Button>
          : bearbeitbar && <Button onClick={() => speichern(true)} laedt={laedt} disabled={zuViel || (mitOptionen && !option)}>{abgegeben ? "Erneut abgeben" : "Abgeben"}</Button>}
      </Karte>
    </div>
  );
}
