#! /usr/bin/env node

const yargs = require("yargs");
const chalk = require("chalk");
import moment from "moment";
import {
  deleteConfigFile,
  loadConfigs,
  saveConfig,
  saveConfigs,
} from "./api-keys";
import ascii from "./ascii";
import { parseDate } from "./date";
import { getIssueDescription, getIssueKey } from "./issue-key";
import { logger } from "./log";
import { postTempoTimeEntry } from "./tempo";
import { fetchTogglTimeEntries, mergeDuplicateTogglTimeEntries } from "./toggl";
import { FixMeLater, TempoTimeEntryPostArgs } from "./types";
import { formatTimeSpent, prompt, promptKeypress } from "./utils";

async function main() {
  const argv = yargs
    .command(
      "sync",
      "Sync time entries from Toggl to Tempo",
      (yargs: FixMeLater) => {
        yargs.option("date", {
          alias: "d",
          description: "The date to sync time entries for (yyyy-mm-dd format)",
          type: "string",
          default: "today",
        });
      }
    )
    .command("config", "Save Toggl and Tempo API keys", (yargs: FixMeLater) => {
      yargs
        .option("toggl", {
          alias: "t",
          description: "Toggl API key",
          type: "string",
        })
        .option("tempo", {
          alias: "p",
          description: "Tempo API key",
          type: "string",
        })
        .option("tempo-author", {
          alias: "i",
          description: "Tempo author account ID",
          type: "string",
        });
    })
    .command(
      "reset",
      "Reset saved config values (you will have to re-enter your credentials)",
      (yargs: FixMeLater) => {
        yargs.option("confirm", {
          alias: "c",
          description: "Confirm that you want to reset the API keys",
          type: "boolean",
        });
      }
    )
    .help()
    .alias("help", "h")
    .alias("version", "v")
    .default("help").argv;

  const command = argv._[0];
  switch (command) {
    case "sync":
      console.log(chalk.magenta(ascii));
      console.log(chalk.cyan("\nToggl into Tempo Synchronizer\n"));

      const date = parseDate(argv.date || moment().format("YYYY-MM-DD"));
      let apiKeys;

      try {
        apiKeys = await loadConfigs();

        if (
          !apiKeys.togglApiKey ||
          !apiKeys.tempoApiKey ||
          !apiKeys.tempoAuthorAccountId
        ) {
          console.log(
            chalk.cyan("Credentials are not set. Let's set them now.")
          );

          if (!apiKeys.togglApiKey) {
            const togglApiKey = await prompt("Enter Toggl API key: ");
            await saveConfig("toggl", togglApiKey);
            apiKeys.togglApiKey = togglApiKey;
          }

          if (!apiKeys.tempoApiKey) {
            const tempoApiKey = await prompt("Enter Tempo API key: ");
            await saveConfig("tempo", tempoApiKey);
            apiKeys.tempoApiKey = tempoApiKey;
          }

          if (!apiKeys.tempoAuthorAccountId) {
            const tempoAuthorAccountId = await prompt(
              "Enter Tempo author account ID: "
            );
            await saveConfig("tempoAuthorAccountId", tempoAuthorAccountId);
            apiKeys.tempoAuthorAccountId = tempoAuthorAccountId;
          }

          if (
            apiKeys.togglApiKey &&
            apiKeys.tempoApiKey &&
            apiKeys.tempoAuthorAccountId
          ) {
            logger.info(chalk.green("API keys successfully set!"));
          } else {
            logger.error(chalk.red("Failed to set API keys"));
            process.exit(1);
          }
        }
      } catch (error) {
        console.error(error);
      }

      logger.info(
        `Fetching Toggl time entries for ${date.format("YYYY-MM-DD")}`
      );

      // Fetch and group Toggl entries
      const togglEntries = await fetchTogglTimeEntries({
        apiKey: apiKeys?.togglApiKey as string,
        startDate: date.format("YYYY-MM-DD"),
        endDate: moment(date).add(1, "day").format("YYYY-MM-DD"),
      });

      if (!togglEntries.length) {
        logger.warn("No Toggl time entries found");
        return;
      }

      logger.info(`Fetched ${togglEntries.length} Toggl time entries`);

      const mergedTogglEntries = mergeDuplicateTogglTimeEntries(togglEntries);
      if (mergedTogglEntries.length !== togglEntries.length) {
        logger.info(
          `Merged ${
            togglEntries.length - mergedTogglEntries.length
          } duplicate Toggl time entries`
        );
      }

      logger.info(
        chalk.magenta(
          `Starting posting ${mergedTogglEntries.length} time entries to Tempo`
        )
      );

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
            logger.error(
              `Skipping ${entry.description} - no issue description`
            );
            continue;
          }

          const issueNiceName = `${issueKey}: ${issueDescription}`;

          let issueTimeSpentSeconds = entry.duration;

          // If time entry aint divisible by 15, prompt user for rounding
          const roundNum = 60 * 15;
          const marginSeconds = 60;

          if (entry.duration % roundNum > marginSeconds) {
            logger.warn(
              `${issueKey} (${formatTimeSpent(
                entry.duration
              )}) could be rounded to nearest 15 minutes`
            );
            const roundingAnswer = await promptKeypress(
              `Round (u)p, (d)own, (n)earest or enter to skip rounding: `,
              (input: string) =>
                input === "u" || input === "d" || input === "n" || input === "",
              `Invalid value, try again. Round (u)p, (d)own, (n)earest or enter to skip rounding: `,
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
              console.log("issueTimeSpentSeconds", issueTimeSpentSeconds);
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
            issueTimeSpentSeconds = Math.floor(issueTimeSpentSeconds / 60) * 60;
            logger.info(
              `Floored to nearest minute to ${formatTimeSpent(
                issueTimeSpentSeconds
              )}`
            );
          }

          const tempoTimeEntry: TempoTimeEntryPostArgs = {
            issueKey: issueKey,
            description: issueDescription,
            timeSpentSeconds: issueTimeSpentSeconds,
            startDate: moment(entry.start).format("YYYY-MM-DD"),
            startTime: moment(entry.start).format("HH:mm:ss"),
            authorAccountId: apiKeys?.tempoAuthorAccountId as string,
          };

          const tempoResponse = await postTempoTimeEntry(
            apiKeys?.tempoApiKey as string,
            tempoTimeEntry
          );

          if (!tempoResponse) {
            logger.error(chalk.red(`Failed to post ${issueNiceName}`));
            continue;
          }

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
          `All done - ${mergedTogglEntries.length} entries synced to Tempo! ( . Y . )`
        )
      );
      break;
    case "config":
      if (
        !argv.config.toggl &&
        !argv.config.tempo &&
        !argv.config.tempoAuthor
      ) {
        logger.error(
          "Please provide a Toggl and/or Tempo API key or a Tempo Author ID."
        );
        return;
      }
      try {
        if (argv.config.toggl && argv.config.tempo && argv.config.tempoAuthor) {
          await saveConfigs(
            argv.config.toggl,
            argv.config.tempo,
            argv.config.tempoAuthor
          );
        } else if (argv.config.toggl) {
          await saveConfig("toggl", argv.config.toggl);
        } else if (argv.config.tempo) {
          await saveConfig("tempo", argv.config.tempo);
        } else if (argv.config.tempoAuthor) {
          await saveConfig("tempoAuthorAccountId", argv.config.tempoAuthor);
        }
        logger.info(chalk.green("API keys have been saved successfully."));
      } catch (error: FixMeLater) {
        logger.error(chalk.red("Error saving API keys:", error.message));
      }
      break;

    case "reset":
      try {
        await deleteConfigFile();
        logger.info(chalk.green("API keys have been deleted successfully."));
      } catch (error: FixMeLater) {
        logger.error("Error deleting API keys:", error.message);
      }
      break;
    case "help":
      console.log("help meeeeee");
    default:
      console.error(chalk.red(`Unknown command: ${command}`));
      break;
  }
}

main();
