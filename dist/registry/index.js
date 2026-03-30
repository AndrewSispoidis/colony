import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import { getAgentsDir } from "../config/index.js";
const BUNDLED_AGENTS = {
    "@community/research-agent": {
        name: "@community/research-agent",
        version: "1.0.0",
        description: "Conducts deep research on any topic, synthesizing information from multiple angles into comprehensive reports.",
        system_prompt: `You are a thorough research agent. When given a topic or question:
1. Break it down into key aspects to investigate
2. Analyze each aspect systematically
3. Synthesize findings into a clear, well-structured report
4. Include key insights, data points, and conclusions
5. Note any areas of uncertainty or where more research is needed

Provide comprehensive, factual, well-organized research output.`,
    },
    "@community/writer-agent": {
        name: "@community/writer-agent",
        version: "1.0.0",
        description: "Produces polished, publication-ready written content in any style or format.",
        system_prompt: `You are an expert writing agent. When given a topic, outline, or draft:
1. Understand the target audience and tone
2. Structure the content logically with clear sections
3. Write engaging, clear prose
4. Ensure proper grammar, style, and flow
5. Polish the final output to publication quality

Produce well-crafted written content that achieves its communication goals.`,
    },
    "@community/reviewer-agent": {
        name: "@community/reviewer-agent",
        version: "1.0.0",
        description: "Reviews content or code for quality, correctness, and improvements.",
        system_prompt: `You are a meticulous review agent. When given content to review:
1. Read the content carefully and thoroughly
2. Check for accuracy, consistency, and completeness
3. Identify strengths and areas for improvement
4. Provide specific, actionable feedback
5. Suggest concrete improvements with examples

Deliver structured, constructive review feedback.`,
    },
    "@community/summarizer-agent": {
        name: "@community/summarizer-agent",
        version: "1.0.0",
        description: "Distills long content into concise, accurate summaries at any desired length.",
        system_prompt: `You are a precise summarization agent. When given content to summarize:
1. Identify the key themes and main points
2. Distinguish essential information from supporting details
3. Preserve the original meaning and nuance
4. Create a concise summary at the appropriate length
5. Ensure no critical information is lost

Produce clear, accurate summaries that capture the essence of the source material.`,
    },
    "@community/analyst-agent": {
        name: "@community/analyst-agent",
        version: "1.0.0",
        description: "Analyzes data, trends, and situations to produce actionable insights and recommendations.",
        system_prompt: `You are an analytical agent. When given data or a situation to analyze:
1. Identify the key variables and relationships
2. Look for patterns, trends, and anomalies
3. Apply relevant frameworks and methodologies
4. Draw evidence-based conclusions
5. Provide actionable recommendations

Deliver clear analysis with well-supported insights and practical next steps.`,
    },
};
export function resolveAgent(nameOrPath) {
    // Local path resolution
    if (nameOrPath.startsWith("./") || nameOrPath.startsWith("/")) {
        const agentPath = path.resolve(nameOrPath);
        const yamlPath = path.join(agentPath, "colony.agent.yaml");
        if (fs.existsSync(yamlPath)) {
            const raw = fs.readFileSync(yamlPath, "utf-8");
            return yaml.load(raw);
        }
        // Try single file
        if (fs.existsSync(agentPath) && agentPath.endsWith(".yaml")) {
            const raw = fs.readFileSync(agentPath, "utf-8");
            return yaml.load(raw);
        }
        return null;
    }
    // Check bundled agents
    if (nameOrPath in BUNDLED_AGENTS) {
        return BUNDLED_AGENTS[nameOrPath];
    }
    // Check installed agents
    const installed = getInstalledAgentPath(nameOrPath);
    if (installed) {
        const yamlPath = path.join(installed, "colony.agent.yaml");
        if (fs.existsSync(yamlPath)) {
            const raw = fs.readFileSync(yamlPath, "utf-8");
            return yaml.load(raw);
        }
    }
    return null;
}
const REGISTRY_URL = "https://colony-registry-production.up.railway.app";
async function fetchFromRegistry(name) {
    // name is like "@community/research-agent" → namespace=community, agentName=research-agent
    const match = name.match(/^@([^/]+)\/(.+)$/);
    if (!match)
        return null;
    const [, namespace, agentName] = match;
    try {
        const res = await fetch(`${REGISTRY_URL}/agents/${namespace}/${agentName}`);
        if (!res.ok)
            return null;
        const data = await res.json();
        if (data.spec)
            return data.spec;
        // Fallback: treat the whole response as a spec
        return data;
    }
    catch {
        return null;
    }
}
export async function installAgent(name) {
    const agentsDir = getAgentsDir();
    const agentDir = path.join(agentsDir, name.replace("/", path.sep));
    // Try the remote registry first
    const remoteSpec = await fetchFromRegistry(name);
    if (remoteSpec) {
        fs.mkdirSync(agentDir, { recursive: true });
        const yamlContent = yaml.dump(remoteSpec);
        fs.writeFileSync(path.join(agentDir, "colony.agent.yaml"), yamlContent, "utf-8");
        return true;
    }
    // Fall back to bundled agents
    if (name in BUNDLED_AGENTS) {
        fs.mkdirSync(agentDir, { recursive: true });
        const spec = BUNDLED_AGENTS[name];
        const yamlContent = yaml.dump(spec);
        fs.writeFileSync(path.join(agentDir, "colony.agent.yaml"), yamlContent, "utf-8");
        return true;
    }
    return false;
}
export function getInstalledAgentPath(name) {
    const agentsDir = getAgentsDir();
    const agentDir = path.join(agentsDir, name.replace("/", path.sep));
    if (fs.existsSync(agentDir)) {
        return agentDir;
    }
    return null;
}
export function listInstalledAgents() {
    const agentsDir = getAgentsDir();
    const agents = [];
    if (!fs.existsSync(agentsDir))
        return agents;
    const scopes = fs.readdirSync(agentsDir);
    for (const scope of scopes) {
        const scopePath = path.join(agentsDir, scope);
        if (!fs.statSync(scopePath).isDirectory())
            continue;
        if (scope.startsWith("@")) {
            const names = fs.readdirSync(scopePath);
            for (const name of names) {
                const namePath = path.join(scopePath, name);
                if (fs.statSync(namePath).isDirectory()) {
                    agents.push(`${scope}/${name}`);
                }
            }
        }
        else {
            agents.push(scope);
        }
    }
    return agents;
}
export function getBundledAgentNames() {
    return Object.keys(BUNDLED_AGENTS);
}
