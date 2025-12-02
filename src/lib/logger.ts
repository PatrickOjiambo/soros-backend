import pino from "pino";
import { env } from "../env";

/**
 * Pino logger wrapper with environment-specific configuration
 * 
 * Development: Pretty-printed logs with colors
 * Production: JSON structured logs for log aggregation
 * Test: Silent or minimal logging
 */
const logger = pino({
  level: env.NODE_ENV === "test" ? "silent" : "info",
  transport: env.NODE_ENV === "development" 
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "HH:MM:ss Z",
          ignore: "pid,hostname",
        },
      }
    : undefined,
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export default logger;
