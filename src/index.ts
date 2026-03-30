#!/usr/bin/env node

import { Command } from "commander";
import { setupCommand } from "./commands/setup.js";
import { configGetCommand, configSetCommand, configListCommand } from "./commands/config.js";
import { initCommand } from "./commands/init.js";
import { installCommand } from "./commands/install.js";
import { listCommand } from "./commands/list.js";
import { runCommand } from "./commands/run.js";
import { agentInitCommand, agentTestCommand } from "./commands/agent/index.js";
import { publishCommand } from "./commands/publish.js";

const program = new Command();

program
  .name("colony")
  .description("The universal agent composition standard — install, compose, and run AI agents")
  .version("0.1.0");

// Setup
program
  .command("setup")
  .description("Interactive setup for Colony configuration")
  .action(async () => {
    await setupCommand();
  });

// Config
const config = program
  .command("config")
  .description("Manage Colony configuration");

config
  .command("get <key>")
  .description("Get a configuration value")
  .action((key: string) => {
    configGetCommand(key);
  });

config
  .command("set <key> <value>")
  .description("Set a configuration value")
  .action((key: string, value: string) => {
    configSetCommand(key, value);
  });

config
  .command("list")
  .description("List all configuration values")
  .action(() => {
    configListCommand();
  });

// Init
program
  .command("init")
  .description("Create a colony.yaml workflow template in the current directory")
  .action(() => {
    initCommand();
  });

// Install
program
  .command("install <agent>")
  .description("Install an agent from the registry")
  .action((agent: string) => {
    installCommand(agent);
  });

// List
program
  .command("list")
  .description("List installed agents")
  .action(() => {
    listCommand();
  });

// Run
program
  .command("run")
  .description("Run a workflow or single agent")
  .option("-a, --agent <name>", "Run a single agent instead of a workflow")
  .option("-v, --verbose", "Show detailed output including streamed tokens")
  .option("-i, --input <text>", "Input text for the agent or workflow")
  .action(async (options) => {
    await runCommand(options);
  });

// Agent
const agent = program
  .command("agent")
  .description("Agent development commands");

agent
  .command("init")
  .description("Scaffold a new colony.agent.yaml interactively")
  .action(async () => {
    await agentInitCommand();
  });

agent
  .command("test")
  .description("Test an agent from colony.agent.yaml")
  .option("-p, --path <path>", "Path to colony.agent.yaml")
  .option("-i, --input <text>", "Test input for the agent")
  .action(async (options) => {
    await agentTestCommand(options);
  });

// Publish
program
  .command("publish")
  .description("Publish an agent to the Colony registry")
  .action(() => {
    publishCommand();
  });

program.parse();
