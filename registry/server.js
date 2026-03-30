import Fastify from "fastify";
import cors from "@fastify/cors";
import pg from "pg";

const { Pool } = pg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const fastify = Fastify({ logger: true });
await fastify.register(cors);

// --- Database setup ---

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS agents (
      id SERIAL PRIMARY KEY,
      namespace TEXT NOT NULL,
      name TEXT NOT NULL,
      version TEXT NOT NULL DEFAULT '0.1.0',
      spec JSONB NOT NULL,
      description TEXT,
      tags TEXT[] DEFAULT '{}',
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
    namespace: "community",
    name: "research-agent",
    version: "0.1.0",
    description: "Deep research agent that searches, reads, and synthesizes information from multiple sources",
    tags: ["research", "search", "synthesis"],
    spec: {
      colony: "0.1",
      name: "research-agent",
      namespace: "community",
      version: "0.1.0",
      description: "Deep research agent that searches, reads, and synthesizes information from multiple sources",
      interface: {
        input: { query: { type: "string", required: true }, depth: { type: "string", default: "standard" } },
        output: { report: "string", sources: "string[]", confidence: "number" },
      },
      runtime: { engine: "claude", model: "claude-sonnet-4-20250514" },
      behaviors: { max_steps: 50, timeout: 300 },
    },
  },
  {
    namespace: "community",
    name: "writer-agent",
    version: "0.1.0",
    description: "Writing agent that drafts, edits, and polishes text content in various styles",
    tags: ["writing", "content", "editing"],
    spec: {
      colony: "0.1",
      name: "writer-agent",
      namespace: "community",
      version: "0.1.0",
      description: "Writing agent that drafts, edits, and polishes text content in various styles",
      interface: {
        input: { prompt: { type: "string", required: true }, style: { type: "string", default: "professional" } },
        output: { content: "string", word_count: "number" },
      },
      runtime: { engine: "claude", model: "claude-sonnet-4-20250514" },
      behaviors: { max_steps: 20, timeout: 120 },
    },
  },
  {
    namespace: "community",
    name: "reviewer-agent",
    version: "0.1.0",
    description: "Code and content reviewer that provides structured feedback and improvement suggestions",
    tags: ["review", "code", "feedback"],
    spec: {
      colony: "0.1",
      name: "reviewer-agent",
      namespace: "community",
      version: "0.1.0",
      description: "Code and content reviewer that provides structured feedback and improvement suggestions",
      interface: {
        input: { content: { type: "string", required: true }, review_type: { type: "string", default: "general" } },
        output: { feedback: "string", issues: "string[]", score: "number" },
      },
      runtime: { engine: "claude", model: "claude-sonnet-4-20250514" },
      behaviors: { max_steps: 30, timeout: 180 },
    },
  },
  {
    namespace: "community",
    name: "summarizer-agent",
    version: "0.1.0",
    description: "Summarization agent that distills long documents into concise, structured summaries",
    tags: ["summarize", "distill", "compress"],
    spec: {
      colony: "0.1",
      name: "summarizer-agent",
      namespace: "community",
      version: "0.1.0",
      description: "Summarization agent that distills long documents into concise, structured summaries",
      interface: {
        input: { text: { type: "string", required: true }, max_length: { type: "number", default: 500 } },
        output: { summary: "string", key_points: "string[]" },
      },
      runtime: { engine: "claude", model: "claude-haiku-4-5-20251001" },
      behaviors: { max_steps: 10, timeout: 60 },
    },
  },
  {
    namespace: "community",
    name: "analyst-agent",
    version: "0.1.0",
    description: "Data analysis agent that interprets datasets, finds patterns, and generates insights",
    tags: ["analysis", "data", "insights"],
    spec: {
      colony: "0.1",
      name: "analyst-agent",
      namespace: "community",
      version: "0.1.0",
      description: "Data analysis agent that interprets datasets, finds patterns, and generates insights",
      interface: {
        input: { data: { type: "string", required: true }, question: { type: "string", required: true } },
        output: { analysis: "string", charts: "string[]", recommendations: "string[]" },
      },
      runtime: { engine: "claude", model: "claude-sonnet-4-20250514" },
      behaviors: { max_steps: 40, timeout: 240 },
    },
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
  fastify.log.info("Seed data loaded");
}

// --- Auth middleware ---

function requireAuth(request, reply) {
  const token = request.headers.authorization?.replace("Bearer ", "");
  if (!token || token !== process.env.REGISTRY_AUTH_TOKEN) {
    reply.code(401).send({ error: "Unauthorized" });
    return false;
  }
  return true;
}

// --- Routes ---

// GET /agents — list all agents (with optional ?tag= and ?q= search)
fastify.get("/agents", async (request) => {
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

  if (conditions.length > 0) {
    query += " WHERE " + conditions.join(" AND ");
  }
  query += " ORDER BY namespace, name, created_at DESC";

  const { rows } = await pool.query(query, params);
  return { agents: rows };
});

// GET /agents/:namespace/:name — get agent spec (latest version)
fastify.get("/agents/:namespace/:name", async (request, reply) => {
  const { namespace, name } = request.params;
  const { rows } = await pool.query(
    "SELECT * FROM agents WHERE namespace = $1 AND name = $2 ORDER BY created_at DESC LIMIT 1",
    [namespace, name]
  );
  if (rows.length === 0) return reply.code(404).send({ error: "Agent not found" });
  return rows[0];
});

// GET /agents/:namespace/:name/:version — get specific version
fastify.get("/agents/:namespace/:name/:version", async (request, reply) => {
  const { namespace, name, version } = request.params;
  const { rows } = await pool.query(
    "SELECT * FROM agents WHERE namespace = $1 AND name = $2 AND version = $3",
    [namespace, name, version]
  );
  if (rows.length === 0) return reply.code(404).send({ error: "Agent version not found" });
  return rows[0];
});

// GET /agents/:namespace/:name/versions — list all versions
fastify.get("/agents/:namespace/:name/versions", async (request) => {
  const { namespace, name } = request.params;
  const { rows } = await pool.query(
    "SELECT version, created_at FROM agents WHERE namespace = $1 AND name = $2 ORDER BY created_at DESC",
    [namespace, name]
  );
  return { versions: rows };
});

// POST /agents — publish an agent (requires auth token)
fastify.post("/agents", async (request, reply) => {
  if (!requireAuth(request, reply)) return;

  const { namespace, name, version, spec, description, tags } = request.body;
  if (!namespace || !name || !spec) {
    return reply.code(400).send({ error: "namespace, name, and spec are required" });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO agents (namespace, name, version, spec, description, tags)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [namespace, name, version || "0.1.0", JSON.stringify(spec), description || "", tags || []]
    );
    return reply.code(201).send(rows[0]);
  } catch (err) {
    if (err.code === "23505") {
      return reply.code(409).send({ error: "This version already exists" });
    }
    throw err;
  }
});

// Health check
fastify.get("/health", async () => ({ status: "ok" }));

// --- Start ---

const PORT = process.env.PORT || 3000;

try {
  await initDB();
  await seed();
  await fastify.listen({ port: PORT, host: "0.0.0.0" });
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
