const chalk = require("chalk");
import { getConfig, openConfig, resetConfig, setConfig } from "./config";
import { logger } from "./logger";

type ConfigCommandArgs = {
  reset: string;
  list: string;
  toggl: string;
  tempo: string;
  tempoAuthor: string;
  rounding: string;
  roundTo: number;
  autoRoundAt: number;
  roundUpAt: number;
  roundDownAt: number;
  minEntryTime: number;
  blacklist: string;
  whitelist: string;
  strategy: string;
  useAccounts: string;
  accountKey: string;
};

const commandConfig = async (argv: ConfigCommandArgs) => {
  // Reset config
  if (argv.reset) {
    await commandConfigReset();
    return;
  }

  // If no args, list the contents of the config file
  if (argv.list) {
    const configFile = openConfig();
    if (Object.keys(configFile).length === 0) {
      logger.info(chalk.yellow("No configurations found."));
      return;
    }

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

  if (argv.rounding) {
    const roundingEnabled =
      argv.rounding === "true"
        ? true
        : argv.rounding === "false"
        ? false
        : null;
    if (typeof roundingEnabled === "boolean") {
      setConfig("roundingEnabled", roundingEnabled);
      if (roundingEnabled) {
        logger.info(chalk.green("Rounding enabled."));
      } else {
        logger.info(chalk.red("Rounding disabled."));
      }
    } else {
      logger.error(chalk.red("Invalid value - must be true or false."));
    }
  }

  if (argv.roundTo) {
    setConfig("roundTo", argv.roundTo);
    logger.info(chalk.green(`Rounding set to ${argv.roundTo} minutes.`));
  }

  if (argv.roundUpAt) {
    setConfig("roundUpThreshold", argv.roundUpAt);
    logger.info(
      chalk.green(`Auto-rounding up set to ${argv.roundUpAt} minutes.`)
    );
  }

  if (argv.roundDownAt) {
    setConfig("roundDownThreshold", argv.roundDownAt);
    logger.info(
      chalk.green(`Auto-rounding down set to ${argv.roundDownAt} minutes.`)
    );
  }

  if (argv.minEntryTime) {
    setConfig("minEntryTime", argv.minEntryTime);
    logger.info(
      chalk.green(`Minimum entry time set to ${argv.minEntryTime} minutes.`)
    );
  }

  // TODO: Should probably be a func for both black- and whitelist… someday
  if (argv.blacklist) {
    const list = argv.blacklist.split(",");

    for (let str of list) {
      str = str.toUpperCase().trim();

      if (/^[A-Z]+$/.test(str)) {
        const currentBlacklist =
          (getConfig("roundProjectBlacklist") as string[]) || [];

        const exists = currentBlacklist.includes(str);
        const newBlacklist = exists
          ? currentBlacklist.filter((item) => item !== str)
          : [...currentBlacklist, str];

        setConfig("roundProjectBlacklist", newBlacklist);
        logger.info(
          exists
            ? chalk.red("✕ ") + chalk.redBright(`${str} removed from blacklist`)
            : chalk.green("✓ ") + chalk.greenBright(`${str} added to blacklist`)
        );
      } else {
        logger.error(
          chalk.red(
            `Invalid value "${str}" - must be a string containing only letters.`
          )
        );
      }
    }

    logger.info(`Current blacklist: ${getConfig("roundProjectBlacklist")}`);
  }

  if (argv.whitelist) {
    const list = argv.whitelist.split(",");

    for (let str of list) {
      str = str.toUpperCase().trim();

      if (/^[A-Z]+$/.test(str)) {
        const currentWhitelist =
          (getConfig("roundProjectWhitelist") as string[]) || [];

        const exists = currentWhitelist.includes(str);
        const newWhitelist = exists
          ? currentWhitelist.filter((item) => item !== str)
          : [...currentWhitelist, str];

        setConfig("roundProjectWhitelist", newWhitelist);
        logger.info(
          exists
            ? chalk.red("✕ ") + chalk.redBright(`${str} removed from whitelist`)
            : chalk.green("✓ ") + chalk.greenBright(`${str} added to whitelist`)
        );
      } else {
        logger.error(
          chalk.red(
            `Invalid value "${str}" - must be a string containing only letters.`
          )
        );
      }
    }

    logger.info(`Current whitelist: ${getConfig("roundProjectWhitelist")}`);
  }

  if (argv.strategy) {
    const allowedStrategies = ["blacklist", "whitelist", "all", "none"];
    if (allowedStrategies.includes(argv.strategy)) {
      setConfig("roundProjectStrategy", argv.strategy);
      logger.info(chalk.green(`Rounding strategy set to ${argv.strategy}.`));
    } else {
      logger.error(
        chalk.red(
          "Invalid value - must be 'blacklist', 'whitelist', 'all' or 'none'."
        )
      );
    }
  }

  if (argv.useAccounts) {
    const enableAccounts =
      argv.useAccounts === "true"
        ? true
        : argv.useAccounts === "false"
        ? false
        : null;
    if (typeof enableAccounts === "boolean") {
      setConfig("useAccounts", enableAccounts);
      if (enableAccounts) {
        logger.info(chalk.green("Using accounts enabled."));
      } else {
        logger.info(chalk.red("Using accounts disabled."));
      }
    } else {
      logger.error(chalk.red("Invalid value - must be true or false."));
    }
  }

  if (argv.accountKey) {
    setConfig("accountKey", argv.accountKey);
    logger.info(chalk.green("Account key saved successfully."));
  }
};

const commandConfigReset = async () => {
  try {
    await resetConfig();
    logger.info(chalk.green("All configurations have been reset."));
  } catch (error: any) {
    logger.error(
      chalk.red("Error reseting configuration file: ", error.message)
    );
  }
};

export default commandConfig;
