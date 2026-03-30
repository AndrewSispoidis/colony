# Colony

**The universal agent composition standard — install, compose, and run AI agents from a community registry. No framework required.**

---

## Part 1: Vision

Colony is an open standard for defining, sharing, and composing AI agents. It provides the missing infrastructure layer between foundation models and production agent workflows — letting anyone install community agents, wire them into multi-step workflows, and run them with a single command.

Colony is to AI agents what npm is to JavaScript packages: a universal registry and composition layer that makes the ecosystem interoperable.

### Core Principles

- **Agents are portable.** An agent defined once runs anywhere Colony runs.
- **Composition over frameworks.** Wire any agents together without buying into a monolithic framework.
- **Community-first.** A shared registry means agents get better collectively.
- **YAML-native.** Workflows and agent specs are human-readable YAML — no code required to compose.
- **Model-agnostic by design.** Agents declare which models they need; Colony handles the rest.

---

## Part 2: Agent Specification

An agent is defined by a `colony.agent.yaml` file:

```yaml
name: "@scope/agent-name"
version: "1.0.0"
description: "What this agent does"
author: "author-name"

model: "claude-opus-4-5-20250514"

system_prompt: |
  You are a specialized agent that...

input_schema:
  type: object
  properties:
    topic:
      type: string
      description: "The topic to process"
  required:
    - topic

output_schema:
  type: object
  properties:
    result:
      type: string

tools:
  - web_search
  - file_read

config:
  max_tokens: 4096
  temperature: 0.7
```

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Scoped package name (`@scope/name`) |
| `version` | string | Semantic version |
| `description` | string | Human-readable description |
| `system_prompt` | string | The agent's system prompt |

### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `author` | string | Agent author |
| `model` | string | Preferred model identifier |
| `input_schema` | object | JSON Schema for expected input |
| `output_schema` | object | JSON Schema for output format |
| `tools` | string[] | Tool capabilities the agent needs |
| `config` | object | Model configuration overrides |

---

## Part 3: Workflow Specification

Workflows compose agents into multi-step pipelines using `colony.yaml`:

```yaml
name: research-and-write
version: "0.1.0"
description: "Research a topic and produce a polished article"

steps:
  - agent: "@community/research-agent"
    input: "Research the history and current state of quantum computing"

  - agent: "@community/writer-agent"
    # Receives research output as input automatically

  - agent: "@community/reviewer-agent"
    # Reviews the written article

output:
  save_to: "article.md"
  format: "markdown"
```

### How Steps Execute

1. Steps run **sequentially** in the order defined.
2. Each step's output becomes the next step's input (unless `input` is explicitly set).
3. A **working memory** carries context across steps — each agent can see what previous agents produced.
4. If any step fails, the workflow halts and reports the error.

### Step Configuration

Each step supports:

| Field | Type | Description |
|-------|------|-------------|
| `agent` | string | Agent name or local path (`./my-agent`) |
| `input` | string | Explicit input (overrides previous output) |
| `config` | object | Per-step config overrides |

---

## Part 4: Registry

The Colony Registry is the community hub for sharing agents. Agents are published and installed using scoped names:

```bash
# Install from the registry
colony install @community/research-agent

# Install from a specific scope
colony install @myorg/custom-agent

# Publish your agent
colony publish
```

### Registry Architecture

- Agents are stored at `~/.colony/agents/<scope>/<name>/`
- Each installed agent contains its `colony.agent.yaml` manifest
- The registry supports scoped namespaces for organizations and communities
- Version resolution follows semver conventions

### Bundled Agents

Colony ships with five community agents available immediately:

| Agent | Description |
|-------|-------------|
| `@community/research-agent` | Deep research and synthesis |
| `@community/writer-agent` | Polished content creation |
| `@community/reviewer-agent` | Quality review and feedback |
| `@community/summarizer-agent` | Concise summarization |
| `@community/analyst-agent` | Data analysis and insights |

---

## Part 5: Working Memory

Colony's working memory system provides context continuity across workflow steps.

### How It Works

- Each workflow execution creates a **WorkingMemory** instance
- As each agent completes, its output is written to memory with metadata
- Subsequent agents receive the accumulated memory as context
- Memory entries include: key, value, timestamp, source agent, and step number

### Memory Context Format

```
<working_memory>
[step_1_output]: Research findings on quantum computing... (from: @community/research-agent)
[step_2_output]: Draft article on quantum computing... (from: @community/writer-agent)
</working_memory>
```

This allows downstream agents to reference any previous step's output, not just the immediately preceding one.

---

## Part 6: CLI Reference

### Commands

```
colony setup              Interactive configuration setup
colony config get <key>   Get a config value
colony config set <k> <v> Set a config value
colony config list        List all config values
colony init               Create colony.yaml in current directory
colony install <agent>    Install an agent from the registry
colony list               List installed agents
colony run                Run the workflow defined in colony.yaml
colony run --agent <name> Run a single agent directly
colony run --verbose      Show streamed token output
colony agent init         Scaffold a new agent interactively
colony agent test         Test an agent from colony.agent.yaml
colony publish            Publish an agent to the registry
```

### Global Options

```
--help     Show help for any command
--version  Show Colony version
```

### Configuration

Colony stores configuration at `~/.colony/config.json`. The API key can also be set via the `ANTHROPIC_API_KEY` environment variable (takes precedence over config).

---

## Part 7: Local Development

### Creating an Agent

```bash
# Scaffold a new agent
colony agent init

# This creates colony.agent.yaml with interactive prompts
# Edit the system_prompt to define your agent's behavior

# Test your agent
colony agent test
colony agent test --input "Custom test input"
```

### Local Agent References

Workflows can reference local agents by path:

```yaml
steps:
  - agent: "./my-local-agent"
    input: "Process this data"
```

Colony looks for `colony.agent.yaml` inside the referenced directory.

### Development Workflow

1. `colony agent init` — scaffold your agent
2. Edit `colony.agent.yaml` — refine the system prompt
3. `colony agent test` — verify behavior
4. `colony publish` — share with the community

---

## Part 8: Composition Patterns

### Sequential Pipeline

The most common pattern — each agent builds on the previous:

```yaml
steps:
  - agent: "@community/research-agent"
    input: "Investigate renewable energy trends"
  - agent: "@community/analyst-agent"
  - agent: "@community/writer-agent"
  - agent: "@community/reviewer-agent"
```

### Specialist Delegation

Use specific agents for specific subtasks:

```yaml
steps:
  - agent: "@community/research-agent"
    input: "Gather data on market trends in AI"
  - agent: "@community/analyst-agent"
    input: "Analyze the research for investment opportunities"
  - agent: "@community/summarizer-agent"
    input: "Create an executive summary"
```

### Quality Assurance Loop

Research, write, review:

```yaml
steps:
  - agent: "@community/research-agent"
    input: "Deep dive into container orchestration"
  - agent: "@community/writer-agent"
  - agent: "@community/reviewer-agent"
  - agent: "@community/writer-agent"
    # Rewrites based on review feedback
```

---

## Part 9: Architecture

### System Overview

```
┌─────────────┐     ┌──────────────┐     ┌────────────┐
│  colony.yaml │────▶│ Orchestrator │────▶│  Executor   │
│  (workflow)  │     │  (runtime)   │     │ (API calls) │
└─────────────┘     └──────┬───────┘     └────────────┘
                           │
                    ┌──────┴───────┐
                    │Working Memory│
                    └──────────────┘
```

### Components

- **CLI** (`src/index.ts`) — Commander-based CLI that wires all commands
- **Config** (`src/config/`) — Manages `~/.colony/config.json` and API keys
- **Registry** (`src/registry/`) — Agent resolution, installation, and bundled agents
- **Runtime** — Three modules:
  - **Executor** (`src/runtime/executor.ts`) — Calls Anthropic API with streaming
  - **Orchestrator** (`src/runtime/orchestrator.ts`) — Runs multi-step workflows
  - **Memory** (`src/runtime/memory.ts`) — Working memory across steps
- **Commands** (`src/commands/`) — Individual CLI command implementations

### Agent Resolution Order

1. Local path (`./` or absolute path)
2. Bundled agents (built into Colony)
3. Installed agents (`~/.colony/agents/`)

---

## Part 10: Roadmap

### v0.1.0 (Current)

- [x] CLI with all core commands
- [x] Sequential workflow orchestration
- [x] Working memory system
- [x] 5 bundled community agents
- [x] Agent scaffolding and testing
- [x] Local agent development

### v0.2.0 (Planned)

- [ ] Live Colony Registry for publishing and installing agents
- [ ] Parallel step execution
- [ ] Conditional branching in workflows
- [ ] Agent-to-agent communication channels
- [ ] Workflow variables and templating

### v0.3.0 (Future)

- [ ] Multi-model support (OpenAI, Google, local models)
- [ ] Tool plugins (web search, file I/O, API calls)
- [ ] Workflow visualization and debugging UI
- [ ] Agent versioning and dependency resolution
- [ ] Hosted workflow execution

### Long-Term Vision

Colony aims to be the **universal standard** for agent composition. Just as containers standardized application deployment and package managers standardized code sharing, Colony standardizes how AI agents are defined, shared, and composed.

The end state: a world where thousands of specialized agents are available in the registry, composable into arbitrarily complex workflows with a few lines of YAML, and executable anywhere with `colony run`.

---

## Getting Started

```bash
# Install Colony
npm install -g colony

# Set up your API key
colony setup

# Install some agents
colony install @community/research-agent
colony install @community/writer-agent

# Create a workflow
colony init

# Run it
colony run
```

---

## License

Apache-2.0
