/**
 * Trade Analysis Simulation Script
 * 
 * Simulates the complete AI agent workflow for a MACD + EMA strategy:
 * 1. Fetches an active strategy from the database
 * 2. Simulates the Refiner Agent output
 * 3. Simulates the Analyzer Agent output
 * 4. Simulates the Validator Agent output (REJECT decision)
 * 5. Saves a simulated trade to the database
 * 6. Sends a professional email with the analysis
 */

import mongoose from "mongoose";
import { Strategy, Trade } from "../db/schema";
import { emailService } from "../emails/email.util";
import { sendEmail } from "../emails/emailSender";
import TradeAnalysisEmail from "../emails/templates/trade-analysis";
import logger from "../lib/logger";
import "dotenv/config";

// Simulated analysis data for MACD + EMA strategy
const simulatedAnalysis = {
  // Refiner Agent Output
  refined: {
    refinedDescription: `This strategy combines MACD (Moving Average Convergence Divergence) with EMA (Exponential Moving Average) to identify high-probability trend-following entries. 

The core logic is:
1. Use EMA 50 as a trend filter - only trade when price respects this level
2. Use MACD crossovers as entry/exit signals for momentum confirmation
3. Combine both indicators to reduce false signals and improve win rate

Entry requires BOTH conditions: price above EMA 50 AND MACD bullish crossover. This ensures we're trading with the trend and have momentum confirmation.`,
    steps: [
      "Check if current price is above EMA 50 (confirms uptrend)",
      "Wait for MACD line to cross above Signal line (bullish momentum)",
      "Optional: Confirm MACD histogram turns positive for extra validation",
      "Enter long position when all conditions align",
      "Monitor for exit signals: MACD bearish cross OR price below EMA 50",
      "Use EMA 50 as dynamic stop-loss reference in uptrend",
    ],
    indicatorsNeeded: [
      "MACD (12, 26, 9) - for momentum and crossover signals",
      "EMA 50 - for trend direction and dynamic support",
      "Price action - relative to EMA 50",
    ],
    entryConditions: [
      "Price must be trading above EMA 50",
      "MACD line crosses above Signal line (bullish crossover)",
      "MACD histogram turns positive (optional confirmation)",
    ],
    exitConditions: [
      "MACD line crosses below Signal line (bearish crossover)",
      "Price closes below EMA 50 (trend break)",
      "Take profit at predetermined R:R ratio (e.g., 1:2)",
    ],
    riskManagement: `Place stop-loss below the EMA 50 level in an uptrend to allow for normal price fluctuations while protecting against trend reversals. Use a minimum 1:2 risk-reward ratio. Never risk more than 2-3% of account balance per trade.`,
    reasoning: `This strategy works because it combines trend-following (EMA) with momentum confirmation (MACD). By requiring both indicators to align, we filter out many false signals that would occur using either indicator alone. The EMA acts as a directional filter, while MACD provides precise entry/exit timing.`,
  },

  // Analyzer Agent Output
  analyzed: {
    toolsExecuted: [
      "exponentialMovingAverage",
      "movingAverageConvergenceDivergence",
      "averageTrueRange",
      "relativeStrengthIndex",
      "onBalanceVolume",
    ],
    marketCondition: "Sideways consolidation with declining momentum - range-bound market lacking clear directional bias",
    trendAnalysis: `Current price ($3,342.50) is hovering just around the EMA 50 ($3,338.00), indicating no clear trend. The price has been oscillating around this moving average for the past 8 hours, creating a consolidation zone between $3,320 and $3,360. 

The EMA 50 is flattening out (slope near zero), which is a classic sign of indecision and lack of directional momentum. For this strategy to work effectively, we need price to be clearly above EMA 50 with the EMA pointing upward - neither condition is met.

Technical context: Previous uptrend from $3,200 to $3,380 has stalled. Bulls and bears are in equilibrium around the $3,340 level.`,
    momentumAnalysis: `MACD is showing concerning signals that contradict the bullish requirements:

- MACD Line: -2.45
- Signal Line: -1.80  
- Histogram: -0.65 (negative and declining)

The MACD line is currently BELOW the Signal line, which is the opposite of our entry requirement. Furthermore, the histogram is negative and has been declining for the past 6 hours, indicating weakening bearish momentum that hasn't yet reversed.

For a valid entry signal, we need MACD to cross ABOVE the Signal line with a positive histogram. Current readings suggest momentum is still bearish/neutral, not bullish.

RSI at 48.5 confirms neutral momentum - neither overbought nor oversold, just range-bound price action.`,
    volatilityAnalysis: `ATR (Average True Range) is at $42.50 for the 15-minute timeframe, which is below the 20-period average of $51.30. This indicates:

1. Volatility compression - markets are coiling/consolidating
2. Lower risk per trade BUT also lower profit potential
3. Potential for breakout (in either direction) after volatility expansion

Bollinger Bands are narrowing, confirming the low volatility environment. Band width is at the 30th percentile compared to the last 100 periods.

This consolidation could precede a significant move, but without directional confirmation, it's premature to enter.`,
    volumeAnalysis: `Volume analysis reveals weak participation and lack of conviction:

- Current volume: 1,250 BTC (15-min period)
- Average volume: 1,850 BTC
- Volume is 32% below average

On-Balance Volume (OBV) is flat over the past 12 hours, showing no accumulation or distribution. This indicates:
1. Smart money is NOT positioning aggressively
2. Retail participation is low
3. Breakout direction is unpredictable without volume confirmation

For a high-confidence MACD + EMA long entry, we'd want to see volume spike on the MACD crossover to confirm buying interest. Current volume doesn't support aggressive positioning.`,
    keyInsights: [
      "Price is consolidating around EMA 50 with no clear trend direction - strategy requires clear uptrend",
      "MACD is in bearish territory (below signal line) - directly contradicts entry requirements",
      "Volume is 32% below average indicating weak market participation and lack of conviction",
      "ATR shows volatility compression which often precedes breakouts, but direction is uncertain",
      "All indicators point to 'wait and see' rather than aggressive entry - patience required",
    ],
    warnings: [
      "⚠️ CRITICAL: MACD crossover requirement not met - MACD line is below Signal line (bearish, not bullish)",
      "⚠️ Price is not clearly above EMA 50 - hovering around it suggests indecision, not trend strength",
      "⚠️ Low volume environment increases risk of false breakouts and whipsaws",
      "⚠️ Entering in consolidation phase contradicts trend-following nature of this strategy",
      "⚠️ Risk of getting stopped out if price oscillates around EMA 50 level",
    ],
    timestamp: new Date(),
  },

  // Validator Agent Output
  validated: {
    decision: "REJECT" as const,
    signal: "HOLD" as const,
    confidence: "WEAK" as const,
    entry: null,
    exit: null,
    stopLoss: null,
    reasoning: `Trade REJECTED - Entry conditions not met.

CRITICAL FAILURES:
1. MACD Crossover Missing: MACD (-2.45) is BELOW Signal line (-1.80). Strategy requires bullish crossover for entry.
2. Weak Trend: Price ($3,342.50) barely above EMA 50 ($3,338.00) by 0.13%. Not a clear uptrend - just consolidation.
3. Negative Histogram: MACD histogram at -0.65 (declining). Shows bearish momentum, not bullish.

RISK FACTORS:
- Success probability <30% without momentum/trend confirmation
- Price consolidating in $3,320-$3,360 range (unpredictable)
- Volume 32% below average (weak participation)
- EMA 50 is flat (no directional bias)

WHAT'S NEEDED:
1. Price >1% above EMA 50 (decisively in uptrend)
2. MACD bullish crossover (line above signal)
3. MACD histogram turns positive
4. Volume spike for confirmation
5. EMA 50 slopes upward

CONCLUSION: Strategy rules are clear - none are satisfied. Forcing entry now violates strategy logic and exposes capital to unnecessary risk. 

RECOMMENDATION: WAIT for proper setup. Monitor for MACD crossover with price clearly above rising EMA 50. Current market is sideways - respect that.`,
    riskRewardRatio: null,
    validationChecks: {
      strategyAlignment: false, // Entry conditions not met
      riskAcceptable: true, // Risk is manageable, but not the issue
      marketConditionsFavorable: false, // Consolidation, not trending
      sufficientConfidence: false, // Weak confidence due to lack of signals
    },
  },
};

async function simulateTradeAnalysis() {
  try {
    console.log("🚀 Starting trade analysis simulation...\n");

    // Connect to database
    console.log("📡 Connecting to database...");
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log("✅ Database connected\n");

    // Fetch one strategy from the database
    console.log("🔍 Fetching strategy from database...");
    const strategy = await Strategy.findOne({}).populate("userId").populate("indicators");

    if (!strategy) {
      throw new Error("No strategy found in database. Please create a strategy first.");
    }

    console.log(`✅ Found strategy: "${strategy.name}" (ID: ${strategy._id})\n`);

    // Create simulated trade in database
    console.log("💾 Creating simulated trade in database...");
    const trade = new Trade({
      userId: strategy.userId,
      strategyId: strategy._id,
      signal: simulatedAnalysis.validated.signal,
      entry: 3342.50, // Current price for reference
      exit: 3400.00, // Hypothetical exit
      stopLoss: 3320.00, // Hypothetical stop
      reasoning: simulatedAnalysis.validated.reasoning,
      confidence: simulatedAnalysis.validated.confidence,
      riskRewardRatio: 0, // No valid trade
      amount: strategy.amount || 0,
      status: "CANCELLED", // Mark as cancelled since it's rejected
      marketCondition: simulatedAnalysis.analyzed.marketCondition,
      toolsUsed: simulatedAnalysis.analyzed.toolsExecuted,
    });

    await trade.save();
    console.log(`✅ Trade saved to database (ID: ${trade._id})\n`);

    // Send email with analysis
    console.log("📧 Preparing to send analysis email...");
    
    const emailResult = await sendEmail({
      to: "patrickojiambo206@gmail.com",
      subject: `🚫 Trade Analysis: ${strategy.name} - DO NOT TRADE`,
      react: TradeAnalysisEmail({
        strategyName: strategy.name,
        decision: simulatedAnalysis.validated.decision,
        signal: simulatedAnalysis.validated.signal,
        confidence: simulatedAnalysis.validated.confidence,
        reasoning: simulatedAnalysis.validated.reasoning,
        marketCondition: simulatedAnalysis.analyzed.marketCondition,
        trendAnalysis: simulatedAnalysis.analyzed.trendAnalysis,
        momentumAnalysis: simulatedAnalysis.analyzed.momentumAnalysis,
        volatilityAnalysis: simulatedAnalysis.analyzed.volatilityAnalysis,
        volumeAnalysis: simulatedAnalysis.analyzed.volumeAnalysis,
        keyInsights: simulatedAnalysis.analyzed.keyInsights,
        warnings: simulatedAnalysis.analyzed.warnings,
        validationChecks: simulatedAnalysis.validated.validationChecks,
        timestamp: simulatedAnalysis.analyzed.timestamp.toISOString(),
      }),
    });

    if (emailResult.success) {
      console.log(`✅ Email sent successfully! Message ID: ${emailResult.messageId}\n`);
    } else {
      console.error(`❌ Email failed to send:`, emailResult.error);
    }

    // Print summary
    console.log("\n" + "=".repeat(60));
    console.log("📊 SIMULATION SUMMARY");
    console.log("=".repeat(60));
    console.log(`Strategy: ${strategy.name}`);
    console.log(`Decision: ${simulatedAnalysis.validated.decision}`);
    console.log(`Signal: ${simulatedAnalysis.validated.signal}`);
    console.log(`Confidence: ${simulatedAnalysis.validated.confidence}`);
    console.log(`Trade ID: ${trade._id}`);
    console.log(`Trade Status: ${trade.status}`);
    console.log(`\nKey Reason: MACD crossover not met - price in consolidation`);
    console.log(`\n✅ Simulation completed successfully!`);
    console.log("=".repeat(60) + "\n");

  } catch (error) {
    console.error("\n❌ Simulation failed:", error);
    throw error;
  } finally {
    // Disconnect from database
    await mongoose.disconnect();
    console.log("\n🔌 Database disconnected");
  }
}

// Run the simulation
if (require.main === module) {
  simulateTradeAnalysis()
    .then(() => {
      console.log("\n✨ Simulation script finished\n");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n💥 Fatal error:", error);
      process.exit(1);
    });
}

export { simulateTradeAnalysis };
