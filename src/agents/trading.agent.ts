/**
 * Trading Agent - Sequential Pipeline
 * 
 * Composes the three agents into a sequential pipeline:
 * Refiner → Analyzer → Validator
 * 
 * This is the main agent that orchestrates the entire trading decision process.
 * Each agent builds on the output of the previous one:
 * 1. Refiner: Structures the strategy into executable steps
 * 2. Analyzer: Executes technical indicators and provides market analysis
 * 3. Validator: Makes final trading decision and generates trade signals
 */

import { SequentialAgent } from "@iqai/adk";
import { refinerAgent } from "./refiner.agent";
import { analyzerAgent } from "./analyzer.agent";
import { validatorAgent } from "./validator.agent";
import logger from "../lib/logger";

/**
 * Trading Sequential Agent
 * 
 * Orchestrates the complete trading analysis pipeline.
 * Each agent sees the full conversation history and outputs from previous agents.
 * 
 * Data Flow:
 * - Input: User's strategy description + timeframe + indicators
 * - Refiner Agent → outputs: refined_strategy (structured steps)
 * - Analyzer Agent → receives refined_strategy → outputs: market_analysis (indicator results)
 * - Validator Agent → receives refined_strategy + market_analysis → outputs: trade_decision (BUY/SELL/HOLD)
 */
export const tradingAgent = new SequentialAgent({
  name: "trading_agent",
  description: "End-to-end trading analysis pipeline that refines strategies, analyzes markets, and validates trading decisions",
  
  // Sequential execution: refiner → analyzer → validator
  subAgents: [
    refinerAgent,   // Step 1: Refine strategy
    analyzerAgent,  // Step 2: Analyze market with indicators
    validatorAgent, // Step 3: Validate and decide
  ],
});

/**
 * Helper function to prepare strategy input for the trading agent
 * 
 * Formats the strategy data into a clear prompt for the Refiner Agent.
 * Includes strategy description, indicators, timeframe, and risk parameters.
 * 
 * @param strategy - Strategy document from database
 * @param indicators - Populated indicator documents
 * @returns Formatted prompt string
 */
export function prepareStrategyInput(
  strategy: {
    name: string;
    description?: string;
    refinedDescription?: string;
    timeframe: string;
    amount: number;
  },
  indicators: Array<{ name: string; abbreviation: string; category: string }>
): string {
  // If strategy already has refined description, use it directly
  if (strategy.refinedDescription) {
    return `**Strategy**: ${strategy.name}

**Refined Description** (already processed):
${strategy.refinedDescription}

**Timeframe**: ${strategy.timeframe}
**Position Size**: $${strategy.amount}

**Selected Indicators**:
${indicators.map((ind) => `- ${ind.name} (${ind.abbreviation}) - ${ind.category}`).join("\n")}

Proceed to analyze the market using these indicators and validate if we should enter a trade.`;
  }

  // Otherwise, provide raw strategy for refinement
  return `**Strategy Name**: ${strategy.name}

**Strategy Description**:
${strategy.description || "No description provided"}

**Timeframe**: ${strategy.timeframe}
**Position Size**: $${strategy.amount}

**Selected Indicators**:
${indicators.map((ind) => `- ${ind.name} (${ind.abbreviation}) - ${ind.category}`).join("\n")}

Please refine this strategy into clear, executable steps, then analyze the market and make a trading decision.`;
}

/**
 * Execute the trading pipeline for a single strategy
 * 
 * Runs the complete sequential agent flow and returns the final decision.
 * Handles the AgentBuilder creation and session management.
 * 
 * @param strategyInput - Formatted strategy prompt
 * @param sessionId - Unique session ID for this execution (e.g., strategy ID)
 * @returns Final output from validator agent (trade decision)
 */
export async function executeTradingPipeline(
  strategyInput: string,
  sessionId: string
): Promise<string> {
  try {
    logger.info({ sessionId }, "🚀 Starting trading pipeline execution");

    // Import AgentBuilder dynamically to avoid initialization issues
    const { AgentBuilder } = await import("@iqai/adk");

    // Build and run the agent
    const { runner } = await AgentBuilder.create()
      .withModel("gpt-4o") // GPT-4o for all agents
      .withAgent(tradingAgent)
      .build();

    // Execute the pipeline with the strategy input
    const result = await runner.ask(strategyInput);

    logger.info({ sessionId }, "✅ Trading pipeline execution complete");

    return result;
  } catch (error) {
    logger.error({ error, sessionId }, "❌ Trading pipeline execution failed");
    throw new Error(`Pipeline execution failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Execute trading pipeline with session state access
 * 
 * Alternative execution method that provides access to session state
 * for inspecting intermediate outputs from each agent.
 * 
 * @param strategyInput - Formatted strategy prompt
 * @param sessionId - Unique session ID
 * @returns Object with final result and session state
 */
export async function executeTradingPipelineWithState(
  strategyInput: string,
  sessionId: string
): Promise<{
  result: string;
  refinedStrategy?: string;
  marketAnalysis?: string;
  tradeDecision?: string;
}> {
  try {
    logger.info({ sessionId }, "🚀 Starting trading pipeline execution with state");

    const { AgentBuilder } = await import("@iqai/adk");

    const { runner, session } = await AgentBuilder.create()
      .withModel("gpt-4o")
      .withAgent(tradingAgent)
      .build();

    const result = await runner.ask(strategyInput);

    // Extract intermediate outputs from session state
    const state = session?.state || {};

    logger.info(
      {
        sessionId,
        hasRefinedStrategy: !!state.refined_strategy,
        hasMarketAnalysis: !!state.market_analysis,
        hasTradeDecision: !!state.trade_decision,
      },
      "✅ Trading pipeline execution complete with state"
    );

    return {
      result,
      refinedStrategy: state.refined_strategy,
      marketAnalysis: state.market_analysis,
      tradeDecision: state.trade_decision,
    };
  } catch (error) {
    logger.error({ error, sessionId }, "❌ Trading pipeline execution with state failed");
    throw new Error(`Pipeline execution failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Export individual agents for testing or custom workflows
 */
export { refinerAgent, analyzerAgent, validatorAgent };
