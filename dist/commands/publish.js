import fs from "node:fs";
import path from "node:path";
import chalk from "chalk";
import ora from "ora";
import yaml from "js-yaml";
import { loadConfig } from "../config/index.js";
const REGISTRY_URL = "https://colony-registry-production.up.railway.app";
export async function publishCommand() {
    const agentPath = path.join(process.cwd(), "colony.agent.yaml");
    if (!fs.existsSync(agentPath)) {
        console.log(chalk.red("No colony.agent.yaml found in current directory."));
        console.log(chalk.dim("Run `colony agent init` to create an agent."));
        process.exit(1);
    }
    const raw = fs.readFileSync(agentPath, "utf-8");
    const spec = yaml.load(raw);
    const errors = [];
    if (!spec.name)
        errors.push("Missing required field: name");
    if (!spec.version)
        errors.push("Missing required field: version");
    if (!spec.description)
        errors.push("Missing required field: description");
    if (!spec.system_prompt)
        errors.push("Missing required field: system_prompt");
    if (errors.length > 0) {
        console.log(chalk.red("\n  Validation failed:\n"));
        for (const error of errors) {
            console.log(chalk.red(`  - ${error}`));
        }
        process.exit(1);
    }
    const config = loadConfig();
    if (!config.jwt) {
        console.log(chalk.red("Not logged in. Run `colony login` first."));
        process.exit(1);
    }
    // Parse namespace from name (e.g. "@myns/my-agent" → namespace=myns, name=my-agent)
    const nameMatch = spec.name.match(/^@([^/]+)\/(.+)$/);
    const namespace = nameMatch ? nameMatch[1] : "community";
    const agentName = nameMatch ? nameMatch[2] : spec.name;
    console.log(chalk.bold.cyan("\n  Publishing agent\n"));
    console.log(`  Name:        ${chalk.cyan(spec.name)}`);
    console.log(`  Version:     ${spec.version}`);
    console.log(`  Description: ${spec.description}\n`);
    const spinner = ora("Publishing to registry...").start();
    try {
        const res = await fetch(`${REGISTRY_URL}/agents`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${config.jwt}`,
            },
            body: JSON.stringify({
                namespace,
                name: agentName,
                version: spec.version,
                spec,
                description: spec.description,
                tags: spec.tags || [],
            }),
        });
        if (!res.ok) {
            const data = await res.json();
            spinner.fail(`Publish failed: ${data.error || res.statusText}`);
            process.exit(1);
        }
        spinner.succeed(`Published ${chalk.cyan(spec.name)}@${spec.version} to the Colony Registry`);
    }
    catch (err) {
        spinner.fail(`Publish failed: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
    }
}
