import fs from "node:fs";
import path from "node:path";
import chalk from "chalk";
const COLONY_YAML_TEMPLATE = `# Colony Workflow Configuration
# Docs: https://github.com/colony-dev/colony

name: my-workflow
version: "0.1.0"
description: "A Colony workflow"

# Orchestration strategy: sequential (default), parallel, or collaborative
# orchestration:
#   strategy: parallel
#   synthesizer: "@community/summarizer-agent"  # runs after all parallel agents
#
# For collaborative mode (agents iterate in rounds):
# orchestration:
#   strategy: collaborative
#   max_rounds: 3

# Memory persistence: working (default, in-memory) or persistent (SQLite)
# memory:
#   scope: persistent

steps:
  - agent: "@community/research-agent"
    input: "Research the given topic thoroughly"

  - agent: "@community/writer-agent"
    # Input defaults to previous step's output

  - agent: "@community/reviewer-agent"
    # Reviews the writer's output

output:
  save_to: "output.md"
  format: "markdown"
`;
export function initCommand() {
    const targetPath = path.join(process.cwd(), "colony.yaml");
    if (fs.existsSync(targetPath)) {
        console.log(chalk.yellow("colony.yaml already exists in this directory."));
        return;
    }
    fs.writeFileSync(targetPath, COLONY_YAML_TEMPLATE, "utf-8");
    console.log(chalk.green("  Created colony.yaml"));
    console.log(chalk.dim("Edit the file to configure your workflow, then run `colony run`."));
}
