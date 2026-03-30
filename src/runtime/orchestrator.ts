import fs from "node:fs";
import ora from "ora";
import chalk from "chalk";
import { resolveAgent } from "../registry/index.js";
import { executeAgent } from "./executor.js";
import { createWorkingMemory } from "./memory.js";
import type { WorkflowSpec, WorkflowResult, AgentResult } from "../types/index.js";

export async function runWorkflow(
  workflow: WorkflowSpec,
  verbose = false,
): Promise<WorkflowResult> {
  const memory = createWorkingMemory();
  const results: AgentResult[] = [];
  let lastOutput = "";
  const startTime = Date.now();

  console.log(chalk.bold.cyan(`\n🔗 Running workflow: ${workflow.name}`));
  console.log(chalk.dim(`   ${workflow.description}\n`));

  for (let i = 0; i < workflow.steps.length; i++) {
    const step = workflow.steps[i];
    const spinner = ora({
      text: `Step ${i + 1}/${workflow.steps.length}: ${step.agent}`,
      color: "cyan",
    }).start();

    const agent = resolveAgent(step.agent);
    if (!agent) {
      spinner.fail(`Agent not found: ${step.agent}`);
      return {
        workflow: workflow.name,
        steps: results,
        total_tokens: results.reduce((sum, r) => sum + r.tokens_used, 0),
        total_duration_ms: Date.now() - startTime,
        final_output: lastOutput,
        success: false,
      };
    }

    const input = step.input || lastOutput;
    const context = memory.toContext();

    spinner.text = `Step ${i + 1}/${workflow.steps.length}: Running ${agent.name}...`;

    if (verbose) {
      spinner.stop();
    }

    const result = await executeAgent(agent, input, context || undefined, verbose);
    results.push(result);

    if (!result.success) {
      if (!verbose) spinner.fail(`${agent.name} failed: ${result.error}`);
      return {
        workflow: workflow.name,
        steps: results,
        total_tokens: results.reduce((sum, r) => sum + r.tokens_used, 0),
        total_duration_ms: Date.now() - startTime,
        final_output: lastOutput,
        success: false,
      };
    }

    lastOutput = result.output;
    memory.write(`step_${i + 1}_output`, result.output, agent.name, i + 1);

    if (!verbose) {
      spinner.succeed(
        `${agent.name} ${chalk.dim(`(${result.tokens_used} tokens, ${(result.duration_ms / 1000).toFixed(1)}s)`)}`,
      );
    }
  }

  // Save output if configured
  if (workflow.output?.save_to && lastOutput) {
    fs.writeFileSync(workflow.output.save_to, lastOutput, "utf-8");
    console.log(chalk.green(`\n📄 Output saved to ${workflow.output.save_to}`));
  }

  const totalResult: WorkflowResult = {
    workflow: workflow.name,
    steps: results,
    total_tokens: results.reduce((sum, r) => sum + r.tokens_used, 0),
    total_duration_ms: Date.now() - startTime,
    final_output: lastOutput,
    success: true,
  };

  console.log(chalk.bold.green(`\n✅ Workflow complete!`));
  console.log(
    chalk.dim(
      `   Total: ${totalResult.total_tokens} tokens, ${(totalResult.total_duration_ms / 1000).toFixed(1)}s`,
    ),
  );

  return totalResult;
}
