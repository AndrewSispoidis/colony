import chalk from "chalk";
import { listInstalledAgents, resolveAgent } from "../registry/index.js";

export function listCommand(): void {
  const agents = listInstalledAgents();

  if (agents.length === 0) {
    console.log(chalk.dim("No agents installed. Run `colony install <agent>` to get started."));
    return;
  }

  console.log(chalk.bold("\nInstalled Agents:\n"));
  for (const name of agents) {
    const spec = resolveAgent(name);
    if (spec) {
      console.log(`  ${chalk.cyan(name)} ${chalk.dim(`v${spec.version}`)} — ${spec.description}`);
    } else {
      console.log(`  ${chalk.cyan(name)}`);
    }
  }
  console.log();
}
