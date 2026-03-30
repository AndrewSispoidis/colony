import Fastify from "fastify";
import cors from "@fastify/cors";
import pg from "pg";
import crypto from "node:crypto";

const { Pool } = pg;

let pool = null;
let dbReady = false;

if (process.env.DATABASE_URL) {
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
} else {
  console.warn("WARNING: DATABASE_URL not set — running without database");
}

const fastify = Fastify({ logger: true });
await fastify.register(cors);

const JWT_SECRET = process.env.JWT_SECRET || "colony-registry-dev-secret";

// --- Simple JWT implementation (no external dependency) ---

function base64url(buf) {
  return Buffer.from(buf).toString("base64url");
}

function signJWT(payload) {
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64url(JSON.stringify({ ...payload, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 86400 * 30 }));
  const sig = crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${sig}`;
}

function verifyJWT(token) {
  try {
    const [header, body, sig] = token.split(".");
    const expected = crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${body}`).digest("base64url");
    if (sig !== expected) return null;
    const payload = JSON.parse(Buffer.from(body, "base64url").toString());
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

// --- Password hashing (simple, no bcrypt dependency) ---

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(":");
  const check = crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
  return hash === check;
}

// --- Database setup ---

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS agents (
      id SERIAL PRIMARY KEY,
      namespace TEXT NOT NULL,
      name TEXT NOT NULL,
      version TEXT NOT NULL DEFAULT '0.1.0',
      spec JSONB NOT NULL,
      description TEXT,
      tags TEXT[] DEFAULT '{}',
      owner_id INTEGER REFERENCES users(id),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(namespace, name, version)
    );
    CREATE INDEX IF NOT EXISTS idx_agents_ns_name ON agents(namespace, name);
    CREATE INDEX IF NOT EXISTS idx_agents_tags ON agents USING GIN(tags);
  `);
}

// --- Seed reference agents ---

const SEED_AGENTS = [
  {
    namespace: "community", name: "research-agent", version: "0.1.0",
    description: "Deep research agent that investigates topics from multiple angles, cross-references claims, and produces structured reports with confidence ratings",
    tags: ["research", "search", "synthesis", "analysis"],
    spec: { colony: "0.1", name: "research-agent", namespace: "community", version: "0.1.0",
      description: "Deep research agent", runtime: { engine: "claude", model: "claude-sonnet-4-20250514" },
      interface: { input: { query: { type: "string", required: true } }, output: { report: "string", sources: "string[]", confidence: "number" } },
      behaviors: { max_steps: 50, timeout: 300 } },
  },
  {
    namespace: "community", name: "writer-agent", version: "0.1.0",
    description: "Professional writing agent that produces publication-ready content with proper structure, voice consistency, and audience-aware tone",
    tags: ["writing", "content", "editing", "creative"],
    spec: { colony: "0.1", name: "writer-agent", namespace: "community", version: "0.1.0",
      description: "Professional writing agent", runtime: { engine: "claude", model: "claude-sonnet-4-20250514" },
      interface: { input: { prompt: { type: "string", required: true }, style: { type: "string", default: "professional" } }, output: { content: "string", word_count: "number" } },
      behaviors: { max_steps: 20, timeout: 120 } },
  },
  {
    namespace: "community", name: "reviewer-agent", version: "0.1.0",
    description: "Structured review agent that evaluates content across accuracy, clarity, completeness, and audience fit with scored rubrics",
    tags: ["review", "feedback", "quality", "editing"],
    spec: { colony: "0.1", name: "reviewer-agent", namespace: "community", version: "0.1.0",
      description: "Structured review agent", runtime: { engine: "claude", model: "claude-sonnet-4-20250514" },
      interface: { input: { content: { type: "string", required: true } }, output: { feedback: "string", issues: "string[]", score: "number" } },
      behaviors: { max_steps: 30, timeout: 180 } },
  },
  {
    namespace: "community", name: "summarizer-agent", version: "0.1.0",
    description: "Precision summarization agent that distills content at multiple granularities — TL;DR, executive summary, and detailed brief",
    tags: ["summarize", "distill", "compress", "extract"],
    spec: { colony: "0.1", name: "summarizer-agent", namespace: "community", version: "0.1.0",
      description: "Precision summarization agent", runtime: { engine: "claude", model: "claude-haiku-4-5-20251001" },
      interface: { input: { text: { type: "string", required: true } }, output: { summary: "string", key_points: "string[]" } },
      behaviors: { max_steps: 10, timeout: 60 } },
  },
  {
    namespace: "community", name: "analyst-agent", version: "0.1.0",
    description: "Data analysis agent that identifies patterns, anomalies, and correlations with statistical reasoning and actionable insights",
    tags: ["analysis", "data", "insights", "statistics"],
    spec: { colony: "0.1", name: "analyst-agent", namespace: "community", version: "0.1.0",
      description: "Data analysis agent", runtime: { engine: "claude", model: "claude-sonnet-4-20250514" },
      interface: { input: { data: { type: "string", required: true }, question: { type: "string", required: true } }, output: { analysis: "string", recommendations: "string[]" } },
      behaviors: { max_steps: 40, timeout: 240 } },
  },
  {
    namespace: "community", name: "code-reviewer-agent", version: "0.1.0",
    description: "Code review agent that audits source code for bugs, security vulnerabilities (OWASP top 10), performance issues, and style violations",
    tags: ["code", "review", "security", "bugs", "engineering"],
    spec: { colony: "0.1", name: "code-reviewer-agent", namespace: "community", version: "0.1.0",
      description: "Code review agent", runtime: { engine: "claude", model: "claude-sonnet-4-20250514" },
      interface: { input: { code: { type: "string", required: true } }, output: { issues: "string[]", score: "number", summary: "string" } },
      behaviors: { max_steps: 30, timeout: 180 } },
  },
  {
    namespace: "community", name: "seo-agent", version: "0.1.0",
    description: "SEO optimization agent that analyzes and rewrites content for search visibility — keyword strategy, meta tags, heading structure, readability",
    tags: ["seo", "marketing", "content", "search", "optimization"],
    spec: { colony: "0.1", name: "seo-agent", namespace: "community", version: "0.1.0",
      description: "SEO optimization agent", runtime: { engine: "claude", model: "claude-sonnet-4-20250514" },
      interface: { input: { content: { type: "string", required: true } }, output: { optimized: "string", keywords: "string[]", meta: "object" } },
      behaviors: { max_steps: 20, timeout: 120 } },
  },
  {
    namespace: "community", name: "data-extractor-agent", version: "0.1.0",
    description: "Structured data extraction agent that parses unstructured text into clean JSON with confidence scores per field",
    tags: ["extraction", "data", "parsing", "structured", "transform"],
    spec: { colony: "0.1", name: "data-extractor-agent", namespace: "community", version: "0.1.0",
      description: "Data extraction agent", runtime: { engine: "claude", model: "claude-sonnet-4-20250514" },
      interface: { input: { text: { type: "string", required: true } }, output: { extracted: "object", confidence: "object" } },
      behaviors: { max_steps: 15, timeout: 90 } },
  },
];

async function seed() {
  for (const agent of SEED_AGENTS) {
    await pool.query(
      `INSERT INTO agents (namespace, name, version, spec, description, tags)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (namespace, name, version) DO NOTHING`,
      [agent.namespace, agent.name, agent.version, JSON.stringify(agent.spec), agent.description, agent.tags]
    );
  }
  fastify.log.info("Seed data loaded (8 agents)");
}

// --- Auth middleware ---

function getAuthUser(request) {
  const header = request.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) return null;
  return verifyJWT(header.slice(7));
}

function requireAuth(request, reply) {
  // Accept either JWT or legacy REGISTRY_AUTH_TOKEN
  const user = getAuthUser(request);
  if (user) return user;
  const token = request.headers.authorization?.replace("Bearer ", "");
  if (token && token === process.env.REGISTRY_AUTH_TOKEN) return { id: 0, username: "admin" };
  reply.code(401).send({ error: "Unauthorized" });
  return null;
}

// --- Auth routes ---

fastify.post("/auth/register", async (request, reply) => {
  if (!pool) return reply.code(503).send({ error: "Database not configured" });
  const { username, email, password } = request.body;
  if (!username || !email || !password) return reply.code(400).send({ error: "username, email, and password are required" });
  if (password.length < 8) return reply.code(400).send({ error: "Password must be at least 8 characters" });

  try {
    const hash = hashPassword(password);
    const { rows } = await pool.query(
      "INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username",
      [username, email, hash]
    );
    const token = signJWT({ id: rows[0].id, username: rows[0].username });
    return reply.code(201).send({ token, username: rows[0].username });
  } catch (err) {
    if (err.code === "23505") return reply.code(409).send({ error: "Username or email already taken" });
    throw err;
  }
});

fastify.post("/auth/login", async (request, reply) => {
  if (!pool) return reply.code(503).send({ error: "Database not configured" });
  const { username, password } = request.body;
  if (!username || !password) return reply.code(400).send({ error: "username and password are required" });

  const { rows } = await pool.query("SELECT * FROM users WHERE username = $1", [username]);
  if (rows.length === 0 || !verifyPassword(password, rows[0].password_hash)) {
    return reply.code(401).send({ error: "Invalid credentials" });
  }

  const token = signJWT({ id: rows[0].id, username: rows[0].username });
  return { token, username: rows[0].username };
});

// --- Agent routes ---

fastify.get("/agents", async (request, reply) => {
  if (!pool) return reply.code(503).send({ error: "Database not configured" });
  const { tag, q } = request.query;
  let query = "SELECT DISTINCT ON (namespace, name) namespace, name, version, description, tags, created_at FROM agents";
  const conditions = [];
  const params = [];

  if (tag) {
    params.push(tag);
    conditions.push(`$${params.length} = ANY(tags)`);
  }
  if (q) {
    params.push(`%${q}%`);
    conditions.push(`(name ILIKE $${params.length} OR description ILIKE $${params.length})`);
  }

  if (conditions.length > 0) query += " WHERE " + conditions.join(" AND ");
  query += " ORDER BY namespace, name, created_at DESC";

  const { rows } = await pool.query(query, params);
  return { agents: rows };
});

fastify.get("/agents/:namespace/:name", async (request, reply) => {
  if (!pool) return reply.code(503).send({ error: "Database not configured" });
  const { namespace, name } = request.params;
  const { rows } = await pool.query(
    "SELECT * FROM agents WHERE namespace = $1 AND name = $2 ORDER BY created_at DESC LIMIT 1",
    [namespace, name]
  );
  if (rows.length === 0) return reply.code(404).send({ error: "Agent not found" });
  return rows[0];
});

fastify.get("/agents/:namespace/:name/:version", async (request, reply) => {
  if (!pool) return reply.code(503).send({ error: "Database not configured" });
  const { namespace, name, version } = request.params;
  const { rows } = await pool.query(
    "SELECT * FROM agents WHERE namespace = $1 AND name = $2 AND version = $3",
    [namespace, name, version]
  );
  if (rows.length === 0) return reply.code(404).send({ error: "Agent version not found" });
  return rows[0];
});

fastify.get("/agents/:namespace/:name/versions", async (request, reply) => {
  if (!pool) return reply.code(503).send({ error: "Database not configured" });
  const { namespace, name } = request.params;
  const { rows } = await pool.query(
    "SELECT version, created_at FROM agents WHERE namespace = $1 AND name = $2 ORDER BY created_at DESC",
    [namespace, name]
  );
  return { versions: rows };
});

fastify.post("/agents", async (request, reply) => {
  if (!pool) return reply.code(503).send({ error: "Database not configured" });
  const user = requireAuth(request, reply);
  if (!user) return;

  const { namespace, name, version, spec, description, tags } = request.body;
  if (!namespace || !name || !spec) return reply.code(400).send({ error: "namespace, name, and spec are required" });

  try {
    const { rows } = await pool.query(
      `INSERT INTO agents (namespace, name, version, spec, description, tags, owner_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [namespace, name, version || "0.1.0", JSON.stringify(spec), description || "", tags || [], user.id || null]
    );
    return reply.code(201).send(rows[0]);
  } catch (err) {
    if (err.code === "23505") return reply.code(409).send({ error: "This version already exists" });
    throw err;
  }
});

// Health check
fastify.get("/health", async () => ({ status: "ok", db: dbReady }));

// --- Start ---

const PORT = parseInt(process.env.PORT || "3000", 10);

if (pool) {
  try {
    await initDB();
    await seed();
    dbReady = true;
    fastify.log.info("Database connected and seeded");
  } catch (err) {
    fastify.log.error({ err }, "Database initialization failed — starting without DB");
  }
}

try {
  await fastify.listen({ port: PORT, host: "0.0.0.0" });
  fastify.log.info(`Server listening on port ${PORT}`);
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
