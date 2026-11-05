export const config = {
  databaseUrl: process.env.DATABASE_URL ?? "postgres://planspiel:planspiel@localhost:5432/planspiel",
  jwtSecret: new TextEncoder().encode(process.env.JWT_SECRET ?? "nur-fuer-die-entwicklung"),
  port: Number(process.env.PORT ?? 8787),
};
