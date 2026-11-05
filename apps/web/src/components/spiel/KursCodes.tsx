import { useState } from "react";
import { Check, Copy, Lock, RefreshCw } from "lucide-react";
import type { CodeArt } from "@planspiel/core";
import { api } from "@/api/client";
import { Button, Chip, Karte } from "@/components/ui";

/**
 * Zugangscodes eines Kurses. Den Teilnehmer-Code verwalten Spielleitung und Administration,
 * den Spielleiter-Code nur die Administration.
 */
export function KursCodes({ kursId, teilnehmer, leitung, istAdmin, neu }: {
  kursId: string; teilnehmer: string | null; leitung: string | null; istAdmin: boolean; neu: () => Promise<void>;
}) {
  return (
    <div className={istAdmin ? "grid gap-3 md:grid-cols-2" : "grid gap-3"}>
      <CodeKarte kursId={kursId} art="teilnehmer" code={teilnehmer} neu={neu}
        titel="Teilnehmer-Code" text="Damit registrieren sich Teilnehmende und landen direkt in diesem Kurs. Danach ordnest du sie unten einer Gruppe zu." />
      {istAdmin && (
        <CodeKarte kursId={kursId} art="leitung" code={leitung} neu={neu}
          titel="Spielleiter-Code" text="Nur an Spielleitungen weitergeben. Wer sich damit registriert oder beitritt, steuert diesen Kurs. Kurse anlegen kann er nicht." />
      )}
    </div>
  );
}

function CodeKarte({ kursId, art, code, titel, text, neu }: { kursId: string; art: CodeArt; code: string | null; titel: string; text: string; neu: () => Promise<void> }) {
  const [laedt, setLaedt] = useState<"" | "neu" | "sperren">("");
  const [kopiert, setKopiert] = useState(false);
  const aendern = async (aktion: "neu" | "sperren") => {
    if (aktion === "neu" && code && !confirm(`Neuen ${titel} erzeugen? Der bisherige Code ${code} gilt dann nicht mehr.`)) return;
    setLaedt(aktion);
    try { await api.codeAendern(kursId, art, aktion); await neu(); } finally { setLaedt(""); }
  };
  const kopieren = async () => {
    if (!code) return;
    try { await navigator.clipboard.writeText(code); setKopiert(true); setTimeout(() => setKopiert(false), 1500); } catch { /* Zwischenablage nicht erlaubt */ }
  };

  return (
    <Karte weiss className="flex flex-col gap-3 p-5">
      <div className="flex items-center justify-between gap-2">
        <span className="font-extrabold">{titel}</span>
        {code ? <Chip ton="gut" punkt>offen</Chip> : <Chip ton="warn" punkt>gesperrt</Chip>}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <code className={code ? "rounded-lg bg-hell-aktiv px-3 py-2 text-xl font-extrabold tracking-wider text-navy" : "rounded-lg bg-grau-flaeche px-3 py-2 text-sm text-grau"}>
          {code ?? "Niemand kann mit diesem Code beitreten"}
        </code>
        {code && <Button klein variante="leise" onClick={kopieren} aria-label={`${titel} kopieren`}>{kopiert ? <Check /> : <Copy />}{kopiert ? "Kopiert" : "Kopieren"}</Button>}
      </div>
      <p className="text-sm text-grau-text">{text}</p>
      <div className="flex flex-wrap gap-2">
        <Button klein variante="sekundaer" onClick={() => aendern("neu")} laedt={laedt === "neu"}><RefreshCw />{code ? "Neuen Code erzeugen" : "Code wieder öffnen"}</Button>
        {code && <Button klein variante="leise" onClick={() => aendern("sperren")} laedt={laedt === "sperren"}><Lock />Sperren</Button>}
      </div>
    </Karte>
  );
}
