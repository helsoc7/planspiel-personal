import type { Planspiel, PlanspielFabrik } from "./regelwerk";
import type { Spielpaket } from "./paket";

/** Kennt alle Fabriken und erzeugt zu einem Paket das passende Planspiel. */
export class SpielRegistry {
  private fabriken = new Map<string, PlanspielFabrik>();
  private cache = new Map<string, Planspiel>();

  registriere(f: PlanspielFabrik) {
    this.fabriken.set(f.typ, f);
    return this;
  }

  lade(paket: Spielpaket): Planspiel {
    const key = `${paket.id}@${paket.version}`;
    const hit = this.cache.get(key);
    if (hit) return hit;
    const f = this.fabriken.get(paket.fabrik);
    if (!f) throw new Error(`Keine Fabrik für Typ "${paket.fabrik}" registriert`);
    const spiel = f.erstelle(paket);
    this.cache.set(key, spiel);
    return spiel;
  }

  typen() {
    return [...this.fabriken.keys()];
  }
}
