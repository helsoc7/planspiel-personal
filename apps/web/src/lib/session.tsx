import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { BenutzerDto } from "@planspiel/core";
import { api, tokenLesen, tokenSetzen } from "@/api/client";

type Session = { ich: BenutzerDto | null; laedt: boolean; anmelden: (t: string, b: BenutzerDto) => void; abmelden: () => void };
const Ctx = createContext<Session>(null as unknown as Session);
export const useSession = () => useContext(Ctx);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [ich, setIch] = useState<BenutzerDto | null>(null);
  const [laedt, setLaedt] = useState(!!tokenLesen());
  useEffect(() => {
    if (!tokenLesen()) return;
    api.ich().then(setIch).catch(() => tokenSetzen(null)).finally(() => setLaedt(false));
  }, []);
  return (
    <Ctx.Provider value={{
      ich, laedt,
      anmelden: (t, b) => { tokenSetzen(t); setIch(b); },
      abmelden: () => { tokenSetzen(null); setIch(null); },
    }}>{children}</Ctx.Provider>
  );
}
