import type { WorkingMemory, MemoryEntry } from "../types/index.js";
export declare function createWorkingMemory(): WorkingMemory;
export declare function persistentSave(entries: MemoryEntry[]): void;
export declare function persistentLoad(): MemoryEntry[];
export declare function persistentList(): MemoryEntry[];
export declare function persistentClear(): void;
export declare function persistentSearch(query: string): MemoryEntry[];
