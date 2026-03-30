export interface AgentSpec {
  name: string;
  version: string;
  description: string;
  author?: string;
  model?: string;
  system_prompt: string;
  input_schema?: Record<string, unknown>;
  output_schema?: Record<string, unknown>;
  tools?: string[];
  config?: Record<string, unknown>;
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

export interface WorkflowSpec {
  name: string;
  version: string;
  description: string;
  steps: WorkflowStep[];
  output?: WorkflowOutput;
}

export interface ColonyConfig {
  apiKey?: string;
  defaultModel?: string;
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
}

export interface WorkingMemory {
  entries: MemoryEntry[];
  write: (key: string, value: string, agent?: string, step?: number) => void;
  read: (key: string) => string | undefined;
  toContext: () => string;
}
