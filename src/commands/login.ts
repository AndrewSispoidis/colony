import inquirer from "inquirer";
import chalk from "chalk";
import ora from "ora";
import { saveConfig, loadConfig } from "../config/index.js";

const REGISTRY_URL = "https://colony-registry-production.up.railway.app";

export async function loginCommand(): Promise<void> {
  console.log(chalk.bold.cyan("\n  Colony Login\n"));

  const answers = await inquirer.prompt([
    {
      type: "input",
      name: "username",
      message: "Username:",
      validate: (input: string) => input.length > 0 || "Username is required",
    },
    {
      type: "password",
      name: "password",
      message: "Password:",
      validate: (input: string) => input.length > 0 || "Password is required",
    },
  ]);

  const spinner = ora("Logging in...").start();

  try {
    const res = await fetch(`${REGISTRY_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: answers.username, password: answers.password }),
    });

    if (!res.ok) {
      const data = await res.json() as { error?: string };
      spinner.fail(`Login failed: ${data.error || res.statusText}`);
      process.exit(1);
    }

    const data = await res.json() as { token: string };
    const config = loadConfig();
    config.jwt = data.token;
    saveConfig(config);
    spinner.succeed(`Logged in as ${chalk.cyan(answers.username)}`);
  } catch (err) {
    spinner.fail(`Login failed: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}

export async function registerCommand(): Promise<void> {
  console.log(chalk.bold.cyan("\n  Colony Register\n"));

  const answers = await inquirer.prompt([
    {
      type: "input",
      name: "username",
      message: "Username:",
      validate: (input: string) => input.length >= 3 || "Username must be at least 3 characters",
    },
    {
      type: "input",
      name: "email",
      message: "Email:",
      validate: (input: string) => input.includes("@") || "Enter a valid email",
    },
    {
      type: "password",
      name: "password",
      message: "Password:",
      validate: (input: string) => input.length >= 8 || "Password must be at least 8 characters",
    },
  ]);

  const spinner = ora("Creating account...").start();

  try {
    const res = await fetch(`${REGISTRY_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(answers),
    });

    if (!res.ok) {
      const data = await res.json() as { error?: string };
      spinner.fail(`Registration failed: ${data.error || res.statusText}`);
      process.exit(1);
    }

    const data = await res.json() as { token: string };
    const config = loadConfig();
    config.jwt = data.token;
    saveConfig(config);
    spinner.succeed(`Account created. Logged in as ${chalk.cyan(answers.username)}`);
  } catch (err) {
    spinner.fail(`Registration failed: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}
