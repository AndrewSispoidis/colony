import path from "node:path";
import { createRequire } from "node:module";
import type { WorkingMemory, MemoryEntry } from "../types/index.js";
import { getColonyDir } from "../config/index.js";

const require = createRequire(import.meta.url);

// --- Structured memory parsing: [MEMORY:key]value[/MEMORY] and [MEMORY:key:confidence]value[/MEMORY] ---

const MEMORY_REGEX = /\[MEMORY:([^\]:\s]+)(?::(\d*\.?\d+))?\]([\s\S]*?)\[\/MEMORY\]/g;

function parseMemoryBlocks(output: string, agent: string, step: number, writeFn: WorkingMemory["write"]): string {
  let cleaned = output;
  const regex = new RegExp(MEMORY_REGEX.source, "g");
  let match: RegExpExecArray | null;
  while ((match = regex.exec(output)) !== null) {
    const key = match[1];
    const confidence = match[2] ? parseFloat(match[2]) : 1.0;
    const value = match[3].trim();
    const tags = key.split("_").filter(t => t.length > 2);
    writeFn(key, value, agent, step, confidence, tags);
  }
  cleaned = cleaned.replace(new RegExp(MEMORY_REGEX.source, "g"), "").trim();
  return cleaned;
}

// --- Working memory ---

export function createWorkingMemory(): WorkingMemory {
  const entries: MemoryEntry[] = [];

  function write(key: string, value: string, agent?: string, step?: number, confidence?: number, tags?: string[]): void {
    const existing = entries.findIndex((e) => e.key === key);
    const entry: MemoryEntry = {
      key,
      value,
      timestamp: Date.now(),
      agent,
      step,
      confidence: confidence ?? 1.0,
      tags: tags || [],
    };
    if (existing >= 0) {
      entries[existing] = entry;
    } else {
      entries.push(entry);
    }
  }

  function read(key: string): string | undefined {
    const entry = entries.find((e) => e.key === key);
    return entry?.value;
  }

  function getForAgent(agentTags: string[]): MemoryEntry[] {
    if (!agentTags || agentTags.length === 0) return entries;
    return entries.filter((e) => {
      if (!e.tags || e.tags.length === 0) return true;
      return e.tags.some((t) => agentTags.includes(t));
    });
  }

  function toContext(agentTags?: string[]): string {
    const relevant = agentTags ? getForAgent(agentTags) : entries;
    if (relevant.length === 0) return "";
    const lines = relevant.map((e) => {
      let line = `[${e.key}]: ${e.value}`;
      if (e.agent) line += ` (from: ${e.agent})`;
      if (e.confidence !== undefined && e.confidence < 1.0) line += ` [confidence: ${e.confidence}]`;
      return line;
    });
    return `<working_memory>\n${lines.join("\n")}\n</working_memory>`;
  }

  function parseAndStore(output: string, agent: string, step: number): string {
    return parseMemoryBlocks(output, agent, step, write);
  }

  return { entries, write, read, getForAgent, toContext, parseAndStore };
}

// --- Persistent memory (SQLite) ---

type DatabaseInstance = {
  exec: (sql: string) => void;
  prepare: (sql: string) => {
    run: (...args: unknown[]) => void;
    all: (...args: unknown[]) => unknown[];
  };
};

let db: DatabaseInstance | null = null;

function getDB(): DatabaseInstance | null {
  if (db) return db;
  try {
    const Database = require("better-sqlite3") as new (path: string) => DatabaseInstance;
    const dbPath = path.join(getColonyDir(), "memory.db");
    db = new Database(dbPath);
    db.exec(`
      CREATE TABLE IF NOT EXISTS memory (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        agent TEXT,
        step INTEGER,
        confidence REAL DEFAULT 1.0,
        tags TEXT DEFAULT '[]',
        timestamp INTEGER NOT NULL
      )
    `);
    return db;
  } catch {
    return null;
  }
}

interface DBRow {
  key: string; value: string; agent: string | null; step: number | null;
  confidence: number; tags: string; timestamp: number;
}

function rowToEntry(r: DBRow): MemoryEntry {
  return {
    key: r.key,
    value: r.value,
    timestamp: r.timestamp,
    agent: r.agent || undefined,
    step: r.step || undefined,
    confidence: r.confidence,
    tags: JSON.parse(r.tags || "[]") as string[],
  };
}

export function persistentSave(entries: MemoryEntry[]): void {
  const database = getDB();
  if (!database) return;
  const stmt = database.prepare(
    `INSERT OR REPLACE INTO memory (key, value, agent, step, confidence, tags, timestamp)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  for (const e of entries) {
    stmt.run(e.key, e.value, e.agent || null, e.step || null, e.confidence ?? 1.0, JSON.stringify(e.tags || []), e.timestamp);
  }
}

export function persistentLoad(): MemoryEntry[] {
  const database = getDB();
  if (!database) return [];
  const rows = database.prepare("SELECT * FROM memory ORDER BY timestamp ASC").all() as DBRow[];
  return rows.map(rowToEntry);
}

export function persistentList(): MemoryEntry[] {
  return persistentLoad();
}

export function persistentClear(): void {
  const database = getDB();
  if (!database) return;
  database.exec("DELETE FROM memory");
}

export function persistentSearch(query: string): MemoryEntry[] {
  const database = getDB();
  if (!database) return [];
  const rows = database.prepare(
    "SELECT * FROM memory WHERE key LIKE ? OR value LIKE ? ORDER BY timestamp ASC"
  ).all(`%${query}%`, `%${query}%`) as DBRow[];
  return rows.map(rowToEntry);
}
