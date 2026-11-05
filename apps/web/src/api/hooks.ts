import { useCallback, useEffect, useRef, useState } from "react";

/** Lädt Daten, aktualisiert sie alle `intervall` ms und bei Fensterfokus. */
export function useDaten<T>(laden: () => Promise<T>, deps: unknown[], intervall = 5000) {
  const [daten, setDaten] = useState<T | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const ref = useRef(laden);
  ref.current = laden;
  const neu = useCallback(async () => {
    try {
      setDaten(await ref.current());
      setFehler(null);
    } catch (e) {
      setFehler((e as Error).message);
    }
  }, []);
  useEffect(() => {
    setDaten(null);
    neu();
    const t = intervall ? setInterval(neu, intervall) : undefined;
    const f = () => neu();
    window.addEventListener("focus", f);
    return () => { if (t) clearInterval(t); window.removeEventListener("focus", f); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return { daten, fehler, neu };
}
