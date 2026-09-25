import path from 'node:path';

function intFromEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  const parsed = raw === undefined ? Number.NaN : Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const config = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: intFromEnv('PORT', 4000),
  /** SQLite database file. Azure App Service persists /home, so the default lives under the app root. */
  databaseFile: process.env.DATABASE_FILE ?? path.join(process.cwd(), 'data', 'part-lookup.sqlite'),
  /** Comma separated list of browser origins allowed to call the API (the Vite dev server by default). */
  allowedOrigins: (process.env.ALLOWED_ORIGINS ?? 'http://localhost:5173').split(',').map((origin) => origin.trim()),
  /** Directory containing the built React application, served in production single-host deployments. */
  staticDir: process.env.STATIC_DIR ?? path.join(process.cwd(), '..', 'web', 'dist')
};
