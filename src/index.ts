#! /usr/bin/env node

const yargs = require("yargs");
const chalk = require("chalk");
import commandConfig from "./command-config";
import commandSync from "./command-sync";
import { createConfigFileIfNotExists } from "./config";
import { FixMeLater } from "./types";

async function main() {
  createConfigFileIfNotExists();

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
          description: "Tempo Author Account ID",
          type: "string",
        })
        .option("round-to", {
          alias: "r",
          description: "Round time entries to the nearest X minutes",
          type: "number",
        })
        .option("auto-round-at", {
          alias: "a",
          description: "Auto-round time entries X minutes away from round-to",
          type: "number",
        })
        .option("list", {
          alias: "l",
          description: "List all saved config values",
          type: "boolean",
        })
        .option("reset", {
          description:
            "Reset all saved config values",
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

main();
