/**
 * Cron Job Scheduler
 * 
 * Schedules automated execution of the trading strategy analysis cycle
 * Runs every 3 minutes to analyze all active strategies
 */

import cron from "node-cron";
import { executeStrategyAnalysisCycle } from "./strategy-executor";
import logger from "../lib/logger";

/**
 * Start the strategy analysis cron job
 * Runs every 3 minutes
 */
export function startStrategyAnalysisCron() {
  // Cron expression: */3 * * * * = every 3 minutes
  cron.schedule("*/3 * * * *", async () => {
    logger.info("🔄 Starting scheduled strategy analysis cycle");
    
    try {
      const results = await executeStrategyAnalysisCycle();
      
      logger.info(
        {
          totalStrategies: results.totalStrategies,
          successful: results.successful,
          failed: results.failed,
          tradesCreated: results.tradesCreated,
        },
        "✅ Scheduled analysis cycle completed",
      );
    } catch (error) {
      logger.error({ error }, "❌ Scheduled analysis cycle failed");
    }
  });

  logger.info("⏰ Strategy analysis cron job started (runs every 3 minutes)");
}

/**
 * Stop all cron jobs (for graceful shutdown)
 */
export function stopAllCronJobs() {
  cron.getTasks().forEach((task: any) => {
    task.stop();
  });
  logger.info("🛑 All cron jobs stopped");
}
