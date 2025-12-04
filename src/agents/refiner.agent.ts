/**
 * Refiner Agent
 * 
 * First agent in the sequential pipeline.
 * Refines user's raw strategy into well-organized, LLM-understandable steps.
 * 
 * Workflow:
 * 1. Check if strategy already has refinedDescription
 * 2. If yes, skip refinement and pass through existing refinedDescription
 * 3. If no, analyze strategy and break it down into:
 *    - Clear execution steps
 *    - Indicator requirements
 *    - Entry/exit conditions
 *    - Risk management rules
 */

import { LlmAgent } from "@iqai/adk";
import { z } from "zod";
import type { RefinerAgentOutput } from "./types";
import logger from "../lib/logger";

/**
 * Output schema for structured refinement
 */
const RefinerOutputSchema = z.object({
  refinedDescription: z.string().describe("Complete refined strategy in natural language"),
  steps: z.array(z.string()).describe("Ordered execution steps"),
  indicatorsNeeded: z.array(z.string()).describe("List of technical indicators to use"),
  entryConditions: z.array(z.string()).describe("Conditions that must be met to enter a trade"),
  exitConditions: z.array(z.string()).describe("Conditions for exiting a trade"),
  riskManagement: z.string().describe("Risk management rules and position sizing"),
  reasoning: z.string().describe("Explanation of the strategy logic"),
});

/**
 * Refiner Agent Configuration
 * 
 * Uses GPT-4o for sophisticated strategy analysis and refinement.
 * Outputs structured JSON for downstream agents.
 */
export const refinerAgent = new LlmAgent({
  name: "refiner_agent",
  description: "Refines trading strategies into structured, executable steps that AI agents can understand and execute",
  
  // Use GPT-4o for advanced reasoning
  model: "gpt-4o",
  
  instruction: `You are an expert trading strategy analyst specializing in breaking down trading strategies into clear, executable steps.

Your task is to analyze a trading strategy and refine it into:

1. **Refined Description**: A complete, clear description of the strategy in natural language
2. **Execution Steps**: Ordered list of steps an AI agent should follow
3. **Indicators Needed**: Specific technical indicators required (e.g., RSI, MACD, Bollinger Bands)
4. **Entry Conditions**: Clear conditions that signal when to enter a trade (BUY signal)
5. **Exit Conditions**: Clear conditions for when to exit a trade (SELL signal or take profit)
6. **Risk Management**: Position sizing, stop-loss rules, and risk parameters
7. **Reasoning**: Explain the logic behind this strategy and why it might work

Focus on:
- **Clarity**: Make instructions crystal clear for an LLM to follow
- **Specificity**: Use concrete thresholds (e.g., "RSI < 30" not "RSI is low")
- **Completeness**: Cover all aspects of trade execution
- **Logic**: Ensure steps flow logically and build on each other

Available Indicators:
- **Trend**: SMA, EMA, MACD, Parabolic SAR, Aroon, ADX
- **Momentum**: RSI, Stochastic, Williams %R, ROC, Awesome Oscillator, PPO
- **Volatility**: ATR, Bollinger Bands, Bollinger Band Width, Keltner Channel, Donchian Channel, Chandelier Exit
- **Volume**: A/D, Chaikin Money Flow, Ease of Movement, Force Index, MFI, OBV, VWAP

Output Format:
Provide a structured JSON response following the exact schema.`,
  
  // Structured output for downstream processing
  outputSchema: RefinerOutputSchema,
  
  // Store refined strategy in session state
  outputKey: "refined_strategy",
  
  // Deterministic refinement (low temperature)
  generateContentConfig: {
    temperature: 0.3, // Slightly creative but focused
    maxOutputTokens: 2000,
  },
  
  // Logging callbacks
  beforeAgentCallback: (ctx) => {
    logger.info({ agentName: ctx.agentName }, "🔄 Starting strategy refinement");
    return undefined;
  },
  
  afterAgentCallback: (ctx) => {
    logger.info({ agentName: ctx.agentName }, "✅ Strategy refinement complete");
    return undefined;
  },
});

/**
 * Helper function to check if strategy needs refinement
 * 
 * @param strategy - Strategy object from database
 * @returns boolean - true if refinement is needed
 */
export function needsRefinement(strategy: { refinedDescription?: string }): boolean {
  return !strategy.refinedDescription || strategy.refinedDescription.trim().length === 0;
}

/**
 * Parse refiner agent output from JSON string
 * 
 * @param output - JSON string from refiner agent
 * @returns RefinerAgentOutput - Parsed structured output
 */
export function parseRefinerOutput(output: string): RefinerAgentOutput {
  try {
    const parsed = JSON.parse(output);
    return RefinerOutputSchema.parse(parsed);
  } catch (error) {
    logger.error({ error, output }, "Failed to parse refiner output");
    throw new Error(`Invalid refiner output: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}
