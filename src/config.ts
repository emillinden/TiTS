import fs from "fs";
import path from "path";

const CONFIG_FILE = path.resolve(__dirname, "user-config.json");

type Config =
  | "togglApiToken"
  | "tempoApiToken"
  | "tempoAuthorAccountId"
  | "roundingEnabled"
  | "roundProjectStrategy"
  | "roundProjectBlacklist"
  | "roundProjectWhitelist"
  | "roundTo"
  | "roundUpThreshold"
  | "roundDownThreshold";
type ConfigType = string | number | boolean | string[];
type ConfigObject = {
  [key in Config]?: ConfigType;
};

const saveConfig = (config: ConfigObject): void => {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
};

export const openConfig = (): ConfigObject => {
  return JSON.parse(fs.readFileSync(CONFIG_FILE).toString());
};

export const resetConfig = (): void => {
  saveConfig({
    togglApiToken: "",
    tempoApiToken: "",
    tempoAuthorAccountId: "",
    roundingEnabled: true,
    roundProjectStrategy: "blacklist",
    roundProjectBlacklist: [],
    roundProjectWhitelist: [],
    roundTo: 5,
    roundUpThreshold: 1,
    roundDownThreshold: 1,
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
  return config[key];
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

  return { enabled, interval, upper, lower, blacklist, whitelist, strategy };
};
