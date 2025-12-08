/**
 * Analyzer Agent
 * 
 * Second agent in the sequential pipeline.
 * Determines which indicator tools to call based on refined strategy,
 * executes them, and returns context-rich analysis results.
 * 
 * Workflow:
 * 1. Receive refined strategy from Refiner Agent
 * 2. Analyze which indicator tools are needed
 * 3. Execute the appropriate tools
 * 4. Synthesize tool results into human-readable analysis
 * 5. Provide market condition assessment, insights, and warnings
 */

import { LlmAgent } from "@iqai/adk";
import { z } from "zod";
import { allIndicatorTools } from "../tools";
import type { AnalyzerAgentOutput } from "./types";
import logger from "../lib/logger";

/**
 * Output schema for structured analysis
 */
const AnalyzerOutputSchema = z.object({
  toolsExecuted: z.array(z.string()).describe("Names of indicator tools that were executed"),
  marketCondition: z.string().describe("Overall market condition assessment (e.g., 'Bullish trending with high volatility')"),
  trendAnalysis: z.string().describe("Analysis of trend indicators (direction, strength, reversals)"),
  momentumAnalysis: z.string().describe("Analysis of momentum indicators (overbought/oversold, divergences)"),
  volatilityAnalysis: z.string().describe("Analysis of volatility indicators (expansion/contraction, breakout potential)"),
  volumeAnalysis: z.string().describe("Analysis of volume indicators (accumulation/distribution, confirmation)"),
  keyInsights: z.array(z.string()).describe("3-5 key trading insights from the analysis"),
  warnings: z.array(z.string()).describe("Risks, conflicts, or warnings to consider"),
  timestamp: z.string().describe("Timestamp of the analysis"),
});

/**
 * Analyzer Agent Configuration
 * 
 * Uses GPT-4o with all 25 indicator tools available.
 * Intelligently selects and executes relevant tools based on strategy.
 */
export const analyzerAgent = new LlmAgent({
  name: "analyzer_agent",
  description: "Analyzes WETHUSDT market using technical indicators and provides comprehensive trading insights",
  
  // Use GPT-4o for advanced tool selection and analysis
  model: "gemini-2.5-flash",
  
  instruction: `You are an expert technical analyst for cryptocurrency trading. Your role is to:

1. **Understand the Strategy**: Review the refined trading strategy provided by the Refiner Agent
2. **Select Tools**: Determine which technical indicators are most relevant to the strategy
3. **Execute Tools**: Call the appropriate indicator tools to gather market data
4. **Synthesize Analysis**: Combine all indicator results into a comprehensive market analysis

**Available Tools** (25 indicators across 4 categories):

**Trend Indicators**:
- simpleMovingAverage: Identifies trend direction using SMA
- exponentialMovingAverage: More responsive trend analysis using EMA
- movingAverageConvergenceDivergence: MACD for momentum and trend changes
- parabolicSAR: Identifies potential trend reversals
- aroonIndicator: Measures trend strength and timing

**Momentum Indicators**:
- relativeStrengthIndex: RSI for overbought/oversold conditions
- stochasticOscillator: Momentum oscillator comparing closing price to range
- williamsR: Similar to Stochastic but inverted scale
- rateOfChange: Measures momentum by rate of price change
- awesomeOscillator: Market momentum using moving averages
- percentagePriceOscillator: MACD normalized as percentage

**Volume Indicators**:
- accumulationDistribution: Measures money flow (buying/selling pressure)
- chaikinMoneyFlow: Volume-weighted buying/selling pressure
- easeOfMovement: Relates price change to volume
- forceIndex: Combines price and volume for force measurement
- moneyFlowIndex: Volume-weighted RSI
- onBalanceVolume: Cumulative volume indicator
- volumeWeightedAveragePrice: VWAP used by institutions

**Volatility Indicators**:
- averageTrueRange: Measures market volatility
- bollingerBands: Volatility bands for overbought/oversold
- bollingerBandWidth: Squeeze and breakout detection
- keltnerChannel: ATR-based volatility channel
- donchianChannel: Highest high and lowest low
- chandelierExit: Trailing stop-loss based on ATR

**Analysis Guidelines**:
- **Be Strategic**: Only call tools that are relevant to the strategy
- **Cross-Validate**: Look for confirmation across different indicator types
- **Context-Rich**: Focus on trading implications, not raw numbers
- **Identify Conflicts**: Point out when indicators disagree
- **Be Specific**: Use concrete thresholds and levels from the indicators
- **Time-Aware**: Consider the timeframe specified in the strategy

**Output Format**:
Provide a structured JSON response with:
- List of tools you executed
- Overall market condition (one sentence summary)
- Detailed analysis for each category (trend, momentum, volatility, volume)
- 3-5 key insights that directly inform trading decisions
- Any warnings, conflicts, or risks identified
- Timestamp of the analysis

**Remember**: The Validator Agent will use your analysis to make final trading decisions. Be thorough, accurate, and actionable.`,
  
  // Provide all 25 indicator tools
  tools: allIndicatorTools,
  
  // Structured output for downstream processing
  outputSchema: AnalyzerOutputSchema,
  
  // Store analysis in session state
  outputKey: "market_analysis",
  
  // Balanced temperature for analytical reasoning with some creativity
  generateContentConfig: {
    temperature: 0.4,
    maxOutputTokens: 3000,
  },
  
  // Logging callbacks
  beforeAgentCallback: (ctx) => {
    logger.info({ agentName: ctx.agentName }, "📊 Starting market analysis");
    return undefined;
  },
  
  afterAgentCallback: (ctx) => {
    logger.info({ agentName: ctx.agentName }, "✅ Market analysis complete");
    return undefined;
  },
  
  beforeToolCallback: (tool, args, ctx) => {
    logger.debug({ toolName: tool.name, args }, "🔧 Executing indicator tool");
    return undefined;
  },
  
  afterToolCallback: (tool, args, ctx, response) => {
    logger.debug({ toolName: tool.name, response: response?.slice(0, 200) }, "✅ Tool execution complete");
    return undefined;
  },
});

/**
 * Parse analyzer agent output from JSON string
 * 
 * @param output - JSON string from analyzer agent
 * @returns AnalyzerAgentOutput - Parsed structured output
 */
export function parseAnalyzerOutput(output: string): AnalyzerAgentOutput {
  try {
    const parsed = JSON.parse(output);
    const validated = AnalyzerOutputSchema.parse(parsed);
    
    // Convert timestamp string to Date object
    return {
      ...validated,
      timestamp: new Date(validated.timestamp),
    };
  } catch (error) {
    logger.error({ error, output }, "Failed to parse analyzer output");
    throw new Error(`Invalid analyzer output: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}
