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
  getIssueRemainingEstimate,
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
  }

  console.log("");

  const entries = await cmdFetchTogglEntries(date);
  let merged = await cmdMergeTogglEntries(entries);
  merged = await cmdConfirmIssueKeysExist(merged);

  console.log("");

  logger.info(
    chalk.magenta(
      `Starting posting ${pluralize(
        merged.length,
        "time entry",
        "time entries"
      )} to Tempo`
    )
  );

  const synced: TempoWorklog[] = [];

  // Rounding
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

  // POST time entries to Tempo
  for (const entry of merged) {
    try {
      console.log("");

      logger.info(`Posting ${entry.description}`);
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
            )}) can be rounded to nearest ${interval / 60} minutes`
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

      const tempoTimeEntry: TempoWorklogPostArgs = {
        issueKey: issueKey,
        description: description,
        timeSpentSeconds: duration,
        startDate: moment(entry.start).format("YYYY-MM-DD"),
        startTime: moment(entry.start).format("HH:mm:ss"),
        authorAccountId: getConfig("tempoAuthorAccountId") as string,
      };

      // Handle remaining estimate
      const remainingEstimateStrategy =
        (getConfig("remainingEstimateStrategy") as string) || "auto";

      if (remainingEstimateStrategy !== "keep") {
        const remainingEstimate = await getIssueRemainingEstimate(issueKey);

        if (remainingEstimate !== null) {
          let newRemainingEstimate: number | null = null;

          if (remainingEstimateStrategy === "auto") {
            // Subtract time spent from remaining estimate
            newRemainingEstimate = Math.max(0, remainingEstimate - duration);
            logger.info(
              `Automatically updating remaining estimate from ${formatTime(
                remainingEstimate
              )} to ${formatTime(newRemainingEstimate)}`
            );
          } else if (remainingEstimateStrategy === "manual") {
            // Prompt user for what to do with remaining estimate
            const remainingEstimateOptions = [
              {
                key: "a",
                label: "Auto-subtract",
                value: Math.max(0, remainingEstimate - duration),
              },
              { key: "k", label: "Keep current", value: remainingEstimate },
              { key: "m", label: "Set manually", value: null },
              { key: "z", label: "Set to zero", value: 0 },
            ];

            logger.info(
              `Current remaining estimate: ${formatTime(remainingEstimate)}`
            );

            const remainingEstimateAnswer = await promptKeypress(
              `How to handle remaining estimate? (a)uto-subtract, (k)eep current, (m)anual, or (z)ero: `,
              (input: string) =>
                remainingEstimateOptions.some((option) => option.key === input),
              `Invalid value, try again. How to handle remaining estimate? (a)uto-subtract, (k)eep current, (m)anual, or (z)ero: `,
              "a"
            );

            const selectedOption = remainingEstimateOptions.find(
              (option) => option.key === remainingEstimateAnswer
            );

            if (selectedOption) {
              if (selectedOption.key === "m") {
                // Manual input
                const manualInput = await prompt(
                  "Enter new remaining estimate in minutes: ",
                  (input: string) =>
                    !isNaN(parseInt(input, 10)) && parseInt(input, 10) >= 0,
                  "Invalid value, try again. Enter new remaining estimate in minutes: ",
                  "0"
                );

                newRemainingEstimate = parseInt(manualInput, 10) * 60; // Convert minutes to seconds
              } else {
                newRemainingEstimate = selectedOption.value;
              }

              logger.info(
                `Setting remaining estimate to ${formatTime(
                  newRemainingEstimate || 0
                )}`
              );
            }
          }

          if (newRemainingEstimate !== null) {
            tempoTimeEntry.remainingEstimateSeconds = newRemainingEstimate;
          }
        } else {
          logger.warn(`No remaining estimate found for ${issueKey}`);
        }
      }

      if (useAccount && configAccountKey) {
        tempoTimeEntry.attributes = [
          { key: configAccountKey, value: accountKey },
        ];
      }

      const tempoResponse = await postTempoWorklog(tempoTimeEntry);

      if (!tempoResponse || !tempoResponse.tempoWorklogId) {
        logger.error(chalk.red(`Failed to post ${nicename}`));
        continue;
      }

      synced.push(tempoResponse);

      // Done!
      logger.info(
        chalk.green("✓ ") +
          chalk.greenBright(
            `${nicename} (${formatTime(duration)}) posted to Tempo`
          )
      );
    } catch (error) {
      logger.error(`Error syncing time entry: ${error}`);
    }
  }

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
  const checked = new Set();
  for (const entry of entries) {
    const key = await getIssueKey(entry);
    const remFromArr = (entry: TogglTimeEntry) =>
      entries.splice(entries.indexOf(entry), 1);

    if (checked.has(key)) continue;

    console.log("");

    if (!key) {
      logger.error(`Skipping ${entry.description} - no issue key`);
      remFromArr(entry);
      continue;
    }

    checked.add(key);

    logger.info(`Checking if ${key} exists in Jira...`);
    const issueKeyExistsInJira = await checkIfIssueKeyExists(key);

    if (!issueKeyExistsInJira) {
      logger.error(`Skipping ${entry.description} - issue key not found`);
      remFromArr(entry);
      continue;
    }

    logger.info(
      chalk.green("✓ ") + chalk.greenBright(`Issue key ${key} exists in Jira`)
    );

    const issueDescription = await getIssueDescription(entry.description);

    if (!issueDescription) {
      logger.error(`Skipping ${entry.description} - no issue description`);
      remFromArr(entry);
      continue;
    }

    entry.description = `${key}: ${issueDescription}`;
  }

  return entries;
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
