import { cosmiconfig } from "cosmiconfig";
import { DEFAULT_CONFIG, type CrixConfig } from "@crix/shared";

const explorer = cosmiconfig("crix", {
  searchPlaces: [
    "crix.config.js",
    "crix.config.cjs",
    "crix.config.mjs",
    ".crixrc",
    ".crixrc.json",
    ".crixrc.js",
    "package.json",
  ],
});

export const loadConfig = async (cwd: string): Promise<CrixConfig> => {
  const result = await explorer.search(cwd);
  if (!result || result.isEmpty) return DEFAULT_CONFIG;

  const partial = result.config as Partial<CrixConfig>;

  return {
    ...DEFAULT_CONFIG,
    ...partial,
    contextLimits: {
      ...DEFAULT_CONFIG.contextLimits,
      ...partial.contextLimits,
    },
    agents: {
      ...DEFAULT_CONFIG.agents,
      ...partial.agents,
    },
    harness: {
      permissions: [
        ...DEFAULT_CONFIG.harness.permissions,
        ...(partial.harness?.permissions ?? []),
      ],
    },
    models: {
      ...DEFAULT_CONFIG.models,
      ...partial.models,
    },
  };
};
