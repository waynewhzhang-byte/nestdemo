import { Injectable, ConsoleLogger } from "@nestjs/common";
import * as fs from "fs";
import * as path from "path";

@Injectable()
export class CustomLogger extends ConsoleLogger {
  private readonly logDir = path.join(process.cwd(), "logs");

  constructor() {
    super();
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  log(message: string, context?: string) {
    super.log(message, context);
    this.writeToFile("info", message, context);
  }

  error(message: string, trace?: string, context?: string) {
    super.error(message, trace, context);
    this.writeToFile("error", message, context, trace);
  }

  warn(message: string, context?: string) {
    super.warn(message, context);
    this.writeToFile("warn", message, context);
  }

  debug(message: string, context?: string) {
    super.debug(message, context);
    this.writeToFile("debug", message, context);
  }

  verbose(message: string, context?: string) {
    super.verbose(message, context);
    this.writeToFile("verbose", message, context);
  }

  private writeToFile(
    level: string,
    message: string,
    context?: string,
    trace?: string,
  ) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      context: context || this.context,
      message,
      ...(trace && { trace }),
    };

    const logLine = JSON.stringify(logEntry) + "\n";
    const logFile = path.join(this.logDir, `${level}.log`);

    fs.appendFile(logFile, logLine, (err) => {
      if (err) {
        console.error("Failed to write log:", err);
      }
    });
  }
}
