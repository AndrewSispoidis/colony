import type { WorkflowSpec, WorkflowResult } from "../types/index.js";
export declare function runWorkflow(workflow: WorkflowSpec, verbose?: boolean): Promise<WorkflowResult>;
