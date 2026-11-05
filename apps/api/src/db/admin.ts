import { hash } from "../auth";
import * as repo from "../repo";

/**
 * Legt beim Start das Admin-Konto an (oder macht ein bestehendes Konto zum Admin).
 * Gesteuert über ADMIN_EMAIL, ADMIN_PASSWORT und ADMIN_NAME. Ein bestehendes Passwort wird nicht überschrieben.
 */
export async function adminEinrichten() {
  const email = process.env.ADMIN_EMAIL?.trim();
  if (!email) return;
  const vorhanden = await repo.benutzer.perEmail(email);
  if (vorhanden) {
    if (!vorhanden.istAdmin) { await repo.benutzer.adminSetzen(vorhanden.id); console.log(`${email} ist jetzt Admin`); }
    return;
  }
  const pw = process.env.ADMIN_PASSWORT ?? "";
  if (pw.length < 12) throw new Error("ADMIN_PASSWORT fehlt oder ist kürzer als 12 Zeichen");
  await repo.benutzer.anlegen(email, process.env.ADMIN_NAME?.trim() || "Administration", await hash(pw), true);
  console.log(`Admin-Konto ${email} angelegt`);
}
