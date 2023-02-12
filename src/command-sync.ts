const chalk = require("chalk");
import moment from "moment";
import ascii from "./ascii";
import { getConfig, setConfig } from "./config";
import { parseDate } from "./date";
import { getIssueDescription, getIssueKey } from "./issue-key";
import { logger } from "./logger";
import { postTempoWorklog } from "./tempo";
import { fetchTogglTimeEntries, mergeDuplicateTogglTimeEntries } from "./toggl";
import { FixMeLater, TempoWorklog, TempoWorklogPostArgs } from "./types";
import { formatTimeSpent, pluralize, prompt, promptKeypress } from "./utils";

const commandSync = async (argv: FixMeLater) => {
  console.log(chalk.magenta(ascii));
  console.log(chalk.cyan("\nToggl into Tempo Synchronizer\n"));

  const date = parseDate(argv.date || moment().format("YYYY-MM-DD"));

  if (!date) {
    logger.error("Invalid date format");
    return;
  }

  await commandSyncCheckConfig();

  logger.info(`Fetching Toggl time entries for ${date.format("YYYY-MM-DD")}`);

  // Fetch Toggl time entries
  const togglEntries = await fetchTogglTimeEntries({
    apiKey: getConfig("togglApiToken") as string,
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
    `Fetched ${pluralize(
      togglEntries.length,
      "Toggl time entry",
      "Toggl time entries"
    )}`
  );

  const mergedTogglEntries = mergeDuplicateTogglTimeEntries(togglEntries);
  if (mergedTogglEntries.length !== togglEntries.length) {
    logger.info(
      `Merged ${
        togglEntries.length - mergedTogglEntries.length
      } duplicate ${pluralize(
        togglEntries.length - mergedTogglEntries.length,
        "Toggl time entry",
        "Toggl time entries"
      )}`
    );
  }

  logger.info(
    chalk.magenta(
      `Starting posting ${pluralize(
        mergedTogglEntries.length,
        "time entry",
        "time entries"
      )} to Tempo`
    )
  );

  let syncedWorklogs: TempoWorklog[] = [];

  // If time entry aint divisible by config.roundToSeconds, prompt user
  const roundNum = (getConfig("roundToSeconds") as number) || 60 * 15;
  const autoRoundNum = (getConfig("autoRoundAtSeconds") as number) || 60;

  // POST time entries to Tempo
  for (const entry of mergedTogglEntries) {
    try {
      logger.info(chalk.grey(`----------------`));
      logger.info(`Posting ${entry.description}`);
      const issueKey = await getIssueKey(entry);

      if (!issueKey) {
        logger.error(`Skipping ${entry.description} - no issue key`);
        continue;
      }

      const issueDescription = await getIssueDescription(entry.description);

      if (!issueDescription) {
        logger.error(`Skipping ${entry.description} - no issue description`);
        continue;
      }

      const issueNiceName = `${issueKey}: ${issueDescription}`;

      let issueTimeSpentSeconds = entry.duration;

      if (entry.duration % roundNum > autoRoundNum) {
        logger.warn(
          `${issueKey} (${formatTimeSpent(
            entry.duration
          )}) can be rounded to nearest ${roundNum / 60} minutes`
        );
        const roundingAnswer = await promptKeypress(
          `Round (u)p, (d)own, (n)earest or empty to skip rounding: `,
          (input: string) =>
            input === "u" || input === "d" || input === "n" || input === "",
          `Invalid value, try again. Round (u)p, (d)own, (n)earest or empty to skip rounding: `,
          ""
        );

        if (roundingAnswer === "u") {
          issueTimeSpentSeconds =
            Math.ceil(entry.duration / roundNum) * roundNum;
          logger.info(
            `Rounded up from ${formatTimeSpent(
              entry.duration
            )} to ${formatTimeSpent(issueTimeSpentSeconds)}`
          );
        } else if (roundingAnswer === "d") {
          issueTimeSpentSeconds =
            Math.floor(entry.duration / roundNum) * roundNum;
          logger.info(
            `Rounded down from ${formatTimeSpent(
              entry.duration
            )} to ${formatTimeSpent(issueTimeSpentSeconds)}`
          );
        } else if (roundingAnswer === "n") {
          issueTimeSpentSeconds =
            Math.round(entry.duration / roundNum) * roundNum;
          logger.info(
            `Rounded to nearest from ${formatTimeSpent(
              entry.duration
            )} to ${formatTimeSpent(issueTimeSpentSeconds)}`
          );
        } else {
          logger.info(chalk.grey(`Skipped rounding for ${issueNiceName}`));
        }
      }

      // Floor to nearest minute
      if (issueTimeSpentSeconds % 60 !== 0) {
        const oldIssueTimeSpendSeconds = issueTimeSpentSeconds;
        issueTimeSpentSeconds = Math.floor(issueTimeSpentSeconds / 60) * 60;
        logger.info(
          `Floored to nearest minute from ${formatTimeSpent(
            oldIssueTimeSpendSeconds
          )} to ${formatTimeSpent(issueTimeSpentSeconds)}`
        );
      }

      const tempoTimeEntry: TempoWorklogPostArgs = {
        issueKey: issueKey,
        description: issueDescription,
        timeSpentSeconds: issueTimeSpentSeconds,
        startDate: moment(entry.start).format("YYYY-MM-DD"),
        startTime: moment(entry.start).format("HH:mm:ss"),
        authorAccountId: getConfig("tempoAuthorAccountId") as string,
      };

      const tempoResponse = await postTempoWorklog(
        getConfig("tempoApiToken") as string,
        tempoTimeEntry
      );

      if (!tempoResponse || !tempoResponse.tempoWorklogId) {
        logger.error(chalk.red(`Failed to post ${issueNiceName}`));
        continue;
      }

      syncedWorklogs.push(tempoResponse);

      // Done!
      logger.info(
        chalk.green(
          `${issueNiceName} (${formatTimeSpent(
            issueTimeSpentSeconds
          )}) posted to Tempo!`
        )
      );
    } catch (error) {
      logger.error(`Error syncing time entry: ${error}`);
    }
  }

  logger.info(chalk.grey(`----------------`));
  logger.info(
    chalk.green(
      `Done! ${pluralize(
        syncedWorklogs.length,
        "time entry",
        "time entries"
      )} synced to Tempo ( . Y . )`
    )
  );
};

const commandSyncCheckConfig = async () => {
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
  } catch (error) {
    console.error(error);
  }
};

export default commandSync;
