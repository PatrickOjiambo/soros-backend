/**
 * Strategy Executor - Agent Cycle Worker
 * 
 * Main worker that orchestrates the AI trading cycle:
 * 1. Fetch all ACTIVE strategies from database
 * 2. For each strategy, run through the trading agent pipeline
 * 3. Save any BUY signals as PENDING trades
 * 4. Log execution results and errors
 * 
 * This can be run as:
 * - Scheduled cron job (e.g., every 15 minutes)
 * - On-demand via API endpoint
 * - Background worker process
 */

import { Strategy, Indicator, Trade } from "../db/schema";
import {
  tradingAgent,
  prepareStrategyInput,
  executeTradingPipelineWithState,
} from "../agents/trading.agent";
import { parseValidatorOutput, saveTrade } from "../agents/validator.agent";
import { parseAnalyzerOutput } from "../agents/analyzer.agent";
import { needsRefinement, parseRefinerOutput } from "../agents/refiner.agent";
import logger from "../lib/logger";

/**
 * Execution result for a single strategy
 */
export interface StrategyExecutionResult {
  strategyId: string;
  strategyName: string;
  success: boolean;
  decision?: "EXECUTE" | "HOLD" | "REJECT";
  signal?: "BUY" | "SELL" | "HOLD";
  tradeId?: string;
  error?: string;
  executionTime: number; // milliseconds
}

/**
 * Execute the trading cycle for all active strategies
 * 
 * Main function that orchestrates the entire process:
 * - Fetches active strategies
 * - Runs trading pipeline for each
 * - Saves trades to database
 * - Returns execution summary
 * 
 * @returns Execution results for all strategies
 */
export async function executeStrategyAnalysisCycle(): Promise<{
  totalStrategies: number;
  successful: number;
  failed: number;
  tradesCreated: number;
  results: StrategyExecutionResult[];
}> {
  const startTime = Date.now();
  const results: StrategyExecutionResult[] = [];

  try {
    logger.info("🔄 Starting strategy analysis cycle");

    // Fetch all active strategies with populated indicators
    const strategies = await Strategy.find({ status: "ACTIVE" })
      .populate("indicators")
      .populate("userId", "email firstName lastName")
      .sort({ createdAt: -1 });

    if (strategies.length === 0) {
      logger.info("No active strategies found");
      return {
        totalStrategies: 0,
        successful: 0,
        failed: 0,
        tradesCreated: 0,
        results: [],
      };
    }

    logger.info({ count: strategies.length }, "Found active strategies");

    // Process each strategy
    for (const strategy of strategies) {
      const strategyStartTime = Date.now();

      try {
        logger.info(
          {
            strategyId: strategy._id,
            name: strategy.name,
            userId: strategy.userId,
          },
          "Processing strategy"
        );

        // Prepare strategy input
        const indicators = strategy.indicators as unknown as Array<{
          name: string;
          abbreviation: string;
          category: string;
        }>;

        const strategyInput = prepareStrategyInput(
          {
            name: strategy.name,
            description: strategy.description,
            refinedDescription: strategy.refinedDescription,
            timeframe: strategy.timeframe,
            amount: strategy.amount,
          },
          indicators
        );

        // Execute trading pipeline
        const sessionId = `strategy_${strategy._id}_${Date.now()}`;
        const { result, refinedStrategy, marketAnalysis, tradeDecision } =
          await executeTradingPipelineWithState(strategyInput, sessionId);

        // Parse validator output
        const validatorOutput = tradeDecision
          ? parseValidatorOutput(tradeDecision)
          : null;

        // If strategy was refined for first time, save it
        if (refinedStrategy && needsRefinement(strategy)) {
          const refinedData = parseRefinerOutput(refinedStrategy);
          strategy.refinedDescription = refinedData.refinedDescription;
          await strategy.save();
          logger.info(
            { strategyId: strategy._id },
            "Saved refined strategy description"
          );
        }

        // Save trade if decision is EXECUTE + BUY
        let tradeId: string | undefined;
        if (validatorOutput && marketAnalysis) {
          const analyzedData = parseAnalyzerOutput(marketAnalysis);
          const trade = await saveTrade(
            validatorOutput,
            strategy.userId.toString(),
            strategy._id.toString(),
            strategy.amount,
            analyzedData.marketCondition,
            analyzedData.toolsExecuted
          );

          if (trade) {
            tradeId = trade._id.toString();
          }
        }

        // Record success
        const executionTime = Date.now() - strategyStartTime;
        results.push({
          strategyId: strategy._id.toString(),
          strategyName: strategy.name,
          success: true,
          decision: validatorOutput?.decision,
          signal: validatorOutput?.signal,
          tradeId,
          executionTime,
        });

        logger.info(
          {
            strategyId: strategy._id,
            decision: validatorOutput?.decision,
            signal: validatorOutput?.signal,
            tradeCreated: !!tradeId,
            executionTime,
          },
          "Strategy processing complete"
        );
      } catch (error) {
        // Record failure
        const executionTime = Date.now() - strategyStartTime;
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";

        results.push({
          strategyId: strategy._id.toString(),
          strategyName: strategy.name,
          success: false,
          error: errorMessage,
          executionTime,
        });

        logger.error(
          {
            strategyId: strategy._id,
            error: errorMessage,
            executionTime,
          },
          "Strategy processing failed"
        );
      }
    }

    // Calculate summary
    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;
    const tradesCreated = results.filter((r) => r.tradeId).length;

    const totalTime = Date.now() - startTime;

    logger.info(
      {
        totalStrategies: strategies.length,
        successful,
        failed,
        tradesCreated,
        totalTime,
      },
      "✅ Strategy analysis cycle complete"
    );

    return {
      totalStrategies: strategies.length,
      successful,
      failed,
      tradesCreated,
      results,
    };
  } catch (error) {
    logger.error({ error }, "❌ Strategy analysis cycle failed");
    throw error;
  }
}

/**
 * Execute analysis for a single strategy
 * 
 * Useful for testing or triggering analysis for a specific strategy.
 * 
 * @param strategyId - Strategy ID to analyze
 * @returns Execution result
 */
export async function executeSingleStrategy(
  strategyId: string
): Promise<StrategyExecutionResult> {
  const startTime = Date.now();

  try {
    logger.info({ strategyId }, "Executing single strategy analysis");

    // Fetch strategy
    const strategy = await Strategy.findById(strategyId)
      .populate("indicators")
      .populate("userId", "email firstName lastName");

    if (!strategy) {
      throw new Error(`Strategy not found: ${strategyId}`);
    }

    if (strategy.status !== "ACTIVE") {
      throw new Error(`Strategy is not active: ${strategyId}`);
    }

    // Prepare input
    const indicators = strategy.indicators as unknown as Array<{
      name: string;
      abbreviation: string;
      category: string;
    }>;

    const strategyInput = prepareStrategyInput(
      {
        name: strategy.name,
        description: strategy.description,
        refinedDescription: strategy.refinedDescription,
        timeframe: strategy.timeframe,
        amount: strategy.amount,
      },
      indicators
    );

    // Execute pipeline
    const sessionId = `strategy_${strategy._id}_${Date.now()}`;
    const { result, refinedStrategy, marketAnalysis, tradeDecision } =
      await executeTradingPipelineWithState(strategyInput, sessionId);

    // Parse output
    const validatorOutput = tradeDecision
      ? parseValidatorOutput(tradeDecision)
      : null;

    // Save refined description if needed
    if (refinedStrategy && needsRefinement(strategy)) {
      const refinedData = parseRefinerOutput(refinedStrategy);
      strategy.refinedDescription = refinedData.refinedDescription;
      await strategy.save();
    }

    // Save trade if applicable
    let tradeId: string | undefined;
    if (validatorOutput && marketAnalysis) {
      const analyzedData = parseAnalyzerOutput(marketAnalysis);
      const trade = await saveTrade(
        validatorOutput,
        strategy.userId.toString(),
        strategy._id.toString(),
        strategy.amount,
        analyzedData.marketCondition,
        analyzedData.toolsExecuted
      );

      if (trade) {
        tradeId = trade._id.toString();
      }
    }

    const executionTime = Date.now() - startTime;

    logger.info(
      {
        strategyId,
        decision: validatorOutput?.decision,
        signal: validatorOutput?.signal,
        tradeCreated: !!tradeId,
        executionTime,
      },
      "✅ Single strategy execution complete"
    );

    return {
      strategyId: strategy._id.toString(),
      strategyName: strategy.name,
      success: true,
      decision: validatorOutput?.decision,
      signal: validatorOutput?.signal,
      tradeId,
      executionTime,
    };
  } catch (error) {
    const executionTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    logger.error(
      {
        strategyId,
        error: errorMessage,
        executionTime,
      },
      "❌ Single strategy execution failed"
    );

    return {
      strategyId,
      strategyName: "Unknown",
      success: false,
      error: errorMessage,
      executionTime,
    };
  }
}

/**
 * Get pending trades for a user
 * 
 * Retrieves all trades with PENDING status for a specific user.
 * Useful for displaying trades awaiting execution.
 * 
 * @param userId - User ID
 * @returns Array of pending trades
 */
export async function getPendingTrades(userId: string) {
  try {
    const trades = await Trade.find({
      userId,
      status: "PENDING",
    })
      .populate("strategyId", "name description timeframe")
      .sort({ createdAt: -1 });

    return trades;
  } catch (error) {
    logger.error({ error, userId }, "Failed to fetch pending trades");
    throw error;
  }
}

/**
 * Get execution history
 * 
 * Retrieves recent strategy execution results.
 * Useful for monitoring and debugging.
 * 
 * @param limit - Number of recent results to fetch
 * @returns Recent trades
 */
export async function getExecutionHistory(limit: number = 50) {
  try {
    const trades = await Trade.find()
      .populate("userId", "email firstName lastName")
      .populate("strategyId", "name description timeframe")
      .sort({ createdAt: -1 })
      .limit(limit);

    return trades;
  } catch (error) {
    logger.error({ error }, "Failed to fetch execution history");
    throw error;
  }
}
