import type { ColonyConfig } from "../types/index.js";
export declare function loadConfig(): ColonyConfig;
export declare function saveConfig(config: ColonyConfig): void;
export declare function getAnthropicKey(): string | undefined;
export declare function setConfigValue(dotPath: string, value: string): void;
export declare function getConfigValue(dotPath: string): unknown;
export declare function getAgentsDir(): string;
