import readline from "readline";
import { logger } from "./log";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

export async function getDescription(): Promise<string> {
  return new Promise((resolve) => {
    rl.question("Enter description: ", (answer) => {
      if (answer.length > 80) {
        logger.info("Description is too long, please enter a shorter one.");
        resolve(getDescription());
      } else {
        resolve(answer);
      }
    });
  });
}

export function closeDescriptionPrompt() {
  rl.close();
}
