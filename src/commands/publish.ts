import fs from "node:fs";
import path from "node:path";
import chalk from "chalk";
import yaml from "js-yaml";
import type { AgentSpec } from "../types/index.js";

export function publishCommand(): void {
  const agentPath = path.join(process.cwd(), "colony.agent.yaml");

  if (!fs.existsSync(agentPath)) {
    console.log(chalk.red("No colony.agent.yaml found in current directory."));
    console.log(chalk.dim("Run `colony agent init` to create an agent."));
    process.exit(1);
  }

  const raw = fs.readFileSync(agentPath, "utf-8");
  const spec = yaml.load(raw) as AgentSpec;

  // Validate required fields
  const errors: string[] = [];
  if (!spec.name) errors.push("Missing required field: name");
  if (!spec.version) errors.push("Missing required field: version");
  if (!spec.description) errors.push("Missing required field: description");
  if (!spec.system_prompt) errors.push("Missing required field: system_prompt");

  if (errors.length > 0) {
    console.log(chalk.red("\n❌ Validation failed:\n"));
    for (const error of errors) {
      console.log(chalk.red(`  • ${error}`));
    }
    process.exit(1);
  }

  console.log(chalk.bold.cyan("\n📦 Agent Validation Passed\n"));
  console.log(`  Name:        ${chalk.cyan(spec.name)}`);
  console.log(`  Version:     ${spec.version}`);
  console.log(`  Description: ${spec.description}`);

  console.log(chalk.yellow("\n🚀 Colony Registry is launching soon!"));
  console.log(chalk.dim("   Your agent is valid and ready to publish."));
  console.log(chalk.dim("   Registry publishing will be available in a future update.\n"));
}
