import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("app.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    scenario TEXT,
    persona TEXT,
    grammar_score INTEGER,
    logic_score INTEGER,
    emotion_score INTEGER,
    fluency_score INTEGER,
    feedback TEXT,
    transcript TEXT
  )
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/reports", (req, res) => {
    const { id, scenario, persona, grammar_score, logic_score, emotion_score, fluency_score, feedback, transcript } = req.body;
    const stmt = db.prepare(`
      INSERT INTO reports (id, scenario, persona, grammar_score, logic_score, emotion_score, fluency_score, feedback, transcript)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, scenario, persona, grammar_score, logic_score, emotion_score, fluency_score, feedback, transcript);
    res.json({ success: true });
  });

  app.get("/api/reports/:id", (req, res) => {
    const report = db.prepare("SELECT * FROM reports WHERE id = ?").get(req.params.id);
    if (report) {
      res.json(report);
    } else {
      res.status(404).json({ error: "Report not found" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
