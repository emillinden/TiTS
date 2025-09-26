import chalk from "chalk";
import { logger } from "./logger";
import { IssueKey, TogglTimeEntry } from "./types";
import { prompt } from "./utils";

export const ISSUE_KEY_REGEX = /^[A-Z0-9]+-[0-9]+/; // e.g. ABC-123 or AB2-123

export async function getIssueKey(
  timeEntry: TogglTimeEntry
): Promise<IssueKey> {
  let issueKey = extractIssueKeyFromDescription(timeEntry.description);

  if (!issueKey) {
    issueKey = null; // TODO: Handle extraction of issue key from project name
  }

  if (!issueKey) {
    logger.error(chalk.red(`Missing issue key: ${timeEntry.description}`));
    try {
      issueKey = await prompt(
        "Enter new issue key or leave empty to skip: ",
        validateIssueKey,
        "Invalid issue key format, try again: Enter new issue key or leave empty to skip: ",
        "",
        true,
        (input: string) => input.toUpperCase()
      );
    } catch (error) {
      logger.error(chalk.red(error));
      return null;
    }
  }

  issueKey = issueKey.toUpperCase();

  const issueKeyIsValid = validateIssueKey(issueKey);

  return issueKeyIsValid ? issueKey : null;
}

export const getIssueDescription = async (
  timeEntryFullDescription: string | null
): Promise<string> => {
  if (!timeEntryFullDescription) return "";

  const issueKey = extractIssueKeyFromDescription(timeEntryFullDescription);

  if (!issueKey) {
    return timeEntryFullDescription;
  }

  // Remove issue key from description
  timeEntryFullDescription = timeEntryFullDescription.replace(issueKey, "");

  // Remove leading characters that are not letters/numbers
  timeEntryFullDescription = timeEntryFullDescription
    .replace(/^[^a-zåäöA-ZÅÄÖ0-9]+/, "")
    .trim();

  if (!timeEntryFullDescription) {
    logger.error(
      chalk.yellow(`Missing issue description: ${timeEntryFullDescription}`)
    );
    timeEntryFullDescription = await prompt(
      "Enter new issue description: ",
      (input: string) => input.length > 0,
      "Invalid issue description, try again: Enter new issue description: ",
      ""
    );
  }

  return timeEntryFullDescription;
};

/**
 * Returns true if the issue key is valid, and false otherwise
 * @param issueKey The issue key to validate
 */

export const validateIssueKey = (issueKey: IssueKey): boolean => {
  if (!issueKey) return false;

  return ISSUE_KEY_REGEX.test(issueKey);
};

/**
 * Converts an issue key to project key
 * @param issueKey The issue key to convert
 * @returns The project key
 */
export const issueKeyToProjectKey = (issueKey: IssueKey): string | null => {
  if (!issueKey) return null;

  return issueKey.split("-")[0];
};

const extractIssueKeyFromDescription = (
  description: string | null
): IssueKey => {
  if (!description) {
    return null;
  }

  const issueKeyMatch = description.match(ISSUE_KEY_REGEX);

  if (!issueKeyMatch) {
    return null;
  }

  return issueKeyMatch[0].toUpperCase();
};

const extractIssueKeyFromProjectName = (projectName: string): IssueKey => {
  const issueKeyMatch = projectName.match(ISSUE_KEY_REGEX);

  if (!issueKeyMatch) {
    return null;
  }

  return issueKeyMatch[0].toUpperCase();
};
