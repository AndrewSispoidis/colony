import Anthropic from "@anthropic-ai/sdk";
import chalk from "chalk";
import { getAnthropicKey } from "../config/index.js";
import type { AgentSpec, AgentResult } from "../types/index.js";

export async function executeAgent(
  agent: AgentSpec,
  input: string,
  context?: string,
  verbose = false,
): Promise<AgentResult> {
  const apiKey = getAnthropicKey();
  if (!apiKey) {
    return {
      agent: agent.name,
      output: "",
      tokens_used: 0,
      duration_ms: 0,
      success: false,
      error: "No API key configured. Run `colony setup` or set ANTHROPIC_API_KEY.",
    };
  }

  const client = new Anthropic({ apiKey });
  const model = agent.model || "claude-opus-4-5-20250514";

  let userMessage = input;
  if (context) {
    userMessage = `${context}\n\n---\n\n${input}`;
  }

  const startTime = Date.now();
  let output = "";
  let tokensUsed = 0;

  try {
    if (verbose) {
      console.log(chalk.dim(`\n--- ${agent.name} ---`));
    }

    const stream = client.messages.stream({
      model,
      max_tokens: 4096,
      system: agent.system_prompt,
      messages: [{ role: "user", content: userMessage }],
    });

    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        const text = event.delta.text;
        output += text;
        if (verbose) {
          process.stdout.write(chalk.white(text));
        }
      }
    }

    const finalMessage = await stream.finalMessage();
    tokensUsed =
      (finalMessage.usage?.input_tokens || 0) +
      (finalMessage.usage?.output_tokens || 0);

    if (verbose) {
      console.log(chalk.dim(`\n--- end ${agent.name} ---\n`));
    }

    return {
      agent: agent.name,
      output,
      tokens_used: tokensUsed,
      duration_ms: Date.now() - startTime,
      success: true,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return {
      agent: agent.name,
      output: "",
      tokens_used: tokensUsed,
      duration_ms: Date.now() - startTime,
      success: false,
      error: errorMessage,
    };
  }
}
