import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import chalk from "chalk";
import { getAnthropicKey, getOpenAIKey, getBestAvailableProvider } from "../config/index.js";
import type { AgentSpec, AgentResult } from "../types/index.js";

const CRAWDAD_URL = process.env.CRAWDAD_SIDECAR_URL || "http://localhost:7749";

async function scanWithCrawdad(content: string): Promise<void> {
  try {
    const res = await fetch(`${CRAWDAD_URL}/v1/firewall/scan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      const data = await res.json() as { blocked?: boolean; reason?: string };
      if (data.blocked) {
        throw new Error(`Crawdad blocked request: ${data.reason || "policy violation"}`);
      }
    }
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("Crawdad blocked")) throw err;
  }
}

export async function checkCrawdadStatus(): Promise<boolean> {
  try {
    const res = await fetch(`${CRAWDAD_URL}/health`, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}

async function executeWithAnthropic(
  agent: AgentSpec,
  userMessage: string,
  verbose: boolean,
): Promise<{ output: string; tokensUsed: number }> {
  const apiKey = getAnthropicKey();
  if (!apiKey) throw new Error("No Anthropic API key configured.");

  const client = new Anthropic({ apiKey });
  const model = agent.model || "claude-sonnet-4-20250514";

  const stream = client.messages.stream({
    model,
    max_tokens: 4096,
    system: agent.system_prompt,
    messages: [{ role: "user", content: userMessage }],
  });

  let output = "";
  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      output += event.delta.text;
      if (verbose) process.stdout.write(chalk.white(event.delta.text));
    }
  }

  const finalMessage = await stream.finalMessage();
  const tokensUsed = (finalMessage.usage?.input_tokens || 0) + (finalMessage.usage?.output_tokens || 0);
  return { output, tokensUsed };
}

async function executeWithOpenAI(
  agent: AgentSpec,
  userMessage: string,
  verbose: boolean,
): Promise<{ output: string; tokensUsed: number }> {
  const apiKey = getOpenAIKey();
  if (!apiKey) throw new Error("No OpenAI API key configured.");

  const client = new OpenAI({ apiKey });
  const model = agent.model || "gpt-4o";

  const stream = await client.chat.completions.create({
    model,
    max_tokens: 4096,
    messages: [
      { role: "system", content: agent.system_prompt },
      { role: "user", content: userMessage },
    ],
    stream: true,
  });

  let output = "";
  let tokensUsed = 0;
  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content || "";
    output += text;
    if (verbose && text) process.stdout.write(chalk.white(text));
    if (chunk.usage) {
      tokensUsed = (chunk.usage.prompt_tokens || 0) + (chunk.usage.completion_tokens || 0);
    }
  }
  return { output, tokensUsed };
}

export async function executeAgent(
  agent: AgentSpec,
  input: string,
  context?: string,
  verbose = false,
): Promise<AgentResult> {
  const provider = agent.provider || getBestAvailableProvider();
  if (!provider) {
    return {
      agent: agent.name,
      output: "",
      tokens_used: 0,
      duration_ms: 0,
      success: false,
      error: "No API key configured. Run `colony setup` or set ANTHROPIC_API_KEY / OPENAI_API_KEY.",
    };
  }

  let userMessage = input;
  if (context) {
    userMessage = `${context}\n\n---\n\n${input}`;
  }

  const startTime = Date.now();

  try {
    await scanWithCrawdad(userMessage);

    if (verbose) console.log(chalk.dim(`\n--- ${agent.name} (${provider}) ---`));

    const { output, tokensUsed } = provider === "openai"
      ? await executeWithOpenAI(agent, userMessage, verbose)
      : await executeWithAnthropic(agent, userMessage, verbose);

    if (verbose) console.log(chalk.dim(`\n--- end ${agent.name} ---\n`));

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
      tokens_used: 0,
      duration_ms: Date.now() - startTime,
      success: false,
      error: errorMessage,
    };
  }
}
