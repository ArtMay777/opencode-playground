import { readFileSync } from 'node:fs';
import express from 'express';

interface PackageInfo {
  name: string;
  version: string;
}

// Read the name and version from apps/api/package.json.
// The relative URL works both from src/ (development) and dist/ (production build).
const packageInfo = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
) as PackageInfo;

// The Express app is exported so tests can call it without opening a network port.
export const app = express();

// Parse JSON request bodies (needed as soon as you add POST/PUT endpoints).
app.use(express.json());

app.get('/api/version', (_request, response) => {
  response.json({ name: packageInfo.name, version: packageInfo.version });
});

// Start the HTTP server only when this file is run directly
// (`npm run dev` / `npm start`), not when it is imported by tests.
if (import.meta.main) {
  const port = Number(process.env.API_PORT) || 3001;

  app.listen(port, (error) => {
    // Express 5 reports startup problems here, for example "port already in use".
    if (error) throw error;

    console.log(`API server listening on http://localhost:${port}`);
  });
}
