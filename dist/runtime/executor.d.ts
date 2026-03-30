import type { AgentSpec, AgentResult } from "../types/index.js";
export declare function checkCrawdadStatus(): Promise<boolean>;
export declare function executeAgent(agent: AgentSpec, input: string, context?: string, verbose?: boolean): Promise<AgentResult>;
