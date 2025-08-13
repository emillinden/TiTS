const chalk = require("chalk");
import moment from "moment";
import ascii from "./ascii";
import { getConfig } from "./config";
import { parseDate } from "./date";
import { logger } from "./logger";
import { getIssueKeyFromId, getTempoWorklogsByDate } from "./tempo";
import { TempoWorklog } from "./types";
import { formatTime, pluralize } from "./utils";

type ShowCommandArgs = {
  date: string;
};

// Extended type with issue key
type TempoWorklogWithKey = TempoWorklog & { issueKey?: string | null };

const commandShow = async (argv: ShowCommandArgs) => {
  console.log(chalk.magenta(ascii));
  console.log(chalk.cyan("\nToggl into Tempo Shower\n"));

  console.log(
    chalk.yellow(
      `Using account ID: ${getConfig("tempoAuthorAccountId") || "Not configured"}`,
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
        `Found ${pluralize(worklogs.length, "worklog", "worklogs")} for ${formattedDate}`,
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
      totalTimeSpent += worklog.timeSpentSeconds;

      const issueKey =
        worklog.issueKey ||
        worklog.issueKey || // in case tempo already provided
        (worklog.issue?.id ? `ID:${worklog.issue.id}` : "No Issue");

      const description = worklog.description || "No description";
      const timeSpent = formatTime(worklog.timeSpentSeconds);
      const paddedIndex = String(index + 1).padStart(maxIndexLength, "0");

      console.log(
        chalk.cyan(
          `${paddedIndex} - ${chalk.green(issueKey)}: ${description} (${timeSpent})`,
        ),
      );
    });

    console.log(
      chalk.yellow(`\nTotal time logged: ${formatTime(totalTimeSpent)}\n`),
    );
  } catch (error) {
    logger.error(`Error fetching worklogs: ${error}`);
  }
};

export default commandShow;
