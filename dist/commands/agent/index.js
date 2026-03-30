import fs from "node:fs";
import path from "node:path";
import chalk from "chalk";
import inquirer from "inquirer";
import yaml from "js-yaml";
import { executeAgent } from "../../runtime/executor.js";
export async function agentInitCommand() {
    console.log(chalk.bold.cyan("\n🤖 Create a new Colony agent\n"));
    const answers = await inquirer.prompt([
        {
            type: "input",
            name: "name",
            message: "Agent name:",
            validate: (input) => (input.length > 0 ? true : "Name is required"),
        },
        {
            type: "input",
            name: "version",
            message: "Version:",
            default: "0.1.0",
        },
        {
            type: "input",
            name: "description",
            message: "Description:",
            validate: (input) => (input.length > 0 ? true : "Description is required"),
        },
        {
            type: "input",
            name: "author",
            message: "Author:",
        },
        {
            type: "editor",
            name: "system_prompt",
            message: "System prompt (opens editor):",
            default: "You are a helpful agent. Respond to the user's request clearly and thoroughly.",
        },
    ]);
    const agentSpec = {
        name: answers.name,
        version: answers.version,
        description: answers.description,
        author: answers.author || undefined,
        system_prompt: answers.system_prompt,
    };
    const targetPath = path.join(process.cwd(), "colony.agent.yaml");
    fs.writeFileSync(targetPath, yaml.dump(agentSpec), "utf-8");
    console.log(chalk.green(`\n✅ Created colony.agent.yaml`));
    console.log(chalk.dim("Test your agent with `colony agent test`."));
}
export async function agentTestCommand(options) {
    const agentPath = options.path || path.join(process.cwd(), "colony.agent.yaml");
    if (!fs.existsSync(agentPath)) {
        console.log(chalk.red("No colony.agent.yaml found."));
        console.log(chalk.dim("Run `colony agent init` to create one."));
        process.exit(1);
    }
    const raw = fs.readFileSync(agentPath, "utf-8");
    const spec = yaml.load(raw);
    const agent = {
        name: spec.name || "test-agent",
        version: "0.0.0",
        description: "Test run",
        system_prompt: spec.system_prompt,
    };
    const input = options.input || "Hello! Please introduce yourself and explain what you can do.";
    console.log(chalk.bold.cyan(`\n🧪 Testing agent: ${agent.name}\n`));
    const result = await executeAgent(agent, input, undefined, true);
    if (!result.success) {
        console.log(chalk.red(`\n❌ Test failed: ${result.error}`));
        process.exit(1);
    }
    console.log(chalk.green(`\n✅ Test passed`));
    console.log(chalk.dim(`📊 ${result.tokens_used} tokens, ${(result.duration_ms / 1000).toFixed(1)}s`));
}
