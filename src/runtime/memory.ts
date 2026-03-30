import type { WorkingMemory, MemoryEntry } from "../types/index.js";

export function createWorkingMemory(): WorkingMemory {
  const entries: MemoryEntry[] = [];

  function write(key: string, value: string, agent?: string, step?: number): void {
    const existing = entries.findIndex((e) => e.key === key);
    const entry: MemoryEntry = {
      key,
      value,
      timestamp: Date.now(),
      agent,
      step,
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

  function toContext(): string {
    if (entries.length === 0) return "";
    const lines = entries.map((e) => {
      let line = `[${e.key}]: ${e.value}`;
      if (e.agent) line += ` (from: ${e.agent})`;
      return line;
    });
    return `<working_memory>\n${lines.join("\n")}\n</working_memory>`;
  }

  return { entries, write, read, toContext };
}
