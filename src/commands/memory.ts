import chalk from "chalk";
import { persistentList, persistentClear, persistentSearch } from "../runtime/memory.js";

export function memoryListCommand(): void {
  const entries = persistentList();

  if (entries.length === 0) {
    console.log(chalk.dim("No persistent memory entries. Run a workflow with `memory.scope: persistent` to populate."));
    return;
  }

  console.log(chalk.bold(`\n  Persistent Memory (${entries.length} entries)\n`));

  for (const e of entries) {
    const confidence = e.confidence !== undefined ? chalk.dim(` [${e.confidence.toFixed(1)}]`) : "";
    const agent = e.agent ? chalk.dim(` (${e.agent})`) : "";
    const tags = e.tags && e.tags.length > 0 ? chalk.dim(` [${e.tags.join(", ")}]`) : "";
    console.log(`  ${chalk.cyan(e.key)}${confidence}${agent}${tags}`);
    console.log(`    ${e.value.length > 120 ? e.value.slice(0, 120) + "..." : e.value}`);
  }
  console.log();
}

export function memoryClearCommand(): void {
  persistentClear();
  console.log(chalk.green("  Persistent memory cleared."));
}

export function memorySearchCommand(query: string): void {
  const entries = persistentSearch(query);

  if (entries.length === 0) {
    console.log(chalk.dim(`No memory entries matching "${query}".`));
    return;
  }

  console.log(chalk.bold(`\n  Search results for "${query}" (${entries.length} matches)\n`));

  for (const e of entries) {
    const confidence = e.confidence !== undefined ? chalk.dim(` [${e.confidence.toFixed(1)}]`) : "";
    const agent = e.agent ? chalk.dim(` (${e.agent})`) : "";
    console.log(`  ${chalk.cyan(e.key)}${confidence}${agent}`);
    console.log(`    ${e.value.length > 120 ? e.value.slice(0, 120) + "..." : e.value}`);
  }
  console.log();
}
