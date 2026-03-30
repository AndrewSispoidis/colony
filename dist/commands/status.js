import chalk from "chalk";
import { getAnthropicKey, getOpenAIKey, getBestAvailableProvider } from "../config/index.js";
import { listInstalledAgents } from "../registry/index.js";
import { checkCrawdadStatus } from "../runtime/executor.js";
const REGISTRY_URL = "https://colony-registry-production.up.railway.app";
export async function statusCommand() {
    console.log(chalk.bold.cyan("\n  Colony Status\n"));
    // API keys
    const anthropicKey = getAnthropicKey();
    const openaiKey = getOpenAIKey();
    const provider = getBestAvailableProvider();
    console.log(`  Anthropic API:  ${anthropicKey ? chalk.green("configured") : chalk.red("not configured")}`);
    console.log(`  OpenAI API:     ${openaiKey ? chalk.green("configured") : chalk.dim("not configured")}`);
    console.log(`  Default provider: ${provider ? chalk.cyan(provider) : chalk.red("none")}`);
    // Crawdad sidecar
    const crawdadUp = await checkCrawdadStatus();
    console.log(`  Crawdad sidecar: ${crawdadUp ? chalk.green("running") : chalk.dim("not running")}`);
    // Registry
    try {
        const res = await fetch(`${REGISTRY_URL}/health`, { signal: AbortSignal.timeout(3000) });
        const data = await res.json();
        console.log(`  Registry:       ${chalk.green("connected")} ${data.db ? chalk.dim("(db ready)") : chalk.yellow("(no db)")}`);
    }
    catch {
        console.log(`  Registry:       ${chalk.red("unreachable")}`);
    }
    // Installed agents
    const agents = listInstalledAgents();
    console.log(`  Installed agents: ${agents.length > 0 ? chalk.cyan(String(agents.length)) : chalk.dim("0")}`);
    console.log();
}
