const chalk = require("chalk");
import { openConfig, resetConfig, setConfig } from "./config";
import { logger } from "./logger";
import { FixMeLater } from "./types";

const commandConfig = async (argv: FixMeLater) => {
  // Reset config
  if (argv.config?.reset) {
    await commandConfigReset(argv);
    return;
  }

  // If no args, list the contents of the config file
  if (argv.list) {
    Object.entries(openConfig()).forEach(([key, value]) => {
      logger.info(`${chalk.bold.blue(key)}: ${value}`);
    });

    return;
  }

  if (argv.toggl) {
    setConfig("togglApiToken", argv.toggl);
    logger.info(chalk.green("Toggl API key saved successfully."));
  }

  if (argv.tempo) {
    setConfig("tempoApiToken", argv.tempo);
    logger.info(chalk.green("Tempo API key saved successfully."));
  }

  if (argv.tempoAuthor) {
    setConfig("tempoAuthorAccountId", argv.tempoAuthor);
    logger.info(chalk.green("Tempo Author Account ID saved successfully."));
  }

  if (argv.roundTo) {
    setConfig("roundToSeconds", argv.roundTo * 60);
    logger.info(chalk.green(`Rounding set to ${argv.roundTo} minutes.`));
  }

  if (argv.autoRoundAt) {
    setConfig("autoRoundAtSeconds", argv.autoRoundAt * 60);
    logger.info(
      chalk.green(`Auto-rounding set to ${argv.autoRoundAt} minutes.`)
    );
  }
};

const commandConfigReset = async (argv: FixMeLater) => {
  try {
    await resetConfig();
    logger.info(
      chalk.green("Configuration credentials have been deleted successfully.")
    );
  } catch (error: FixMeLater) {
    logger.error("Error deleting API keys:", error.message);
  }
};

export default commandConfig;
