import { SpielRegistry } from "@planspiel/core";
import { PersonalStandardFabrik } from "./personal";

export { PersonalStandardFabrik } from "./personal";

/** Registry mit allen eingebauten Fabriken. */
export function standardRegistry() {
  return new SpielRegistry().registriere(new PersonalStandardFabrik());
}
