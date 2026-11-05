import { useState } from "react";
import { BarChart3, BookOpen, Gamepad2, ListChecks, PlayCircle, Users } from "lucide-react";
import { useParams, useSearchParams } from "react-router-dom";
import { RUNDEN_STATUS_LABEL } from "@planspiel/core";
import { api } from "@/api/client";
import { useDaten } from "@/api/hooks";
import { AppHeader, GruppenKarte, RundenStand, Seitenleiste, type NavPunkt } from "@/components/spiel/Rahmen";
import { Chip, Hinweis, Laden } from "@/components/ui";
import { aktuelleRunde, Kurs, type KursKontext } from "./kontext";
import { Anleitung } from "./Anleitung";
import { Uebersicht } from "./Uebersicht";
import { Auftraege } from "./teilnehmer/Auftraege";
import { AktuelleRunde } from "./teilnehmer/AktuelleRunde";
import { Gruppen } from "./leitung/Gruppen";
import { Steuerung } from "./leitung/Steuerung";

export function KursSeite() {
  const { id = "" } = useParams();
  const [sp, setSp] = useSearchParams();
  const [vorschau, setVorschau] = useState(false);
  const kurs = useDaten(() => api.kurs(id), [id]);
  const spiel = useDaten(() => api.spiel(id), [id], 0);
  const erg = useDaten(() => api.ergebnisse(id, vorschau), [id, vorschau]);

  if (kurs.fehler && !kurs.daten) return <div className="min-h-screen"><AppHeader /><div className="mx-auto max-w-6xl p-6"><Hinweis ton="schlecht">{kurs.fehler}</Hinweis></div></div>;
  if (!kurs.daten || !spiel.daten || !erg.daten) return <div className="min-h-screen"><AppHeader /><Laden /></div>;

  const d = kurs.daten;
  const paket = spiel.daten as KursKontext["spiel"];
  const leitung = d.ich.rolle === "leitung";
  const gruppe = d.gruppen.find((g) => g.id === d.ich.gruppeId);
  const akteur = paket.akteure.find((a) => a.id === gruppe?.akteur);
  const r = aktuelleRunde(d);
  const st = d.runden.find((x) => x.nr === r)?.status;
  const ohneGruppe = d.mitglieder.filter((m) => m.rolle === "teilnehmer" && !m.gruppeId).length;
  const meineAbgabe = gruppe && d.abgaben.find((a) => a.gruppeId === gruppe.id && a.runde === r);

  const nav: NavPunkt[] = leitung
    ? [
        { id: "steuerung", label: "Spielsteuerung", icon: <Gamepad2 /> },
        { id: "uebersicht", label: "Übersicht", icon: <BarChart3 /> },
        { id: "gruppen", label: "Gruppen", icon: <Users />, badge: ohneGruppe },
        { id: "anleitung", label: "Anleitung", icon: <BookOpen /> },
      ]
    : [
        { id: "runde", label: "Aktuelle Runde", icon: <PlayCircle /> },
        { id: "uebersicht", label: "Übersicht", icon: <BarChart3 /> },
        { id: "auftraege", label: "Bisherige Aufträge", icon: <ListChecks /> },
        { id: "anleitung", label: "Anleitung", icon: <BookOpen /> },
      ];
  // Nur Bereiche der eigenen Rolle zulassen, auch wenn die Adresse etwas anderes sagt
  const gewuenscht = sp.get("bereich");
  const bereich = nav.some((n) => n.id === gewuenscht) ? gewuenscht! : nav[0].id;
  const gehe = (b: string) => { setSp({ bereich: b }); window.scrollTo({ top: 0 }); };
  const neu = async () => { await Promise.all([kurs.neu(), erg.neu()]); };

  const ctx: KursKontext = { id, daten: d, spiel: paket, erg: erg.daten, vorschau, setVorschau, neu, gehe };
  const rundenStatus = (nr: number) => {
    const s = d.runden.find((x) => x.nr === nr)?.status;
    return s === "ausgewertet" ? "fertig" : s && s !== "gesperrt" ? "aktiv" : "offen";
  };

  return (
    <Kurs.Provider value={ctx}>
      <div className="min-h-screen">
        <AppHeader ort={d.kurs.name} rolle={leitung ? "Spielleitung" : undefined} />
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-6 sm:px-6 lg:flex-row lg:items-start">
          <div className="lg:sticky lg:top-20 lg:w-60 lg:shrink-0">
            <Seitenleiste aktiv={bereich} waehlen={gehe} nav={nav} oben={
              <>
                {gruppe && akteur && <GruppenKarte name={gruppe.name} akteur={akteur.name} farbe={akteur.farbe}
                  team={d.mitglieder.filter((m) => m.gruppeId === gruppe.id).map((m) => ({ name: m.name, ich: m.benutzerId === d.ich.benutzerId }))
                    .sort((x, y) => Number(y.ich) - Number(x.ich) || x.name.localeCompare(y.name))} />}
                <RundenStand runde={r} gesamt={d.runden.length} titel={r >= 0 ? paket.runden[r].titel : "Noch nicht gestartet"} status={rundenStatus}
                  chips={r >= 0 && st && <>
                    <Chip ton={st === "offen" ? "info" : st === "ausgewertet" ? "gut" : "neutral"}>{RUNDEN_STATUS_LABEL[st]}</Chip>
                    {!leitung && gruppe && st !== "ausgewertet" && <Chip ton={meineAbgabe && meineAbgabe.status !== "entwurf" ? "gut" : "warn"}>{meineAbgabe && meineAbgabe.status !== "entwurf" ? "Abgegeben" : "Entwurf"}</Chip>}
                  </>} />
              </>
            } />
          </div>
          <main className="min-w-0 flex-1">
            {bereich === "runde" && <AktuelleRunde />}
            {bereich === "uebersicht" && <Uebersicht />}
            {bereich === "auftraege" && <Auftraege />}
            {bereich === "anleitung" && <Anleitung />}
            {bereich === "steuerung" && <Steuerung />}
            {bereich === "gruppen" && <Gruppen />}
          </main>
        </div>
      </div>
    </Kurs.Provider>
  );
}
