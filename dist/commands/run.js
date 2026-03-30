import fs from "node:fs";
import path from "node:path";
import chalk from "chalk";
import yaml from "js-yaml";
import { resolveAgent } from "../registry/index.js";
import { executeAgent } from "../runtime/executor.js";
import { runWorkflow } from "../runtime/orchestrator.js";
export async function runCommand(options) {
    // Single agent mode
    if (options.agent) {
        const agent = resolveAgent(options.agent);
        if (!agent) {
            console.log(chalk.red(`Agent not found: ${options.agent}`));
            console.log(chalk.dim("Run `colony list` to see installed agents."));
            process.exit(1);
        }
        const input = options.input || "Please provide your analysis.";
        console.log(chalk.bold.cyan(`\n🤖 Running agent: ${agent.name}\n`));
        const result = await executeAgent(agent, input, undefined, true);
        if (!result.success) {
            console.log(chalk.red(`\n❌ Agent failed: ${result.error}`));
            process.exit(1);
        }
        console.log(chalk.dim(`\n📊 ${result.tokens_used} tokens, ${(result.duration_ms / 1000).toFixed(1)}s`));
        return;
    }
    // Workflow mode — load colony.yaml
    const yamlPath = path.join(process.cwd(), "colony.yaml");
    if (!fs.existsSync(yamlPath)) {
        console.log(chalk.red("No colony.yaml found in current directory."));
        console.log(chalk.dim("Run `colony init` to create one, or use `colony run --agent <name>`."));
        process.exit(1);
    }
    const raw = fs.readFileSync(yamlPath, "utf-8");
    const workflow = yaml.load(raw);
    if (!workflow.steps || workflow.steps.length === 0) {
        console.log(chalk.red("No steps defined in colony.yaml."));
        process.exit(1);
    }
    const result = await runWorkflow(workflow, options.verbose);
    if (!result.success) {
        process.exit(1);
    }
}
