import inquirer from "inquirer";
import chalk from "chalk";
import { saveConfig, loadConfig } from "../config/index.js";

export async function setupCommand(): Promise<void> {
  console.log(chalk.bold.cyan("\n🐝 Colony Setup\n"));

  const config = loadConfig();

  const answers = await inquirer.prompt([
    {
      type: "password",
      name: "apiKey",
      message: "Anthropic API key:",
      default: config.apiKey ? "••••••••" : undefined,
      validate: (input: string) => {
        if (!input || input === "••••••••") return true;
        if (!input.startsWith("sk-ant-")) {
          return "API key should start with sk-ant-";
        }
        return true;
      },
    },
    {
      type: "input",
      name: "defaultModel",
      message: "Default model:",
      default: config.defaultModel || "claude-opus-4-5-20250514",
    },
  ]);

  if (answers.apiKey && answers.apiKey !== "••••••••") {
    config.apiKey = answers.apiKey;
  }
  config.defaultModel = answers.defaultModel;

  saveConfig(config);
  console.log(chalk.green("\n✅ Configuration saved to ~/.colony/config.json\n"));
}
