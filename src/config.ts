import fs from "fs";

const CONFIG_FILE = "./user-config.json";

type Config =
  | "togglApiToken"
  | "tempoApiToken"
  | "tempoAuthorAccountId"
  | "roundToSeconds"
  | "autoRoundAtSeconds";
type ConfigType = string | number | boolean;
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
  saveConfig({});
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
