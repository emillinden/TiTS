import { TimeEntry } from "./types";
import * as readline from "readline";
import chalk from "chalk";

export const sumTimeSpent = (entries: TimeEntry[]): number => {
  return entries.reduce((sum, entry) => sum + entry.timeSpent, 0);
};

export const formatTimeSpent = (seconds: number): string => {
  const { h, m, s } = {
    h: Math.floor(seconds / 3600),
    m: Math.floor(seconds / 60) % 60,
    s: seconds % 60,
  };

  const timeString = `${h > 0 ? `${h}h ` : ""}${m > 0 ? `${m}m ` : ""}${
    s > 0 ? `${s}s` : ""
  }`.trim();

  return timeString;
};

/**
 * Prompt the user for input in the terminal
 * @param message The message to display to the user. Should end with a colon and a space, e.g. "Enter your name: "
 */
export const prompt = async (message: string): Promise<string> => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${chalk.yellow(message)}`, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
};

/**
 * Prompt the user for a keypress in the terminal without requiring the user to press enter
 * @param message The message to display to the user. Should end with a colon and a space, e.g. "Enter your name: "
 * @param validator A function that validates the user's input. If the input is valid, the function should return true. If the input is invalid, the function should return false.
 * @param errorMessage The error message to display to the user if the input is invalid
 * @param defaultValue The default value to return if the user does not enter any input
 * @returns The user's input if it is valid, or the default value if the user does not enter any input.
 */
export const promptKeypress = async (
  message: string,
  validator: (input: string) => boolean,
  errorMessage: string,
  defaultValue?: string
): Promise<string> => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${chalk.yellow(message)}`, (answer) => {
      rl.close();

      if (answer.trim() === "") {
        resolve(defaultValue || "");
        return;
      }

      if (!validator(answer.trim())) {
        console.log(chalk.red(errorMessage));
        resolve(promptKeypress(message, validator, errorMessage, defaultValue));
        return;
      }

      resolve(answer.trim());
    });
  });
};
