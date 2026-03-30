import chalk from "chalk";
import { getConfigValue, setConfigValue, loadConfig } from "../config/index.js";
export function configGetCommand(key) {
    const value = getConfigValue(key);
    if (value === undefined) {
        console.log(chalk.yellow(`No value set for "${key}"`));
    }
    else {
        console.log(`${key} = ${typeof value === "object" ? JSON.stringify(value, null, 2) : value}`);
    }
}
export function configSetCommand(key, value) {
    setConfigValue(key, value);
    console.log(chalk.green(`Set ${key} = ${value}`));
}
export function configListCommand() {
    const config = loadConfig();
    const entries = Object.entries(config);
    if (entries.length === 0) {
        console.log(chalk.dim("No configuration values set. Run `colony setup` to get started."));
        return;
    }
    console.log(chalk.bold("\nColony Configuration:\n"));
    for (const [key, value] of entries) {
        if (key === "apiKey" && typeof value === "string") {
            console.log(`  ${chalk.cyan(key)} = ${value.slice(0, 10)}...`);
        }
        else {
            console.log(`  ${chalk.cyan(key)} = ${typeof value === "object" ? JSON.stringify(value) : value}`);
        }
    }
    console.log();
}
