import fs from "node:fs";
import path from "node:path";
import os from "node:os";
const COLONY_DIR = path.join(os.homedir(), ".colony");
const CONFIG_PATH = path.join(COLONY_DIR, "config.json");
function ensureColonyDir() {
    if (!fs.existsSync(COLONY_DIR)) {
        fs.mkdirSync(COLONY_DIR, { recursive: true });
    }
}
export function loadConfig() {
    ensureColonyDir();
    if (!fs.existsSync(CONFIG_PATH)) {
        return {};
    }
    const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
    return JSON.parse(raw);
}
export function saveConfig(config) {
    ensureColonyDir();
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8");
}
export function getAnthropicKey() {
    if (process.env.ANTHROPIC_API_KEY) {
        return process.env.ANTHROPIC_API_KEY;
    }
    const config = loadConfig();
    return config.apiKey;
}
export function setConfigValue(dotPath, value) {
    const config = loadConfig();
    const keys = dotPath.split(".");
    let current = config;
    for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        if (!(key in current) || typeof current[key] !== "object") {
            current[key] = {};
        }
        current = current[key];
    }
    current[keys[keys.length - 1]] = value;
    saveConfig(config);
}
export function getConfigValue(dotPath) {
    const config = loadConfig();
    const keys = dotPath.split(".");
    let current = config;
    for (const key of keys) {
        if (current === null || current === undefined || typeof current !== "object") {
            return undefined;
        }
        current = current[key];
    }
    return current;
}
export function getAgentsDir() {
    const dir = path.join(COLONY_DIR, "agents");
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
}
