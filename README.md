# Colony

**The universal agent composition standard — install, compose, and run AI agents from a community registry. No framework required.**

---

## Quick Start

```bash
# Install Colony
npm install -g @andrewsispoidis/colony

# Set up your API key (supports Anthropic and OpenAI)
colony setup

# Install agents from the live registry
colony install @community/research-agent
colony install @community/writer-agent

# Run a single agent
colony run --agent @community/research-agent --input "Explain quantum computing"

# Or create a workflow and run it
colony init
colony run
```

---

## Current Status

**v0.2.0** — Published on npm as [`@andrewsispoidis/colony`](https://www.npmjs.com/package/@andrewsispoidis/colony)

**Live Registry:** https://colony-registry-production.up.railway.app

**Website:** https://colony-website.asispoidis.workers.dev

### What's Implemented

| Feature | Status |
|---------|--------|
| OpenAI + Anthropic support | Dual-provider executor, auto-selects best available |
| 8 community agents | research, writer, reviewer, summarizer, analyst, code-reviewer, seo, data-extractor |
| Registry auth + publish | JWT auth (register/login), `colony publish` POSTs to live registry |
| Crawdad integration | Pre-flight firewall scan, graceful skip if sidecar absent |
| Parallel orchestration | `Promise.all()` execution with optional synthesizer agent |
| Collaborative orchestration | Multi-round collaboration with convergence detection |
| Persistent memory | SQLite at `~/.colony/memory.db`, `colony memory list/clear/search` |
| Structured shared memory | `[MEMORY:key:confidence]value[/MEMORY]` parsing, tag-based filtering |
| Live registry | Fastify + Postgres on Railway, 8 seeded agents, full CRUD API |

---

## Orchestration Modes

Colony supports three orchestration strategies, configured in `colony.yaml`:

### Sequential (default)

Each agent's output feeds into the next:

```yaml
name: research-pipeline
version: "0.1.0"
description: "Research, write, and review"

orchestration:
  strategy: sequential

steps:
  - agent: "@community/research-agent"
    input: "Investigate renewable energy trends"
  - agent: "@community/writer-agent"
  - agent: "@community/reviewer-agent"

output:
  save_to: "output.md"
```

### Parallel

All agents run simultaneously on the same input. An optional synthesizer merges the results:

```yaml
name: multi-analysis
version: "0.1.0"
description: "Parallel analysis from multiple perspectives"

orchestration:
  strategy: parallel
  synthesizer: "@community/summarizer-agent"

steps:
  - agent: "@community/research-agent"
    input: "What are the risks of AGI?"
  - agent: "@community/analyst-agent"
    input: "What are the risks of AGI?"
  - agent: "@community/code-reviewer-agent"
    input: "Review the safety mechanisms in current AI systems"
  - agent: "@community/summarizer-agent"

output:
  save_to: "analysis.md"
```

### Collaborative

Agents iterate in rounds, seeing each other's outputs. Converges when outputs stabilize (>90% similarity):

```yaml
name: collaborative-review
version: "0.1.0"
description: "Agents collaborate to produce a polished document"

orchestration:
  strategy: collaborative
  max_rounds: 3

memory:
  scope: persistent

steps:
  - agent: "@community/research-agent"
    input: "Build a comprehensive guide to microservices"
  - agent: "@community/writer-agent"
    input: "Build a comprehensive guide to microservices"
  - agent: "@community/reviewer-agent"
    input: "Build a comprehensive guide to microservices"

output:
  save_to: "guide.md"
```

### Structured Memory Tags

Agents can write structured facts to shared memory using tags in their output:

```
[MEMORY:key]value[/MEMORY]
[MEMORY:key:0.9]value with confidence score[/MEMORY]
```

The runtime parses these blocks, stores them in the memory system (keyed, with confidence and agent attribution), and strips them from the displayed output. Downstream agents receive only memory entries relevant to their tags.

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

model: "claude-sonnet-4-20250514"
provider: "anthropic"  # or "openai"

system_prompt: |
  You are a specialized agent that...

tags:
  - research
  - analysis

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
| `provider` | string | `anthropic` or `openai` |
| `tags` | string[] | Tags for memory relevance filtering |
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

orchestration:
  strategy: sequential  # sequential | parallel | collaborative
  # synthesizer: "@community/summarizer-agent"  # for parallel mode
  # max_rounds: 3  # for collaborative mode

memory:
  scope: working  # working | persistent

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

1. Steps run according to the orchestration strategy (sequential by default).
2. Each step's output becomes the next step's input (unless `input` is explicitly set).
3. A **working memory** carries context across steps — each agent can see what previous agents produced.
4. Agents write structured facts using `[MEMORY:key]value[/MEMORY]` tags.
5. If any step fails, the workflow halts and reports the error.

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

# Register and publish your agent
colony register
colony login
colony publish
```

### Registry Architecture

- Agents are stored at `~/.colony/agents/<scope>/<name>/`
- Each installed agent contains its `colony.agent.yaml` manifest
- The registry supports scoped namespaces for organizations and communities
- Version resolution follows semver conventions
- Authentication uses JWT (register/login flow)

### Community Agents

Colony ships with eight community agents available in the registry:

| Agent | Description |
|-------|-------------|
| `@community/research-agent` | Deep multi-angle research with confidence ratings |
| `@community/writer-agent` | Publication-ready content in any style |
| `@community/reviewer-agent` | Structured review with scored rubrics |
| `@community/summarizer-agent` | Multi-granularity summarization |
| `@community/analyst-agent` | Pattern detection and statistical reasoning |
| `@community/code-reviewer-agent` | Bug, security, and performance auditing |
| `@community/seo-agent` | Search engine optimization and content rewriting |
| `@community/data-extractor-agent` | Structured data extraction with confidence scores |

---

## Part 5: Working Memory

Colony's memory system provides context continuity across workflow steps.

### How It Works

- Each workflow execution creates a **WorkingMemory** instance
- As each agent completes, its output is parsed for `[MEMORY:key:confidence]value[/MEMORY]` blocks
- Memory entries are stored with key, value, confidence score, source agent, step number, and tags
- Downstream agents receive only memory entries relevant to their tags
- Memory blocks are stripped from displayed output

### Memory Context Format

```
<working_memory>
[research_findings]: Key findings on quantum computing... (from: @community/research-agent) [confidence: 0.9]
[step_1_output]: Full research report... (from: @community/research-agent)
</working_memory>
```

### Persistent Memory

Set `memory.scope: persistent` in `colony.yaml` to save memory entries to SQLite (`~/.colony/memory.db`) across workflow runs.

```bash
colony memory list              # List all entries
colony memory search "keyword"  # Search by key or value
colony memory clear             # Clear all entries
```

---

## Part 6: CLI Reference

### Commands

```
colony setup              Interactive configuration (Anthropic + OpenAI keys)
colony config get <key>   Get a config value
colony config set <k> <v> Set a config value
colony config list        List all config values
colony init               Create colony.yaml in current directory
colony install <agent>    Install an agent from the registry
colony list               List installed agents
colony run                Run the workflow defined in colony.yaml
colony run --agent <name> Run a single agent directly
colony run --verbose      Show streamed token output
colony run --input <text> Provide input text
colony agent init         Scaffold a new agent interactively
colony agent test         Test an agent from colony.agent.yaml
colony publish            Publish an agent to the registry (requires login)
colony login              Log in to the Colony registry
colony register           Create a Colony registry account
colony status             Show API keys, Crawdad, registry, installed agents
colony memory list        List persistent memory entries
colony memory clear       Clear persistent memory
colony memory search <q>  Search persistent memory
```

### Global Options

```
--help     Show help for any command
--version  Show Colony version
```

### Configuration

Colony stores configuration at `~/.colony/config.json`. API keys can also be set via environment variables (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`), which take precedence over config.

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
4. `colony register` — create an account
5. `colony publish` — share with the community

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
│  colony.yaml │────>│ Orchestrator │────>│  Executor   │
│  (workflow)  │     │  (runtime)   │     │ (API calls) │
└─────────────┘     └──────┬───────┘     └────────────┘
                           │
                    ┌──────┴───────┐
                    │Working Memory│
                    │   (SQLite)   │
                    └──────────────┘
```

### Components

- **CLI** (`src/index.ts`) — Commander-based CLI that wires all commands
- **Config** (`src/config/`) — Manages `~/.colony/config.json`, API keys, JWT tokens
- **Registry** (`src/registry/`) — Agent resolution, installation, live registry fetch, bundled agents
- **Runtime** — Three modules:
  - **Executor** (`src/runtime/executor.ts`) — Calls Anthropic or OpenAI API with streaming, Crawdad firewall integration
  - **Orchestrator** (`src/runtime/orchestrator.ts`) — Sequential, parallel, and collaborative workflow strategies
  - **Memory** (`src/runtime/memory.ts`) — Working memory, persistent SQLite memory, structured `[MEMORY:]` tag parsing
- **Commands** (`src/commands/`) — Individual CLI command implementations

### Agent Resolution Order

1. Local path (`./` or absolute path)
2. Bundled agents (built into Colony)
3. Installed agents (`~/.colony/agents/`)
4. Remote registry (https://colony-registry-production.up.railway.app)

---

## Part 10: Roadmap

### v0.2.0 (Current)

- [x] CLI with all core commands
- [x] Sequential, parallel, and collaborative orchestration
- [x] Structured shared memory with `[MEMORY:]` tags
- [x] Persistent SQLite memory
- [x] 8 community agents with specialized prompts
- [x] Live registry with JWT auth (register/login/publish)
- [x] OpenAI + Anthropic dual-provider support
- [x] Crawdad firewall integration
- [x] Agent scaffolding and testing
- [x] Local agent development

### v0.3.0 (Planned)

- [ ] Conditional branching in workflows
- [ ] Agent-to-agent communication channels
- [ ] Workflow variables and templating
- [ ] Tool plugins (web search, file I/O, API calls)

### v0.4.0 (Future)

- [ ] Workflow visualization and debugging UI
- [ ] Agent versioning and dependency resolution
- [ ] Hosted workflow execution
- [ ] Google/local model support

### Long-Term Vision

Colony aims to be the **universal standard** for agent composition. Just as containers standardized application deployment and package managers standardized code sharing, Colony standardizes how AI agents are defined, shared, and composed.

The end state: a world where thousands of specialized agents are available in the registry, composable into arbitrarily complex workflows with a few lines of YAML, and executable anywhere with `colony run`.

---

## License

Apache-2.0
