import winston, { format } from "winston";
import chalk from "chalk";

export const logger = winston.createLogger({
  level: "info",
  format: format.combine(
    format.timestamp({
      format: "HH:mm:ss",
    }),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
  ),
  defaultMeta: { service: "tits" },
  transports: [
    new winston.transports.Console({
      format: format.combine(
        format.colorize(),
        format.printf(
          (info) =>
            `${chalk.grey(info.timestamp)} ${info.level}: ${info.message}`
        )
      ),
    }),
  ],
});
