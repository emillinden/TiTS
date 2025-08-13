#! /usr/bin/env node
const yargs = require("yargs");
const chalk = require("chalk");
import axios from "axios";
import { Argv } from "yargs";
import commandConfig from "./command-config";
import commandDelete from "./command-delete";
import commandShow from "./command-show";
import commandSync from "./command-sync";
import { createConfigFileIfNotExists } from "./config";

async function main() {
  init();

  const argv = yargs
    .command("sync", "Sync time entries from Toggl to Tempo", (yargs: Argv) => {
      yargs.option("date", {
        alias: "d",
        description: "The date to sync time entries for (yyyy-mm-dd format)",
        type: "string",
        default: "today",
      });
    })
    .command(
      "show",
      "Show Tempo worklogs for a specific date",
      (yargs: Argv) => {
        yargs.option("date", {
          alias: "d",
          description: "The date to show worklogs for (yyyy-mm-dd format)",
          type: "string",
          default: "today",
        });
      },
    )
    .command(
      "delete",
      "Delete Tempo worklogs for a specific date",
      (yargs: Argv) => {
        yargs.option("date", {
          alias: "d",
          description: "The date to delete worklogs for (yyyy-mm-dd format)",
          type: "string",
          default: "today",
        });
      },
    )
    .command("config", "Set API keys and other settings", (yargs: Argv) => {
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
          alias: "a",
          description: "Tempo Author Account ID",
          type: "string",
        })
        .option("jira-url", {
          description: "Jira URL (e.g., https://your-domain.atlassian.net)",
          type: "string",
        })
        .option("jira-email", {
          description: "Your Atlassian account email",
          type: "string",
        })
        .option("jira-api-token", {
          description: "Jira API token",
          type: "string",
        })
        .option("rounding", {
          alias: "r",
          description: "Enable or disable rounding (true/false)",
          type: "string",
        })
        .option("round-to", {
          alias: "o",
          description: "Interval in minutes to round time entries to",
          type: "number",
        })
        .option("round-up-at", {
          alias: "u",
          description:
            "Minutes from the next rounding interval at which to automatically round up. Example: With a 15-minute interval and '2', an entry at 13 min rounds to 15 min.",
          type: "number",
        })
        .option("round-down-at", {
          alias: "d",
          description:
            "Minutes from the previous rounding interval at which to automatically round down. Example: With a 15-minute interval and '3', an entry at 18 min rounds to 15 min.",

          type: "number",
        })
        .option("min-entry-time", {
          alias: "m",
          description:
            "Minimum time for a time entry. For example, if set to 15, any time entry less than 15 minutes will be rounded to 15 minutes. Only affects entries that fall into the rounding category (see the `strategy` option).",
          type: "number",
        })
        .option("blacklist", {
          alias: "b",
          description:
            "Toggle project key(s) (i.e. 'DEV' for issue key 'DEV-1') to skip rounding for when rounding strategy is 'blacklist'. Separate multiple values with commas.",
          type: "string",
        })
        .option("whitelist", {
          alias: "w",
          description:
            "Toggle project key(s) (i.e. 'DEV' for issue key 'DEV-1') to round when rounding strategy is 'whitelist'. Separate multiple values with commas.",
          type: "string",
        })
        .option("strategy", {
          alias: "s",
          description:
            "The rounding strategy to use. Can be 'whitelist', 'blacklist', 'all' or 'none'. If 'whitelist', only projects with keys in the whitelist will be rounded. If 'blacklist', projects with keys in the blacklist will not be rounded. If 'all', all projects will be rounded. If 'none', no projects will be rounded. Defaults to 'blacklist'.",
          type: "string",
        })
        .option("useAccounts", {
          alias: "c",
          description: "Wether to use Tempo accounts or not",
          type: "string",
        })
        .option("accountKey", {
          alias: "k",
          description: "The key for the account attribute",
          type: "string",
        })
        .option("remainingEstimate", {
          alias: "e",
          description:
            "Strategy for handling remaining estimates when logging time. Can be 'auto' (automatically subtract logged time), 'manual' (prompt for each issue), or 'keep' (leave unchanged). Defaults to 'auto'.",
          type: "string",
        })
        .option("list", {
          alias: "l",
          description: "List all saved config values",
          type: "boolean",
        })
        .option("reset", {
          description: "Reset all saved config values",
          type: "boolean",
        });
    })
    .help()
    .alias("help", "h")
    .alias("version", "v")
    .default("help").argv;

  const command = argv._[0];

  // Map hyphenated command line args to camelCase for config
  if (command === "config") {
    if (argv["jira-url"]) {
      argv.jiraUrl = argv["jira-url"];
    }
    if (argv["jira-email"]) {
      argv.jiraEmail = argv["jira-email"];
    }
    if (argv["jira-api-token"]) {
      argv.jiraApiToken = argv["jira-api-token"];
    }
    if (argv["tempo-author"]) {
      argv.tempoAuthor = argv["tempo-author"];
    }
    if (argv["round-to"]) {
      argv.roundTo = argv["round-to"];
    }
    if (argv["round-up-at"]) {
      argv.roundUpAt = argv["round-up-at"];
    }
    if (argv["round-down-at"]) {
      argv.roundDownAt = argv["round-down-at"];
    }
    if (argv["min-entry-time"]) {
      argv.minEntryTime = argv["min-entry-time"];
    }
    if (argv["remaining-estimate"]) {
      argv.remainingEstimate = argv["remaining-estimate"];
    }
  }

  switch (command) {
    case "sync":
      commandSync(argv);
      break;
    case "show":
      commandShow(argv);
      break;
    case "delete":
      commandDelete(argv);
      break;
    case "config":
      commandConfig(argv);
      break;
    case "help":
      yargs.showHelp();
      break;
    default:
      console.error(chalk.red(`Unknown command: ${command}`));
      break;
  }
}

const init = () => {
  // Configure Axios to not throw an error on non-2XX status codes
  axios.defaults.validateStatus = function () {
    return true;
  };

  createConfigFileIfNotExists();
};

main();
