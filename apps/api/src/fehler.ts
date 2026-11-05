import { HTTPException } from "hono/http-exception";

export const nichtGefunden = (was = "Nicht gefunden") => new HTTPException(404, { message: was });
export const verboten = (was = "Keine Berechtigung") => new HTTPException(403, { message: was });
export const ungueltig = (was: string) => new HTTPException(400, { message: was });
export const konflikt = (was: string) => new HTTPException(409, { message: was });
