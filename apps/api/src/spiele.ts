import type { Planspiel, Spielpaket } from "@planspiel/core";
import { standardRegistry } from "@planspiel/engine";
import { q } from "./db/pool";

/** Registry mit allen Fabriken. Pakete kommen aus der Datenbank. */
export const registry = standardRegistry();

const pakete = new Map<string, Spielpaket>();

export async function paket(id: string, version: number): Promise<Spielpaket> {
  const key = `${id}@${version}`;
  const hit = pakete.get(key);
  if (hit) return hit;
  const [row] = await q<{ inhalt: Spielpaket }>("select inhalt from spielpakete where id=$1 and version=$2", [id, version]);
  if (!row) throw new Error(`Spielpaket ${key} nicht gefunden`);
  pakete.set(key, row.inhalt);
  return row.inhalt;
}

export async function spiel(id: string, version: number): Promise<Planspiel> {
  return registry.lade(await paket(id, version));
}
