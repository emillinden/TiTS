import { TimeEntry } from "./types";
import * as readline from "readline";
import chalk from "chalk";
import { logger } from "./logger";

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
 * Prompt the user for a string in the terminal
 * @param message The message to display to the user. Should end with a colon and a space, e.g. "Enter your name: "
 * @param validator A function that validates the user's input. If the input is valid, the function should return true.
 * @param errorMessage The error message to display to the user if the input is invalid
 * @param defaultValue The default value to return if the user does not enter any input
 * @param allowEmpty Whether or not to allow the user to enter an empty string
 * @param strFunc A function that transforms the user's input before it is validated and returned
 * @returns The user's input if it is valid, or the default value if the user does not enter any input.
 */
export const prompt = async (
  message: string,
  validator: (input: string) => boolean,
  errorMessage: string,
  defaultValue: string = "",
  allowEmpty = true,
  strFunc?: (input: string) => string
): Promise<string> => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${chalk.yellow(message)}`, (answer) => {
      rl.close();

      if (strFunc) {
        answer = strFunc(answer);
      }

      if (!answer && !allowEmpty) {
        logger.error(chalk.red(errorMessage));
        resolve(prompt(message, validator, errorMessage, defaultValue));
      } else if (!answer && allowEmpty) {
        resolve(defaultValue);
      } else if (validator(answer)) {
        resolve(answer);
      } else {
        logger.error(chalk.red(errorMessage));
        resolve(prompt(message, validator, errorMessage, defaultValue));
      }
    });
  });
};

/**
 * Prompt the user for a keypress in the terminal without requiring the user to press enter
 * @param message The message to display to the user. Should end with a colon and a space, e.g. "Enter your name: "
 * @param validator A function that validates the user's input. If the input is valid, the function should return true.
 * @param errorMessage The error message to display to the user if the input is invalid
 * @param defaultValue The default value to return if the user does not enter any input
 * @returns The user's input if it is valid, or the default value if the user does not enter any input.
 * @todo Make it actually work without an enter press, and implement allowEmpty and strFunc from the prompt function
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
        logger.warn(chalk.red(errorMessage));
        resolve(promptKeypress(message, validator, errorMessage, defaultValue));
        return;
      }

      resolve(answer.trim());
    });
  });
};

export const pluralize = (
  count: number,
  singular: string,
  plural: string,
  includeCount = true
) => {
  return `${includeCount ? count : ""} ${count === 1 ? singular : plural}`;
};
