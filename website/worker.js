export default {
  async fetch(request) {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Colony — The Universal Agent Composition Standard</title>
<style>
  *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    background: #0a0a0a;
    color: #e0e0e0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    line-height: 1.7;
    -webkit-font-smoothing: antialiased;
  }
  a { color: #7eb8ff; text-decoration: none; }
  a:hover { text-decoration: underline; }

  .container { max-width: 820px; margin: 0 auto; padding: 0 24px; }

  /* Hero */
  .hero {
    text-align: center;
    padding: 100px 0 60px;
    border-bottom: 1px solid #1a1a1a;
  }
  .hero h1 {
    font-size: 4.5rem;
    font-weight: 700;
    letter-spacing: -2px;
    color: #fff;
    margin-bottom: 12px;
  }
  .hero p {
    font-size: 1.35rem;
    color: #888;
    margin-bottom: 48px;
  }

  /* Terminal block */
  .terminal {
    background: #111;
    border: 1px solid #222;
    border-radius: 10px;
    padding: 28px 32px;
    text-align: left;
    display: inline-block;
    max-width: 100%;
    font-family: "SF Mono", "Fira Code", "Cascadia Code", Menlo, monospace;
    font-size: 0.95rem;
    line-height: 2;
  }
  .terminal .prompt { color: #5a5a5a; user-select: none; }
  .terminal .cmd { color: #c8ff7a; }

  /* Sections */
  section {
    padding: 72px 0;
    border-bottom: 1px solid #1a1a1a;
  }
  section h2 {
    font-size: 1.85rem;
    font-weight: 600;
    color: #fff;
    margin-bottom: 20px;
    letter-spacing: -0.5px;
  }
  section p, section li {
    color: #aaa;
    font-size: 1.05rem;
    margin-bottom: 14px;
  }
  section ul { list-style: none; padding-left: 0; }
  section ul li::before { content: "\\2192  "; color: #555; }

  /* Code block */
  pre {
    background: #111;
    border: 1px solid #222;
    border-radius: 8px;
    padding: 24px;
    overflow-x: auto;
    font-family: "SF Mono", "Fira Code", Menlo, monospace;
    font-size: 0.88rem;
    line-height: 1.7;
    color: #c8c8c8;
    margin-top: 20px;
  }
  .kw { color: #7eb8ff; }
  .str { color: #c8ff7a; }
  .cmt { color: #555; }

  /* Footer */
  footer {
    padding: 48px 0;
    text-align: center;
    color: #555;
    font-size: 0.9rem;
  }
  footer a { color: #666; }
  footer a:hover { color: #999; }
</style>
</head>
<body>

<div class="container">

  <div class="hero">
    <h1>Colony</h1>
    <p>The Universal Agent Composition Standard</p>
    <div class="terminal">
      <div><span class="prompt">$ </span><span class="cmd">npm install -g colony</span></div>
      <div><span class="prompt">$ </span><span class="cmd">colony install @community/research-agent</span></div>
      <div><span class="prompt">$ </span><span class="cmd">colony run "your task"</span></div>
    </div>
  </div>

  <section>
    <h2>What Colony Is</h2>
    <p>Colony is an open standard for defining, sharing, and composing AI agents. It gives every agent a universal spec &mdash; a single YAML file that describes what the agent does, what it needs, what it returns, and how it connects to other agents.</p>
    <ul>
      <li>One spec format that works across every runtime and model provider</li>
      <li>Agents compose into pipelines, hierarchies, and swarms</li>
      <li>A public registry for discovering and sharing agents</li>
      <li>CLI tooling to install, run, and orchestrate agents instantly</li>
    </ul>
  </section>

  <section>
    <h2>The Spec</h2>
    <p>Every Colony agent is defined by a minimal, human-readable YAML file:</p>
    <pre><span class="kw">colony</span>: <span class="str">"0.1"</span>
<span class="kw">name</span>: <span class="str">research-agent</span>
<span class="kw">namespace</span>: <span class="str">community</span>
<span class="kw">version</span>: <span class="str">"0.1.0"</span>

<span class="kw">interface</span>:
  <span class="kw">input</span>:
    <span class="kw">query</span>: { <span class="kw">type</span>: <span class="str">string</span>, <span class="kw">required</span>: <span class="str">true</span> }
  <span class="kw">output</span>:
    <span class="kw">report</span>: <span class="str">string</span>
    <span class="kw">sources</span>: <span class="str">string[]</span>

<span class="kw">runtime</span>:
  <span class="kw">engine</span>: <span class="str">claude</span>
  <span class="kw">model</span>: <span class="str">claude-sonnet-4-20250514</span>

<span class="kw">compose</span>:  <span class="cmt"># chain other agents</span>
  - <span class="kw">agent</span>: <span class="str">@community/summarizer-agent</span>
    <span class="kw">input_map</span>: { <span class="kw">text</span>: <span class="str">"$.report"</span> }</pre>
  </section>

  <section>
    <h2>The Registry</h2>
    <p>The Colony Registry is a public API for discovering and publishing agents. Search by tag, keyword, or namespace. Install any agent with a single command.</p>
    <ul>
      <li><code>colony search "data analysis"</code> &mdash; find agents by keyword</li>
      <li><code>colony install @community/analyst-agent</code> &mdash; install to your project</li>
      <li><code>colony publish</code> &mdash; share your agent with the world</li>
    </ul>
    <p>Five reference agents ship with the registry: research, writer, reviewer, summarizer, and analyst.</p>
  </section>

  <section>
    <h2>How Crawdad Integrates</h2>
    <p>Crawdad is the reference orchestrator for Colony. It reads Colony specs and handles everything at runtime &mdash; model calls, tool routing, memory, and multi-agent coordination.</p>
    <ul>
      <li>Crawdad reads <code>agent.colony.yaml</code> and provisions the agent</li>
      <li>Compose blocks become real orchestration &mdash; pipelines, DAGs, and delegation</li>
      <li>Any Colony-compatible runtime can replace Crawdad &mdash; the spec is the contract</li>
      <li>Built-in support for Claude, OpenAI, local models, and custom engines</li>
    </ul>
  </section>

  <footer>
    <a href="https://github.com/andrewsalinas/colony">GitHub</a> &nbsp;&middot;&nbsp; Apache 2.0 License
  </footer>

</div>

</body>
</html>`;

    return new Response(html, {
      headers: { "Content-Type": "text/html;charset=UTF-8" },
    });
  },
};
