import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express, {
  type Express,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import {
  createCatchRecord,
  deleteCatchRecord,
  getCatchRecords,
  updateCatchRecord,
} from "./routes/catchRecords.ts";
import { StoreError } from "./store.ts";
import { ValidationError } from "./validation/catchRecords.ts";

interface PackageInfo {
  name: string;
  version: string;
}

interface BodyError extends SyntaxError {
  status?: number;
  body?: unknown;
  type?: string;
}

// Read the name and version from apps/api/package.json.
// The relative URL works both from src/ (development) and dist/ (production build).
const packageInfo = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
) as PackageInfo;

// The Express app is exported so tests can call it without opening a network port.
export const app = express();

// Parse JSON request bodies (needed as soon as you add POST/PUT endpoints).
app.use(express.json());

app.use(
  (
    error: unknown,
    _request: Request,
    response: Response,
    next: NextFunction,
  ) => {
    if (isJsonSyntaxError(error)) {
      const rawBody = (error as BodyError).body;
      if (typeof rawBody === "string") {
        try {
          const parsed: unknown = JSON.parse(rawBody);
          if (parsed === null || Array.isArray(parsed) || typeof parsed !== "object") {
            response
              .status(400)
              .json({ field: "body", message: "Invalid request body" });
            return;
          }
        } catch {
          // malformed JSON - fall through
        }
      }
      response.status(400).json({ field: "body", message: "Invalid JSON" });
      return;
    }
    next(error);
  },
);

app.get("/api/version", (_request, response) => {
  response.json({ name: packageInfo.name, version: packageInfo.version });
});

app.get("/api/catch-records", getCatchRecords);
app.post("/api/catch-records", createCatchRecord);
app.put("/api/catch-records/:id", updateCatchRecord);
app.delete("/api/catch-records/:id", deleteCatchRecord);

app.use((_request, response) => {
  response.status(404).json({ message: "Not found" });
});

app.use(
  (
    error: unknown,
    _request: Request,
    response: Response,
    next: NextFunction,
  ) => {
    void next;
    if (error instanceof ValidationError) {
      response.status(error.status).json(error.body);
      return;
    }
    if (error instanceof StoreError) {
      response.status(error.status).json(error.body);
      return;
    }

    const status =
      typeof error === "object" && error !== null && "status" in error
        ? (error as { status?: unknown }).status
        : undefined;
    if (status === 400) {
      response
        .status(400)
        .json({ field: "body", message: "Invalid request body" });
      return;
    }

    console.error(error);
    response.status(500).json({ message: "Internal server error" });
  },
);

// Production: serve the built frontend (apps/web/dist) from Express, so the whole
// application runs as one service on one port. Unknown /api routes still return 404,
// every other GET request gets index.html (the React app decides what to show).
// In development Vite serves the frontend instead, so this is not used there.
export function serveFrontend(target: Express, distDir: string) {
  target.use(express.static(distDir));
  target.use((request, response, next) => {
    if (request.method !== "GET" || request.path.startsWith("/api")) {
      next();
      return;
    }
    response.sendFile(path.join(distDir, "index.html"));
  });
}

function isJsonSyntaxError(error: unknown): error is BodyError {
  return (
    error instanceof SyntaxError &&
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    (error as BodyError).status === 400 &&
    "body" in error
  );
}

// Start the HTTP server only when this file is run directly
// (`npm run dev` / `npm start`), not when it is imported by tests.
if (import.meta.main) {
  // Hosting platforms usually pass the port in PORT. Locally API_PORT or 3001 is used.
  const port = Number(process.env.PORT) || Number(process.env.API_PORT) || 3001;

  // Serve the frontend only from the production build (`npm run build`, then `npm start`
  // runs dist/server.js). `npm run dev` runs src/server.ts and leaves the frontend to Vite.
  const runningBuild =
    path.basename(path.dirname(fileURLToPath(import.meta.url))) === "dist";
  const webDist = fileURLToPath(new URL("../../web/dist", import.meta.url));
  if (runningBuild && existsSync(path.join(webDist, "index.html"))) {
    serveFrontend(app, webDist);
    console.log(`Serving the frontend from ${webDist}`);
  }

  app.listen(port, (error) => {
    // Express 5 reports startup problems here, for example "port already in use".
    if (error) throw error;

    console.log(`API server listening on http://localhost:${port}`);
  });
}
