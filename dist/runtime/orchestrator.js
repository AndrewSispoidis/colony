import fs from "node:fs";
import ora from "ora";
import chalk from "chalk";
import { resolveAgent } from "../registry/index.js";
import { executeAgent } from "./executor.js";
import { createWorkingMemory, persistentSave, persistentLoad } from "./memory.js";
function buildResult(workflow, results, startTime, lastOutput, success) {
    return {
        workflow: workflow.name,
        steps: results,
        total_tokens: results.reduce((sum, r) => sum + r.tokens_used, 0),
        total_duration_ms: Date.now() - startTime,
        final_output: lastOutput,
        success,
    };
}
// --- Sequential orchestration ---
async function runSequential(workflow, verbose) {
    const memory = createWorkingMemory();
    const results = [];
    let lastOutput = "";
    const startTime = Date.now();
    if (workflow.memory?.scope === "persistent") {
        for (const e of persistentLoad()) {
            memory.write(e.key, e.value, e.agent, e.step, e.confidence, e.tags);
        }
    }
    for (let i = 0; i < workflow.steps.length; i++) {
        const step = workflow.steps[i];
        const spinner = ora({ text: `Step ${i + 1}/${workflow.steps.length}: ${step.agent}`, color: "cyan" }).start();
        const agent = resolveAgent(step.agent);
        if (!agent) {
            spinner.fail(`Agent not found: ${step.agent}`);
            return buildResult(workflow, results, startTime, lastOutput, false);
        }
        const input = step.input || lastOutput;
        const context = memory.toContext(agent.tags);
        spinner.text = `Step ${i + 1}/${workflow.steps.length}: Running ${agent.name}...`;
        if (verbose)
            spinner.stop();
        const result = await executeAgent(agent, input, context || undefined, verbose);
        results.push(result);
        if (!result.success) {
            if (!verbose)
                spinner.fail(`${agent.name} failed: ${result.error}`);
            return buildResult(workflow, results, startTime, lastOutput, false);
        }
        const cleanedOutput = memory.parseAndStore(result.output, agent.name, i + 1);
        lastOutput = cleanedOutput;
        memory.write(`step_${i + 1}_output`, cleanedOutput, agent.name, i + 1);
        if (!verbose) {
            spinner.succeed(`${agent.name} ${chalk.dim(`(${result.tokens_used} tokens, ${(result.duration_ms / 1000).toFixed(1)}s)`)}`);
        }
    }
    if (workflow.memory?.scope === "persistent") {
        persistentSave(memory.entries);
    }
    return buildResult(workflow, results, startTime, lastOutput, true);
}
// --- Parallel orchestration ---
async function runParallel(workflow, verbose) {
    const memory = createWorkingMemory();
    const startTime = Date.now();
    if (workflow.memory?.scope === "persistent") {
        for (const e of persistentLoad()) {
            memory.write(e.key, e.value, e.agent, e.step, e.confidence, e.tags);
        }
    }
    // Resolve all agents first
    const agentsAndSteps = [];
    for (let i = 0; i < workflow.steps.length; i++) {
        const step = workflow.steps[i];
        const agent = resolveAgent(step.agent);
        if (!agent) {
            console.log(chalk.red(`Agent not found: ${step.agent}`));
            return buildResult(workflow, [], startTime, "", false);
        }
        agentsAndSteps.push({ agent, input: step.input || "Please provide your analysis.", index: i });
    }
    // Find synthesizer (last agent tagged synthesizer: true, or by orchestration.synthesizer)
    const synthName = workflow.orchestration?.synthesizer;
    const parallelAgents = synthName
        ? agentsAndSteps.filter(a => a.agent.name !== synthName && !a.agent.name.endsWith(`/${synthName}`))
        : agentsAndSteps.filter(a => !a.agent.synthesizer);
    const synthAgent = synthName
        ? agentsAndSteps.find(a => a.agent.name === synthName || a.agent.name.endsWith(`/${synthName}`))
        : agentsAndSteps.find(a => a.agent.synthesizer);
    console.log(chalk.bold.cyan(`\n   Running ${parallelAgents.length} agents in parallel...`));
    // Launch all parallel agents
    const spinners = parallelAgents.map(a => ora({ text: `  ${a.agent.name}...`, color: "cyan" }).start());
    const promises = parallelAgents.map(async (a, idx) => {
        const context = memory.toContext(a.agent.tags);
        const result = await executeAgent(a.agent, a.input, context || undefined, verbose);
        if (result.success) {
            spinners[idx].succeed(`${a.agent.name} ${chalk.dim(`(${result.tokens_used} tokens, ${(result.duration_ms / 1000).toFixed(1)}s)`)}`);
        }
        else {
            spinners[idx].fail(`${a.agent.name} failed: ${result.error}`);
        }
        return result;
    });
    const parallelResults = await Promise.all(promises);
    const results = [...parallelResults];
    // Store all outputs in memory
    for (let i = 0; i < parallelResults.length; i++) {
        const r = parallelResults[i];
        if (r.success) {
            const cleaned = memory.parseAndStore(r.output, r.agent, i + 1);
            memory.write(`parallel_${i + 1}_output`, cleaned, r.agent, i + 1);
        }
    }
    let lastOutput = parallelResults
        .filter(r => r.success)
        .map(r => `## ${r.agent}\n\n${r.output}`)
        .join("\n\n---\n\n");
    // Run synthesizer if present
    if (synthAgent) {
        const synthSpinner = ora({ text: `Running synthesizer: ${synthAgent.agent.name}...`, color: "green" }).start();
        const context = memory.toContext(synthAgent.agent.tags);
        const synthResult = await executeAgent(synthAgent.agent, lastOutput, context || undefined, verbose);
        results.push(synthResult);
        if (synthResult.success) {
            lastOutput = memory.parseAndStore(synthResult.output, synthAgent.agent.name, workflow.steps.length);
            synthSpinner.succeed(`${synthAgent.agent.name} ${chalk.dim(`(${synthResult.tokens_used} tokens)`)}`);
        }
        else {
            synthSpinner.fail(`Synthesizer failed: ${synthResult.error}`);
        }
    }
    if (workflow.memory?.scope === "persistent") {
        persistentSave(memory.entries);
    }
    return buildResult(workflow, results, startTime, lastOutput, results.every(r => r.success));
}
// --- Collaborative orchestration ---
function textSimilarity(a, b) {
    if (a === b)
        return 1;
    const aWords = new Set(a.toLowerCase().split(/\s+/));
    const bWords = new Set(b.toLowerCase().split(/\s+/));
    const intersection = new Set([...aWords].filter(w => bWords.has(w)));
    const union = new Set([...aWords, ...bWords]);
    return union.size === 0 ? 1 : intersection.size / union.size;
}
async function runCollaborative(workflow, verbose) {
    const memory = createWorkingMemory();
    const startTime = Date.now();
    const maxRounds = workflow.orchestration?.max_rounds || 3;
    const results = [];
    if (workflow.memory?.scope === "persistent") {
        for (const e of persistentLoad()) {
            memory.write(e.key, e.value, e.agent, e.step, e.confidence, e.tags);
        }
    }
    // Resolve all agents
    const agents = [];
    for (const step of workflow.steps) {
        const agent = resolveAgent(step.agent);
        if (!agent) {
            console.log(chalk.red(`Agent not found: ${step.agent}`));
            return buildResult(workflow, [], startTime, "", false);
        }
        agents.push(agent);
    }
    const previousOutputs = new Map();
    const taskInput = workflow.steps[0]?.input || "Please provide your analysis.";
    for (let round = 0; round < maxRounds; round++) {
        console.log(chalk.bold.cyan(`\n   Round ${round + 1}/${maxRounds} — ${agents.length} agents collaborating...`));
        let allConverged = true;
        for (let i = 0; i < agents.length; i++) {
            const agent = agents[i];
            // Check for ISSUE: directives targeting this agent
            const issues = memory.entries.filter(e => e.key.startsWith("issue_") && e.value.toLowerCase().includes(agent.name.toLowerCase()));
            const issueContext = issues.length > 0
                ? `\n\nISSUES raised for you:\n${issues.map(e => `- ${e.value} (from: ${e.agent})`).join("\n")}`
                : "";
            const context = memory.toContext(agent.tags) + issueContext;
            const spinner = ora({ text: `  ${agent.name} (round ${round + 1})...`, color: "cyan" }).start();
            const result = await executeAgent(agent, taskInput, context || undefined, verbose);
            results.push(result);
            if (!result.success) {
                spinner.fail(`${agent.name} failed: ${result.error}`);
                continue;
            }
            const cleaned = memory.parseAndStore(result.output, agent.name, round * agents.length + i + 1);
            // Parse ISSUE: lines from output
            const issueLines = cleaned.split("\n").filter(l => l.trim().startsWith("ISSUE:"));
            for (let j = 0; j < issueLines.length; j++) {
                memory.write(`issue_r${round}_${i}_${j}`, issueLines[j].replace("ISSUE:", "").trim(), agent.name, round);
            }
            // Check convergence
            const prevOutput = previousOutputs.get(agent.name);
            if (prevOutput) {
                const similarity = textSimilarity(prevOutput, cleaned);
                if (similarity < 0.9)
                    allConverged = false;
            }
            else {
                allConverged = false;
            }
            previousOutputs.set(agent.name, cleaned);
            memory.write(`collab_${agent.name}_r${round}`, cleaned, agent.name, round);
            spinner.succeed(`${agent.name} ${chalk.dim(`(${result.tokens_used} tokens)`)}`);
        }
        if (allConverged) {
            console.log(chalk.green(`\n   Converged after ${round + 1} rounds`));
            break;
        }
    }
    const lastOutput = [...previousOutputs.entries()]
        .map(([name, output]) => `## ${name}\n\n${output}`)
        .join("\n\n---\n\n");
    if (workflow.memory?.scope === "persistent") {
        persistentSave(memory.entries);
    }
    return buildResult(workflow, results, startTime, lastOutput, results.some(r => r.success));
}
// --- Main entry point ---
export async function runWorkflow(workflow, verbose = false) {
    const strategy = workflow.orchestration?.strategy || "sequential";
    console.log(chalk.bold.cyan(`\n  Running workflow: ${workflow.name}`));
    console.log(chalk.dim(`   ${workflow.description}`));
    console.log(chalk.dim(`   Strategy: ${strategy}\n`));
    let result;
    switch (strategy) {
        case "parallel":
            result = await runParallel(workflow, verbose);
            break;
        case "collaborative":
            result = await runCollaborative(workflow, verbose);
            break;
        default:
            result = await runSequential(workflow, verbose);
    }
    // Save output if configured
    if (workflow.output?.save_to && result.final_output) {
        fs.writeFileSync(workflow.output.save_to, result.final_output, "utf-8");
        console.log(chalk.green(`\n   Output saved to ${workflow.output.save_to}`));
    }
    if (result.success) {
        console.log(chalk.bold.green(`\n   Workflow complete!`));
    }
    console.log(chalk.dim(`   Total: ${result.total_tokens} tokens, ${(result.total_duration_ms / 1000).toFixed(1)}s`));
    return result;
}
