import type { AgentSpec } from "../types/index.js";
export declare function resolveAgent(nameOrPath: string): AgentSpec | null;
export declare function installAgent(name: string): boolean;
export declare function getInstalledAgentPath(name: string): string | null;
export declare function listInstalledAgents(): string[];
export declare function getBundledAgentNames(): string[];
