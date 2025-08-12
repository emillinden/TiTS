import fs from "fs";
import path from "path";

const CONFIG_FILE = path.resolve(__dirname, "user-config.json");

type Config =
  | "togglApiToken"
  | "tempoApiToken"
  | "tempoAuthorAccountId"
  | "tempoProjectAccountMap"
  | "roundingEnabled"
  | "roundProjectStrategy"
  | "roundProjectBlacklist"
  | "roundProjectWhitelist"
  | "roundTo"
  | "roundUpThreshold"
  | "roundDownThreshold"
  | "minEntryTime"
  | "useAccounts"
  | "accountKey"
  | "jiraUrl"
  | "jiraApiToken"
  | "jiraEmail"
  | "remainingEstimateStrategy";
type ConfigType = string | number | boolean | string[] | Record<string, string>;
type ConfigObject = {
  [key in Config]?: ConfigType;
};

const saveConfig = (config: ConfigObject): void => {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
};

export const openConfig = (): ConfigObject => {
  if (!fs.existsSync(CONFIG_FILE)) {
    resetConfig();
  }

  try {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8"));
  } catch (err) {
    console.error("Config corrupted, resetting:", err);
    resetConfig();
    return JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8"));
  }
};

export const resetConfig = (): void => {
  saveConfig({
    togglApiToken: "",
    tempoApiToken: "",
    tempoAuthorAccountId: "",
    tempoProjectAccountMap: {},
    roundingEnabled: true,
    roundProjectStrategy: "blacklist",
    roundProjectBlacklist: [],
    roundProjectWhitelist: [],
    roundTo: 5,
    roundUpThreshold: 1,
    roundDownThreshold: 1,
    minEntryTime: 0,
    useAccounts: false,
    accountKey: "",
    jiraUrl: "",
    jiraApiToken: "",
    jiraEmail: "",
    remainingEstimateStrategy: "auto",
  });
};

export const createConfigFileIfNotExists = (): void => {
  if (!fs.existsSync(CONFIG_FILE)) {
    resetConfig();
  }
};

export const setConfig = (key: Config, value: ConfigType): void => {
  const config = openConfig();
  config[key] = value;
  saveConfig(config);
};

export const getConfig = (key: Config): ConfigType | undefined => {
  const config = openConfig();
  return config[key] || undefined;
};

export const getRoundingConfig = () => {
  // Defaults are set in file on init/reset since 1.2.0, keep them here for backwards compatibility
  // Some defaults are changed in 1.2.0 as well
  const enabled = (getConfig("roundingEnabled") as boolean) || true;
  const interval = (getConfig("roundTo") as number) || 15;
  const upper = (getConfig("roundUpThreshold") as number) || 1;
  const lower = (getConfig("roundDownThreshold") as number) || 1;
  const blacklist = (getConfig("roundProjectBlacklist") as string[]) || [];
  const whitelist = (getConfig("roundProjectWhitelist") as string[]) || [];
  const strategy = (getConfig("roundProjectStrategy") as string) || "blacklist";
  const minEntryTime = (getConfig("minEntryTime") as number) || 0;

  return {
    enabled,
    interval,
    upper,
    lower,
    blacklist,
    whitelist,
    strategy,
    minEntryTime,
  };
};
