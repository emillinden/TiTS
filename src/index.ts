#! /usr/bin/env node
const yargs = require("yargs");
const chalk = require("chalk");
import { Argv } from "yargs";
import axios from "axios";
import commandConfig from "./command-config";
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
          description: "Threshold in minutes to round up time entries",
          type: "number",
        })
        .option("round-down-at", {
          alias: "d",
          description: "Threshold in minutes to round down time entries",
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

  switch (command) {
    case "sync":
      commandSync(argv);
      break;
    case "config":
      commandConfig(argv);
      break;
    case "help":
      console.log("help meeeeee");
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
