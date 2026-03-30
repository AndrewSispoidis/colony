import chalk from "chalk";
import ora from "ora";
import { installAgent, getBundledAgentNames, resolveAgent } from "../registry/index.js";
export function installCommand(agentName) {
    const spinner = ora(`Installing ${agentName}...`).start();
    const success = installAgent(agentName);
    if (success) {
        const agent = resolveAgent(agentName);
        spinner.succeed(`Installed ${chalk.cyan(agentName)}`);
        if (agent) {
            console.log(chalk.dim(`  ${agent.description}`));
        }
    }
    else {
        spinner.fail(`Agent "${agentName}" not found in registry.`);
        console.log(chalk.dim("\nAvailable bundled agents:"));
        for (const name of getBundledAgentNames()) {
            console.log(chalk.dim(`  ${name}`));
        }
    }
}
