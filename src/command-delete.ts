const chalk = require("chalk");
import moment from "moment";
import ascii from "./ascii";
import { getConfig } from "./config";
import { parseDate } from "./date";
import { logger } from "./logger";
import {
  deleteTempoWorklog,
  getIssueKeyFromId,
  getTempoWorklogsByDate,
} from "./tempo";
import { TempoWorklog } from "./types";
import { formatTime, pluralize, prompt } from "./utils";

type DeleteCommandArgs = {
  date: string;
};

// Extended type with issue key
type TempoWorklogWithKey = TempoWorklog & { issueKey?: string | null };

const commandDelete = async (argv: DeleteCommandArgs) => {
  console.log(chalk.magenta(ascii));
  console.log(chalk.red("\nToggl into Tempo Scrubber\n"));

  // Display an important note about permission scope
  console.log(
    chalk.yellow.bold(
      "NOTE: This command will only delete worklogs created by your account",
    ),
  );
  console.log(
    chalk.yellow(
      `Using account ID: ${
        getConfig("tempoAuthorAccountId") || "Not configured"
      }`,
    ),
  );
  console.log("");

  const date = parseDate(argv.date || moment().format("YYYY-MM-DD"));

  if (!date) {
    logger.error("Invalid date format");
    return;
  }

  const formattedDate = date.format("YYYY-MM-DD");
  logger.info(`Fetching Tempo worklogs for ${formattedDate}...`);

  try {
    // Fetch all worklogs for the given date
    const worklogs = await getTempoWorklogsByDate(formattedDate);

    if (!worklogs.length) {
      logger.info(chalk.yellow(`No worklogs found for ${formattedDate}`));
      return;
    }

    // Display summary of worklogs
    logger.info(
      chalk.green(
        `Found ${pluralize(
          worklogs.length,
          "worklog",
          "worklogs",
        )} for ${formattedDate}`,
      ),
    );
    console.log("");

    // Fetch issue keys in parallel for all worklogs
    const worklogsWithKeys: TempoWorklogWithKey[] = await Promise.all(
      worklogs.map(async (worklog) => {
        let issueKey = null;
        if (worklog.issue && worklog.issue.id) {
          issueKey = await getIssueKeyFromId(worklog.issue.id.toString());
        }
        return { ...worklog, issueKey };
      }),
    );

    let totalTimeSpent = 0;

    // Calculate the padding needed for the index numbers
    const maxIndexLength = String(worklogsWithKeys.length).length;

    // Display each worklog individually with issue key
    worklogsWithKeys.forEach((worklog, index) => {
      // Calculate total as we go
      totalTimeSpent += worklog.timeSpentSeconds;

      // Get worklog components
      const issueKey =
        worklog.issueKey ||
        (worklog.issue?.id ? `ID:${worklog.issue.id}` : "No Issue");
      const description = worklog.description || "No description";
      const timeSpent = formatTime(worklog.timeSpentSeconds);

      // Format the index with proper padding
      const paddedIndex = String(index + 1).padStart(maxIndexLength, "0");

      // Format the worklog info in a concise format
      console.log(
        chalk.cyan(
          `${paddedIndex} - ${chalk.green(
            issueKey,
          )}: ${description} (${timeSpent})`,
        ),
      );
    });

    console.log(
      chalk.yellow(`Total time to be deleted: ${formatTime(totalTimeSpent)}`),
    );
    console.log("");

    // Prompt for confirmation
    const confirmDelete = await prompt(
      chalk.red.bold("Are you sure you want to delete these worklogs? (y/n): "),
      (input: string) => ["y", "n", ""].includes(input.toLowerCase()),
      "Invalid input, please enter y or n: ",
      "n",
      true,
      (input: string) => input.toLowerCase(),
    );

    if (confirmDelete !== "y") {
      logger.info(chalk.green("Deletion cancelled"));
      return;
    }

    // Delete worklogs in parallel
    logger.info(
      chalk.red(
        `Deleting ${pluralize(worklogs.length, "worklog", "worklogs")}...`,
      ),
    );

    // Define result types for better type checking
    type SuccessResult = {
      worklog: TempoWorklogWithKey;
      success: true;
    };

    type ErrorResult = {
      worklog: TempoWorklogWithKey;
      success: false;
      error: any;
    };

    const results = await Promise.allSettled(
      worklogsWithKeys.map((worklog) =>
        deleteTempoWorklog(worklog.tempoWorklogId)
          .then(
            () =>
              ({
                worklog,
                success: true,
              }) as SuccessResult,
          )
          .catch(
            (error) =>
              ({
                worklog,
                success: false,
                error,
              }) as ErrorResult,
          ),
      ),
    );

    // Process results
    const successCount = results.filter(
      (result) => result.status === "fulfilled" && result.value.success,
    ).length;

    const failedResults = results.filter(
      (result) =>
        result.status === "rejected" ||
        (result.status === "fulfilled" && !result.value.success),
    );

    // Log results
    if (successCount > 0) {
      logger.info(
        chalk.green(
          `Successfully deleted ${pluralize(
            successCount,
            "worklog",
            "worklogs",
          )}`,
        ),
      );
    }

    if (failedResults.length > 0) {
      logger.error(
        chalk.red(
          `Failed to delete ${pluralize(
            failedResults.length,
            "worklog",
            "worklogs",
          )}`,
        ),
      );

      failedResults.forEach((result) => {
        if (result.status === "rejected") {
          logger.error(`  - Error: ${result.reason}`);
        } else if (result.status === "fulfilled" && !result.value.success) {
          // Type guard: we know result.value is ErrorResult if success is false
          const { worklog, error } = result.value as ErrorResult;

          // Use issue key in error message if available
          const issueInfo = worklog.issueKey
            ? `for issue ${worklog.issueKey}`
            : `with ID ${worklog.tempoWorklogId}`;

          logger.error(
            `  - Failed to delete worklog ${issueInfo}: ${
              error?.message || "Unknown error"
            }`,
          );
        }
      });
    }
  } catch (error) {
    logger.error(`Error fetching or deleting worklogs: ${error}`);
  }
};

export default commandDelete;
