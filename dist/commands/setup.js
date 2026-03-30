import inquirer from "inquirer";
import chalk from "chalk";
import { saveConfig, loadConfig } from "../config/index.js";
export async function setupCommand() {
    console.log(chalk.bold.cyan("\n  Colony Setup\n"));
    const config = loadConfig();
    const answers = await inquirer.prompt([
        {
            type: "password",
            name: "apiKey",
            message: "Anthropic API key:",
            default: config.apiKey ? "********" : undefined,
            validate: (input) => {
                if (!input || input === "********")
                    return true;
                if (!input.startsWith("sk-ant-")) {
                    return "API key should start with sk-ant-";
                }
                return true;
            },
        },
        {
            type: "password",
            name: "openaiKey",
            message: "OpenAI API key (optional):",
            default: config.openaiKey ? "********" : undefined,
            validate: (input) => {
                if (!input || input === "********")
                    return true;
                if (!input.startsWith("sk-")) {
                    return "API key should start with sk-";
                }
                return true;
            },
        },
        {
            type: "list",
            name: "defaultProvider",
            message: "Default provider:",
            choices: ["anthropic", "openai"],
            default: config.defaultProvider || "anthropic",
        },
        {
            type: "input",
            name: "defaultModel",
            message: "Default model:",
            default: config.defaultModel || "claude-sonnet-4-20250514",
        },
    ]);
    if (answers.apiKey && answers.apiKey !== "********") {
        config.apiKey = answers.apiKey;
    }
    if (answers.openaiKey && answers.openaiKey !== "********") {
        config.openaiKey = answers.openaiKey;
    }
    config.defaultProvider = answers.defaultProvider;
    config.defaultModel = answers.defaultModel;
    saveConfig(config);
    console.log(chalk.green("\n  Configuration saved to ~/.colony/config.json\n"));
}
