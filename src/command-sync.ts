const chalk = require("chalk");
import moment from "moment";
import ascii from "./ascii";
import { getConfig, getRoundingConfig, setConfig } from "./config";
import { parseDate } from "./date";
import {
  getIssueDescription,
  getIssueKey,
  issueKeyToProjectKey,
} from "./issue-key";
import { logger } from "./logger";
import {
  checkIfIssueKeyExists,
  getTempoAccounts,
  postTempoWorklog,
} from "./tempo";
import {
  fetchTogglCurrentTimer,
  fetchTogglTimeEntries,
  mergeDuplicateTogglTimeEntries,
  stopTogglTimer,
} from "./toggl";
import { TempoWorklog, TempoWorklogPostArgs, TogglTimeEntry } from "./types";
import { formatTime, pluralize, prompt, promptKeypress } from "./utils";

type SyncCommandArgs = {
  date: string;
};

const commandSync = async (argv: SyncCommandArgs) => {
  console.log(chalk.magenta(ascii));
  console.log(chalk.cyan("\nToggl into Tempo Synchronizer\n"));

  const date = parseDate(argv.date || moment().format("YYYY-MM-DD"));

  if (!date) {
    logger.error("Invalid date format");
    return;
  }

  await cmdCheckConfig();

  if (moment().isSame(date, "day")) {
    await cmdCheckTogglRunningTimer();
    console.log("");
  }

  const entries = await cmdFetchTogglEntries(date);
  let merged = await cmdMergeTogglEntries(entries);
  merged = await cmdConfirmIssueKeysExist(merged);

  console.log("");
  logger.info(
    chalk.magenta(
      `Preparing ${pluralize(merged.length, "time entry", "time entries")}`
    )
  );

  // Get rounding configuration
  let {
    enabled: roundingEnabled,
    interval,
    upper: thresholdUpper,
    lower: thresholdLower,
    strategy: roundingStrategy,
    blacklist: roundingBlacklist,
    whitelist: roundingWhitelist,
    minEntryTime: roundingMinEntryTime,
  } = getRoundingConfig();

  interval = interval * 60;
  thresholdUpper = thresholdUpper * 60;
  thresholdLower = thresholdLower * 60;
  let differenceAfterRounding = 0;

  // Define types for our entries
  type TempoEntryWithMetadata = {
    entry: TempoWorklogPostArgs;
    nicename: string;
    duration: number;
  };

  // Prepare time entries for Tempo
  const tempoTimeEntries: TempoEntryWithMetadata[] = [];
  const processingErrors: { error: any; description: string }[] = [];

  for (const entry of merged) {
    try {
      logger.info(`Preparing ${entry.description}`);

      const issueKey = await getIssueKey(entry);
      if (!issueKey) {
        logger.error(`Skipping ${entry.description} - no issue key`);
        continue;
      }

      const description = await getIssueDescription(entry.description);
      if (!description) {
        logger.error(`Skipping ${entry.description} - no issue description`);
        continue;
      }

      const projectKey = issueKeyToProjectKey(issueKey)!;
      const nicename = `${issueKey}: ${description}`;
      let duration = entry.duration;
      let remainder = duration % interval;
      let shouldRound;
      let shouldRoundUpMinEntryTime;

      switch (roundingStrategy) {
        case "all":
          shouldRound = true;
          shouldRoundUpMinEntryTime = true;
          break;
        case "none":
          shouldRound = false;
          shouldRoundUpMinEntryTime = false;
          break;
        case "blacklist":
          shouldRound = !roundingBlacklist.includes(projectKey);
          shouldRoundUpMinEntryTime = !roundingBlacklist.includes(projectKey);
          break;
        case "whitelist":
          shouldRound = roundingWhitelist.includes(projectKey);
          shouldRoundUpMinEntryTime = roundingWhitelist.includes(projectKey);
          break;
        default:
          shouldRound = false;
          shouldRoundUpMinEntryTime = false;
      }

      // Automatic rounding
      if (roundingEnabled && shouldRound) {
        if (interval - remainder <= thresholdUpper) {
          duration = Math.ceil(duration / interval) * interval;
          logger.info(
            `Rounded up from ${formatTime(entry.duration)} to ${formatTime(
              duration
            )}`
          );
        } else if (remainder <= thresholdLower) {
          duration = Math.floor(duration / interval) * interval;
          logger.info(
            `Rounded down from ${formatTime(entry.duration)} to ${formatTime(
              duration
            )}`
          );
        } else {
          // Handle manual rounding
          logger.warn(
            `${issueKey} (${formatTime(
              entry.duration
            )}) can be rounded to nearest ${interval} minutes`
          );
          const roundingAnswer = await promptKeypress(
            `Round (u)p, (d)own, (n)earest or empty to skip rounding: `,
            (input: string) =>
              input === "u" || input === "d" || input === "n" || input === "",
            `Invalid value, try again. Round (u)p, (d)own, (n)earest or empty to skip rounding: `,
            ""
          );

          if (roundingAnswer === "u") {
            duration = Math.ceil(entry.duration / interval) * interval;
            logger.info(
              `Rounded up from ${formatTime(entry.duration)} to ${formatTime(
                duration
              )}`
            );
          } else if (roundingAnswer === "d") {
            duration = Math.floor(entry.duration / interval) * interval;
            logger.info(
              `Rounded down from ${formatTime(entry.duration)} to ${formatTime(
                duration
              )}`
            );
          } else if (roundingAnswer === "n") {
            duration = Math.round(entry.duration / interval) * interval;
            logger.info(
              `Rounded to nearest from ${formatTime(
                entry.duration
              )} to ${formatTime(duration)}`
            );
          } else {
            logger.info(chalk.grey(`Skipped rounding for ${nicename}`));
          }
        }
      }

      duration = cmdFloorToNearestMinute(duration);

      if (shouldRoundUpMinEntryTime) {
        duration = cmdCeilToMinEntryTime(duration, roundingMinEntryTime);
      }

      differenceAfterRounding += duration - entry.duration;

      // Skip if time spent is 0
      if (duration <= 0) {
        logger.error(`Skipping ${nicename} - No time spent`);
        continue;
      }

      // Account
      const useAccount = getConfig("useAccounts");
      const configAccountKey = getConfig("accountKey") as string;
      let accountKey = "";
      if (useAccount && configAccountKey) {
        const projectAccountMap =
          (getConfig("tempoProjectAccountMap") as Record<string, string>) || {};
        accountKey = projectAccountMap[projectKey];

        if (!accountKey) {
          accountKey = await prompt(
            `Enter Tempo account key for ${projectKey}: `,
            (input: string) => input.length > 0,
            `Invalid value, try again. Enter Tempo account key for ${projectKey}: `,
            ""
          );

          const tempoAccounts = await getTempoAccounts();
          const accountExists = tempoAccounts.results.some(
            (account) => account.key === accountKey
          );

          if (!accountExists) {
            logger.error(
              `Account key ${accountKey} does not exist in Tempo. Skipping ${nicename}`
            );
            continue;
          }

          const saveAccountKeyAnswer = await prompt(
            `Save account key ${accountKey} to config? (y/n) `,
            (input: string) => input === "y" || input === "n" || input === "",
            "Invalid input, please enter y, n or empty to skip",
            "n",
            true
          );

          if (saveAccountKeyAnswer === "y") {
            projectAccountMap[projectKey] = accountKey;
            setConfig("tempoProjectAccountMap", projectAccountMap);

            logger.info(
              chalk.green("✓ ") +
                chalk.greenBright(
                  `Account key ${accountKey} saved to config for ${projectKey}`
                )
            );
          }
        }
      }

      // At this point we know issueKey is not null
      // Create the tempo entry object
      const tempoTimeEntry: TempoWorklogPostArgs = {
        issueKey: issueKey!,
        description,
        timeSpentSeconds: duration,
        startDate: moment(entry.start).format("YYYY-MM-DD"),
        startTime: moment(entry.start).format("HH:mm:ss"),
        authorAccountId: getConfig("tempoAuthorAccountId") as string,
      };

      // Add attributes if needed
      if (useAccount && configAccountKey && accountKey) {
        tempoTimeEntry.attributes = [
          { key: configAccountKey, value: accountKey },
        ];
      }

      // Store entry with metadata for later processing
      tempoTimeEntries.push({
        entry: tempoTimeEntry,
        nicename,
        duration,
      });
    } catch (error) {
      processingErrors.push({
        error,
        description: entry.description ?? "Unknown description",
      });
      logger.error(`Error processing time entry: ${error}`);
    } finally {
      console.log("");
    }
  }

  // POST all entries in parallel
  logger.info(
    chalk.magenta(
      `Submitting ${pluralize(
        tempoTimeEntries.length,
        "time entry",
        "time entries"
      )} to Tempo`
    )
  );

  const results = await Promise.allSettled(
    tempoTimeEntries.map(({ entry, nicename }) =>
      postTempoWorklog(entry)
        .then((response) => ({ response, nicename, success: true } as const))
        .catch((error) => ({ error, nicename, success: false } as const))
    )
  );

  const synced: TempoWorklog[] = [];

  // Process results
  results.forEach((result, index) => {
    if (result.status === "fulfilled") {
      const { success, nicename } = result.value;

      if (
        success &&
        "response" in result.value &&
        result.value.response?.tempoWorklogId
      ) {
        synced.push(result.value.response);
        logger.info(
          chalk.green("✓ ") +
            chalk.greenBright(
              `${nicename} (${formatTime(
                tempoTimeEntries[index].duration
              )}) posted to Tempo`
            )
        );
      } else {
        logger.error(chalk.red(`Failed to post ${nicename}`));
      }
    } else {
      logger.error(
        chalk.red(
          `Error posting ${tempoTimeEntries[index].nicename}: ${result.reason}`
        )
      );
    }
  });

  // Report processing errors
  processingErrors.forEach(({ error, description }) => {
    logger.error(`Error processing entry "${description}": ${error}`);
  });

  console.log("");

  logger.info(
    chalk.green(
      `✓ Done! ${pluralize(
        synced.length,
        "time entry",
        "time entries"
      )} synced to Tempo ( . Y . )`
    )
  );

  if (differenceAfterRounding !== 0) {
    logger.info(
      chalk.greenBright(
        `Rounded ${differenceAfterRounding > 0 ? "up" : "down"} by ${formatTime(
          Math.abs(differenceAfterRounding)
        )} in total`
      )
    );
  }
};

const cmdCheckConfig = async () => {
  try {
    if (!getConfig("togglApiToken")) {
      const togglApiKey = await prompt(
        "Enter Toggl API key: ",
        (input: string) => input.length > 0,
        "Invalid value, try again. Enter Toggl API key: ",
        ""
      );
      setConfig("togglApiToken", togglApiKey);
    }

    if (!getConfig("tempoApiToken")) {
      const tempoApiKey = await prompt(
        "Enter Tempo API key: ",
        (input: string) => input.length > 0,
        "Invalid value, try again. Enter Tempo API key: ",
        ""
      );
      setConfig("tempoApiToken", tempoApiKey);
    }

    if (!getConfig("tempoAuthorAccountId")) {
      const tempoAuthorAccountId = await prompt(
        "Enter Tempo Author Account ID: ",
        (input: string) => input.length > 0,
        "Invalid value, try again. Enter Tempo Author Account ID: ",
        ""
      );
      setConfig("tempoAuthorAccountId", tempoAuthorAccountId);
    }

    if (!getConfig("jiraUrl")) {
      const jiraUrl = await prompt(
        "Enter Jira URL (e.g., https://your-domain.atlassian.net): ",
        (input: string) => input.length > 0 && input.startsWith("http"),
        "Invalid value, try again. Enter Jira URL (must start with http): ",
        ""
      );
      setConfig("jiraUrl", jiraUrl);
    }

    if (!getConfig("jiraEmail")) {
      const jiraEmail = await prompt(
        "Enter your Atlassian account email: ",
        (input: string) => input.length > 0 && input.includes("@"),
        "Invalid value, try again. Enter your Atlassian account email: ",
        ""
      );
      setConfig("jiraEmail", jiraEmail);
    }

    if (!getConfig("jiraApiToken")) {
      const jiraApiToken = await prompt(
        "Enter Jira API token: ",
        (input: string) => input.length > 0,
        "Invalid value, try again. Enter Jira API token: ",
        ""
      );
      setConfig("jiraApiToken", jiraApiToken);
    }
  } catch (error) {
    console.error(error);
  }
};

const cmdCheckTogglRunningTimer = async () => {
  // If a timer is currently running, prompt user to stop it
  logger.info("Checking if Toggl timer is running...");
  const runningTimer = await fetchTogglCurrentTimer();

  if (typeof runningTimer === "undefined") {
    logger.error("Failed to fetch current Toggl timer. Aborting");
    process.exit(1);
  }

  if (runningTimer !== null) {
    logger.error(
      chalk.red("✗ ") +
        chalk.redBright(
          `Toggl timer "${runningTimer.description}" is currently running. Please stop it before syncing.`
        )
    );

    const runningTimerAnswer = await prompt(
      `Stop running timer? (y/n) `,
      (input: string) => input === "y" || input === "n" || input === "",
      "Invalid input, please enter y or n",
      "n",
      true,
      (input: string) => input.toLowerCase()
    );

    if (runningTimerAnswer === "y") {
      logger.info("Stopping Toggl timer...");
      const timerStopped = await stopTogglTimer(
        runningTimer.workspace_id,
        runningTimer.id
      );

      if (timerStopped) {
        logger.info(
          chalk.green("✓ ") + chalk.greenBright("Toggl timer stopped")
        );
      }
    } else {
      logger.error(chalk.red("Aborting"));
      process.exit(0);
    }
  } else {
    logger.info(
      chalk.green("✓ ") + chalk.greenBright("No running Toggl timer found")
    );
  }
};

const cmdFetchTogglEntries = async (date: moment.Moment) => {
  logger.info(`Fetching Toggl time entries for ${date.format("YYYY-MM-DD")}`);

  // Fetch Toggl time entries
  const togglEntries = await fetchTogglTimeEntries({
    startDate: date.format("YYYY-MM-DD"),
    endDate: moment(date).add(1, "day").format("YYYY-MM-DD"),
  });

  if (!togglEntries.length) {
    logger.error(
      `No Toggl time entries found for ${date.format("YYYY-MM-DD")}`
    );
    process.exit(0);
  }

  logger.info(
    chalk.green("✓ ") +
      chalk.greenBright(
        `Fetched ${pluralize(
          togglEntries.length,
          "time entry",
          "time entries"
        )}`
      )
  );

  return togglEntries;
};

const cmdMergeTogglEntries = async (entries: TogglTimeEntry[]) => {
  const merged = mergeDuplicateTogglTimeEntries(entries);

  if (merged.length !== entries.length) {
    logger.info(
      chalk.green("✓ ") +
        chalk.greenBright(
          `Merged ${pluralize(
            entries.length - merged.length,
            "duplicate entry",
            "duplicate entries"
          )}`
        )
    );
  }

  return merged;
};

const cmdConfirmIssueKeysExist = async (entries: TogglTimeEntry[]) => {
  // Get all unique issue keys first
  const entriesWithKeyPromises = await Promise.all(
    entries.map(async (entry) => {
      const key = await getIssueKey(entry);
      return { entry, key };
    })
  );

  // Filter out entries with no issue key
  const entriesWithKey = entriesWithKeyPromises.filter(
    ({ key }) => key !== null
  );
  const entriesWithoutKey = entriesWithKeyPromises.filter(
    ({ key }) => key === null
  );

  // Log entries without key
  for (const { entry } of entriesWithoutKey) {
    logger.error(`Skipping ${entry.description} - no issue key`);
  }

  // Get unique keys to check
  const uniqueKeys = [...new Set(entriesWithKey.map(({ key }) => key))];

  console.log("");
  logger.info(
    `Checking ${pluralize(
      uniqueKeys.length,
      "issue key",
      "issue keys"
    )} in Jira...`
  );

  // Check all unique keys in parallel
  const keyExistsResults = await Promise.all(
    uniqueKeys.map(async (key) => {
      const exists = await checkIfIssueKeyExists(key!);
      return { key, exists };
    })
  );

  // Create a map for quick lookup
  const keyExistsMap = new Map(
    keyExistsResults.map(({ key, exists }) => [key, exists])
  );

  // Log results of parallel checks
  keyExistsResults.forEach(({ key, exists }) => {
    if (exists) {
      logger.info(
        chalk.green("✓ ") + chalk.greenBright(`Issue key ${key} exists in Jira`)
      );
    } else {
      logger.error(`Issue key ${key} not found in Jira`);
    }
  });

  // Process results
  const validEntries: TogglTimeEntry[] = [];
  const validEntriesWithKey = entriesWithKey.filter(({ key }) =>
    keyExistsMap.get(key)
  );

  // Skip entries with non-existent keys
  entriesWithKey
    .filter(({ key }) => !keyExistsMap.get(key))
    .forEach(({ entry }) => {
      logger.error(`Skipping ${entry.description} - issue key not found`);
    });

  // Get descriptions in parallel
  const entriesWithDescPromises = await Promise.all(
    validEntriesWithKey.map(async ({ entry, key }) => {
      const description = await getIssueDescription(entry.description);
      return { entry, key, description };
    })
  );

  // Process entries with descriptions
  entriesWithDescPromises.forEach(({ entry, key, description }) => {
    if (!description) {
      logger.error(`Skipping ${entry.description} - no issue description`);
      return;
    }

    entry.description = `${key}: ${description}`;
    validEntries.push(entry);
  });

  return validEntries;
};

const cmdFloorToNearestMinute = (duration: number) => {
  // Floor to nearest minute
  if (duration % 60 !== 0) {
    const oldIssueTimeSpendSeconds = duration;
    duration = Math.floor(duration / 60) * 60;
    logger.info(
      `Floored to nearest minute from ${formatTime(
        oldIssueTimeSpendSeconds
      )} to ${formatTime(duration)}`
    );
  }

  return duration;
};

const cmdCeilToMinEntryTime = (duration: number, minTime: number) => {
  if (duration < minTime * 60) {
    const oldIssueTimeSpendSeconds = duration;
    duration = minTime * 60;
    logger.info(
      `Rounded up to min billable time from ${formatTime(
        oldIssueTimeSpendSeconds
      )} to ${formatTime(duration)}`
    );
  }

  return duration;
};

export default commandSync;
