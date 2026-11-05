import { useState } from "react";
import { Check, Copy, KeyRound, X } from "lucide-react";
import { api } from "@/api/client";
import { Button, Karte } from "@/components/ui";

export type Einmalpasswort = { name: string; passwort: string };

/** Knopf in der Mitgliederliste: setzt ein Einmalpasswort und meldet es nach oben. */
export function ZuruecksetzenKnopf({ kursId, benutzerId, name, ergebnis }: {
  kursId: string; benutzerId: string; name: string; ergebnis: (e: Einmalpasswort | { fehler: string }) => void;
}) {
  const [laedt, setLaedt] = useState(false);
  const los = async () => {
    if (!confirm(`Passwort von ${name} zurücksetzen? ${name} wird überall abgemeldet und muss sich mit dem Einmalpasswort neu anmelden.`)) return;
    setLaedt(true);
    try { ergebnis(await api.passwortZuruecksetzen(kursId, benutzerId)); }
    catch (e) { ergebnis({ fehler: (e as Error).message }); }
    finally { setLaedt(false); }
  };
  return (
    <Button klein variante="leise" onClick={los} laedt={laedt} aria-label={`Passwort von ${name} zurücksetzen`} title="Passwort zurücksetzen" className="min-h-7 px-1.5">
      {!laedt && <KeyRound />}
    </Button>
  );
}

/** Zeigt das Einmalpasswort einmalig an. Es wird nirgends gespeichert. */
export function EinmalpasswortAnzeige({ wert, schliessen }: { wert: Einmalpasswort; schliessen: () => void }) {
  const [kopiert, setKopiert] = useState(false);
  const kopieren = async () => {
    try { await navigator.clipboard.writeText(wert.passwort); setKopiert(true); setTimeout(() => setKopiert(false), 1500); } catch { /* Zwischenablage nicht erlaubt */ }
  };
  return (
    <Karte weiss className="flex flex-col gap-3 border-navy p-5" >
      <div className="flex items-start justify-between gap-3">
        <div className="font-extrabold">Einmalpasswort für {wert.name}</div>
        <Button klein variante="leise" onClick={schliessen} aria-label="Schließen" className="min-h-7 px-1.5"><X /></Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <code className="rounded-lg bg-hell-aktiv px-3 py-2 text-xl font-extrabold tracking-wider text-navy">{wert.passwort}</code>
        <Button klein variante="leise" onClick={kopieren}>{kopiert ? <Check /> : <Copy />}{kopiert ? "Kopiert" : "Kopieren"}</Button>
      </div>
      <p className="text-sm text-grau-text">
        Gib es {wert.name} persönlich weiter. Bei der nächsten Anmeldung muss {wert.name} ein eigenes Passwort festlegen.
        Das Einmalpasswort wird nur jetzt angezeigt.
      </p>
    </Karte>
  );
}
