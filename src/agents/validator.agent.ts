/**
 * Validator Agent
 * 
 * Final agent in the sequential pipeline.
 * Validates the analysis from Analyzer Agent and makes final trading decisions.
 * 
 * Workflow:
 * 1. Receive refined strategy + market analysis from previous agents
 * 2. Validate that analysis aligns with strategy requirements
 * 3. Check risk parameters and market conditions
 * 4. Decide: EXECUTE, HOLD, or REJECT the trade
 * 5. If EXECUTE (BUY signal), calculate entry, exit, stop-loss
 * 6. Return structured decision for database storage
 */

import { LlmAgent } from "@iqai/adk";
import { z } from "zod";
import type { ValidatorAgentOutput } from "./types";
import { Trade } from "../db/schema";
import logger from "../lib/logger";

/**
 * Output schema for structured validation and trading decision
 */
const ValidatorOutputSchema = z.object({
  decision: z.enum(["EXECUTE", "HOLD", "REJECT"]).describe("Final decision: EXECUTE (place trade), HOLD (wait), or REJECT (conditions not met)"),
  signal: z.enum(["BUY", "SELL", "HOLD"]).describe("Trading signal based on analysis"),
  confidence: z.enum(["VERY_WEAK", "WEAK", "MODERATE", "STRONG", "VERY_STRONG"]).describe("Confidence level in the decision"),
  entry: z.number().nullable().describe("Recommended entry price (null if not executing)"),
  exit: z.number().nullable().describe("Target exit/take-profit price (null if not executing)"),
  stopLoss: z.number().nullable().describe("Stop-loss price for risk management (null if not executing)"),
  reasoning: z.string().describe("Clear explanation of the decision and rationale"),
  riskRewardRatio: z.number().nullable().describe("Calculated risk/reward ratio (null if not executing)"),
  validationChecks: z.object({
    strategyAlignment: z.boolean().describe("Does the analysis align with strategy requirements?"),
    riskAcceptable: z.boolean().describe("Is the risk level acceptable?"),
    marketConditionsFavorable: z.boolean().describe("Are market conditions favorable?"),
    sufficientConfidence: z.boolean().describe("Is there sufficient confidence to execute?"),
  }).describe("Validation checklist results"),
});

/**
 * Validator Agent Configuration
 * 
 * Uses GPT-4o for sophisticated decision-making and risk assessment.
 * No tools needed - focuses on validation logic and decision-making.
 */
export const validatorAgent = new LlmAgent({
  name: "validator_agent",
  description: "Validates market analysis and makes final trading decisions with risk assessment",
  
  // Use GPT-4o for critical decision-making
  model: "gpt-4o",
  
  instruction: `You are the final decision-maker in the trading pipeline. Your responsibility is to validate the market analysis and determine whether a trade should be executed.

**You have access to**:
1. **Refined Strategy**: The clear, structured strategy from the Refiner Agent
2. **Market Analysis**: Comprehensive technical analysis from the Analyzer Agent

**Your Decision Process**:

**Step 1: Validate Strategy Alignment**
- Does the market analysis confirm the strategy's entry conditions?
- Are all required indicators showing favorable signals?
- Do the indicator signals align with the strategy's logic?

**Step 2: Assess Risk Parameters**
- Is the risk/reward ratio acceptable (minimum 1.5:1)?
- Can we place a reasonable stop-loss based on volatility?
- Is position sizing appropriate for the account?
- Are there any high-risk warnings from the analysis?

**Step 3: Evaluate Market Conditions**
- Is market volatility at acceptable levels?
- Is there sufficient volume and liquidity?
- Are there any conflicting signals across indicators?
- Are we entering at a favorable price level?

**Step 4: Confidence Assessment**
- How strong is the confluence of indicators?
- What is the overall confidence level (VERY_WEAK to VERY_STRONG)?
- Is confidence high enough to execute a trade?

**Decision Outcomes**:

**EXECUTE** (Place the trade):
- ✅ All validation checks pass
- ✅ BUY signal is clear and confirmed
- ✅ Risk/reward is favorable (≥1.5:1)
- ✅ Confidence level is at least MODERATE
- Provide specific entry, exit, and stop-loss prices

**HOLD** (Wait for better conditions):
- ⚠️ Some validation checks pass but not all
- ⚠️ Signals are mixed or weak
- ⚠️ Market conditions are not optimal yet
- ⚠️ Confidence level is WEAK or VERY_WEAK
- Explain what conditions need to improve

**REJECT** (Do not trade):
- ❌ Critical validation checks fail
- ❌ Signals contradict the strategy
- ❌ Risk level is too high
- ❌ Market conditions are unfavorable
- Clearly explain why the trade was rejected

**Price Calculations**:
- **Entry**: Current market price or a specific level from analysis
- **Exit**: Based on resistance levels, target percentage, or indicator thresholds
- **Stop-Loss**: Based on support levels, ATR, or fixed percentage (typically 2-5%)
- **Risk/Reward**: (Exit - Entry) / (Entry - Stop-Loss)

**Important Notes**:
- Only recommend EXECUTE with BUY signal if conditions are truly favorable
- Be conservative - it's better to miss a trade than take a bad one
- Clearly communicate your reasoning for transparency
- Consider the strategy's timeframe and risk tolerance
- NEVER recommend trades based on FOMO or incomplete analysis

**Output Format**:
Provide structured JSON with your decision, all prices, validation checks, and clear reasoning.`,
  
  // Structured output for database storage
  outputSchema: ValidatorOutputSchema,
  
  // Store validation result in session state
  outputKey: "trade_decision",
  
  // Low temperature for consistent, logical decisions
  generateContentConfig: {
    temperature: 0.2, // Very focused and deterministic
    maxOutputTokens: 1500,
  },
  
  // Logging callbacks
  beforeAgentCallback: (ctx) => {
    logger.info({ agentName: ctx.agentName }, "✓ Starting trade validation");
    return undefined;
  },
  
  afterAgentCallback: (ctx) => {
    logger.info({ agentName: ctx.agentName }, "✅ Trade validation complete");
    return undefined;
  },
});

/**
 * Parse validator agent output from JSON string
 * 
 * @param output - JSON string from validator agent
 * @returns ValidatorAgentOutput - Parsed structured output
 */
export function parseValidatorOutput(output: string): ValidatorAgentOutput {
  try {
    const parsed = JSON.parse(output);
    return ValidatorOutputSchema.parse(parsed);
  } catch (error) {
    logger.error({ error, output }, "Failed to parse validator output");
    throw new Error(`Invalid validator output: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Save trade to database if decision is EXECUTE and signal is BUY
 * 
 * @param validatorOutput - Validated trade decision
 * @param userId - User ID from strategy
 * @param strategyId - Strategy ID
 * @param amount - Trade amount from strategy
 * @param marketCondition - Market condition from analyzer
 * @param toolsUsed - List of tools used in analysis
 * @returns Trade document
 */
export async function saveTrade(
  validatorOutput: ValidatorAgentOutput,
  userId: string,
  strategyId: string,
  amount: number,
  marketCondition: string,
  toolsUsed: string[],
): Promise<typeof Trade.prototype | null> {
  try {
    // Only save trades that are EXECUTE decisions with BUY signals
    if (validatorOutput.decision !== "EXECUTE" || validatorOutput.signal !== "BUY") {
      logger.info(
        { decision: validatorOutput.decision, signal: validatorOutput.signal },
        "Skipping trade save - not an EXECUTE BUY decision"
      );
      return null;
    }

    // Validate required fields
    if (!validatorOutput.entry || !validatorOutput.exit || !validatorOutput.stopLoss) {
      logger.error({ validatorOutput }, "Missing required trade prices");
      throw new Error("Cannot save trade without entry, exit, and stop-loss prices");
    }

    // Create trade document
    const trade = new Trade({
      userId,
      strategyId,
      signal: validatorOutput.signal,
      entry: validatorOutput.entry,
      exit: validatorOutput.exit,
      stopLoss: validatorOutput.stopLoss,
      reasoning: validatorOutput.reasoning,
      confidence: validatorOutput.confidence,
      riskRewardRatio: validatorOutput.riskRewardRatio || 0,
      amount,
      status: "PENDING", // Trade is detected but not yet placed
      marketCondition,
      toolsUsed,
    });

    await trade.save();
    
    logger.info(
      {
        tradeId: trade._id,
        signal: trade.signal,
        entry: trade.entry,
        exit: trade.exit,
        confidence: trade.confidence,
      },
      "✅ Trade saved to database with PENDING status"
    );

    return trade;
  } catch (error) {
    logger.error({ error, validatorOutput }, "Failed to save trade to database");
    throw new Error(`Failed to save trade: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}
