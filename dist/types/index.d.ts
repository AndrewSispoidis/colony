export interface AgentSpec {
    name: string;
    version: string;
    description: string;
    author?: string;
    model?: string;
    provider?: "anthropic" | "openai";
    system_prompt: string;
    input_schema?: Record<string, unknown>;
    output_schema?: Record<string, unknown>;
    tools?: string[];
    tags?: string[];
    config?: Record<string, unknown>;
    synthesizer?: boolean;
}
export interface WorkflowStep {
    agent: string;
    input?: string;
    config?: Record<string, unknown>;
}
export interface WorkflowOutput {
    save_to?: string;
    format?: string;
}
export interface OrchestrationConfig {
    strategy?: "sequential" | "parallel" | "collaborative";
    synthesizer?: string;
    max_rounds?: number;
}
export interface MemoryConfig {
    scope?: "working" | "persistent";
}
export interface WorkflowSpec {
    name: string;
    version: string;
    description: string;
    steps: WorkflowStep[];
    orchestration?: OrchestrationConfig;
    memory?: MemoryConfig;
    output?: WorkflowOutput;
}
export interface ColonyConfig {
    apiKey?: string;
    openaiKey?: string;
    defaultModel?: string;
    defaultProvider?: string;
    jwt?: string;
    registryUrl?: string;
    agentsDir?: string;
    [key: string]: unknown;
}
export interface AgentResult {
    agent: string;
    output: string;
    tokens_used: number;
    duration_ms: number;
    success: boolean;
    error?: string;
}
export interface WorkflowResult {
    workflow: string;
    steps: AgentResult[];
    total_tokens: number;
    total_duration_ms: number;
    final_output: string;
    success: boolean;
}
export interface MemoryEntry {
    key: string;
    value: string;
    timestamp: number;
    agent?: string;
    step?: number;
    confidence?: number;
    tags?: string[];
}
export interface WorkingMemory {
    entries: MemoryEntry[];
    write: (key: string, value: string, agent?: string, step?: number, confidence?: number, tags?: string[]) => void;
    read: (key: string) => string | undefined;
    getForAgent: (agentTags: string[]) => MemoryEntry[];
    toContext: (agentTags?: string[]) => string;
    parseAndStore: (output: string, agent: string, step: number) => string;
}
