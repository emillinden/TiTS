// TODO: Rename this file to config.ts

import fs from "fs";
import { promisify } from "util";
import { ConfigKeys } from "./types";

const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const unlinkFile = promisify(fs.unlink);
const accessFile = promisify(fs.access);

const API_KEYS_FILE = ".tits-config";

// TODO: Remove this func
export const saveConfigs = async (
  togglApiKey: string,
  tempoApiKey: string,
  tempoAuthorAccountId: string
) => {
  await createConfigFileIfNotExists();
  await writeFile(
    API_KEYS_FILE,
    `${togglApiKey}\n${tempoApiKey}\n${tempoAuthorAccountId}`,
    "utf8"
  );
};

// TODO: Temp solution, rewrite to key/val instead
export const saveConfig = async (key: ConfigKeys, value: string) => {
  await createConfigFileIfNotExists();

  const { togglApiKey, tempoApiKey, tempoAuthorAccountId } =
    await loadConfigs();
  if (key === "toggl") {
    await saveConfigs(value, tempoApiKey, tempoAuthorAccountId);
  } else if (key === "tempo") {
    await saveConfigs(togglApiKey, value, tempoAuthorAccountId);
  } else if (key === "tempoAuthorAccountId") {
    await saveConfigs(togglApiKey, tempoApiKey, value);
  } else {
    throw new Error("Invalid key");
  }
};

// TODO: Remove this func and create a new one which retrieves value by key
export const loadConfigs = async (): Promise<{
  togglApiKey: string;
  tempoApiKey: string;
  tempoAuthorAccountId: string;
}> => {
  await createConfigFileIfNotExists();

  try {
    const data = await readFile(API_KEYS_FILE, "utf8");

    const [togglApiKey, tempoApiKey, tempoAuthorAccountId] = data.split("\n");

    return { togglApiKey, tempoApiKey, tempoAuthorAccountId };
  } catch (error) {
    throw error;
  }
};

export const deleteConfigFile = async () => {
  await createConfigFileIfNotExists();

  try {
    await accessFile(API_KEYS_FILE);
    await unlinkFile(API_KEYS_FILE);
  } catch (error: any) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
};


export const createConfigFileIfNotExists = async () => {
  try {
    await accessFile(API_KEYS_FILE, fs.constants.F_OK);
  } catch (error: any) {
    if (error.code === "ENOENT") {
      await writeFile(API_KEYS_FILE, "", "utf8");
    } else {
      throw error;
    }
  }
};
