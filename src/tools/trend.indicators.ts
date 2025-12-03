import { createTool } from "@adk/tools";
import { z } from "zod";
import {
  sma,
  ema,
  macd,
  parabolicSar,
  aroon,
  adx,
  cci,
  vortex,
  dema,
  tema,
  bop,
  massIndex,
  trix,
  vwma,
} from "indicatorts";
import { getOHLCArrays, getMarketData } from "./marketData";
import logger from "../lib/logger";
import type {
  SimpleMovingAverageResult,
  ExponentialMovingAverageResult,
  MovingAverageConvergenceDivergenceResult,
  ParabolicSARResult,
  AroonIndicatorResult,
  AverageDirectionalIndexResult,
  CommodityChannelIndexResult,
  VortexIndicatorResult,
  DoubleExponentialMovingAverageResult,
  TripleExponentialMovingAverageResult,
  BalanceOfPowerResult,
  MassIndexResult,
  TripleExponentialAverageResult,
  VolumeWeightedMovingAverageResult,
} from "./types/trend.types";
import type { TrendDirection, SignalStrength } from "./types/common.types";

/**
 * Simple Moving Average (SMA) tool
 * Analyzes trend direction using SMA
 */
export const simpleMovingAverageTool = createTool({
  name: "simpleMovingAverage",
  description: "Analyzes price trend using Simple Moving Average (SMA). Identifies trend direction, price position relative to SMA, and potential crossovers.",
  schema: z.object({
    period: z.number().min(2).max(200).default(20).describe("SMA period (e.g., 20, 50, 200)"),
    interval: z.enum(["1m", "5m", "15m", "1h", "4h", "1d"]).default("15m").describe("Time interval"),
  }),
  fn: async (params): Promise<SimpleMovingAverageResult> => {
    try {
      const { period, interval } = params;
      const limit = period + 50; // Extra candles for analysis
      const { close } = await getOHLCArrays(interval, limit);
      const candles = await getMarketData(interval, limit);

      const smaValues = sma(period, close);
      const currentPrice = close[close.length - 1];
      const currentSma = smaValues[smaValues.length - 1];
      const previousSma = smaValues[smaValues.length - 2];

      // Determine trend
      let trend: TrendDirection = "NEUTRAL";
      if (currentSma > previousSma) trend = "UPWARD";
      else if (currentSma < previousSma) trend = "DOWNWARD";

      // Price position
      const priceAboveSma = currentPrice > currentSma;
      const pricePosition = priceAboveSma ? "ABOVE" : "BELOW";

      // Crossover detection
      const previousPrice = close[close.length - 2];
      const crossoverDetected = 
        (previousPrice <= previousSma && currentPrice > currentSma) || // Bullish crossover
        (previousPrice >= previousSma && currentPrice < currentSma);   // Bearish crossover

      const bullishCrossover = previousPrice <= previousSma && currentPrice > currentSma;

      // Signal determination
      let signal: "BUY" | "SELL" | "HOLD" = "HOLD";
      let confidence: SignalStrength = "MODERATE";

      if (bullishCrossover && trend === "UPWARD") {
        signal = "BUY";
        confidence = "STRONG";
      } else if (!bullishCrossover && crossoverDetected && trend === "DOWNWARD") {
        signal = "SELL";
        confidence = "STRONG";
      } else if (priceAboveSma && trend === "UPWARD") {
        signal = "BUY";
        confidence = "MODERATE";
      } else if (!priceAboveSma && trend === "DOWNWARD") {
        signal = "SELL";
        confidence = "MODERATE";
      }

      const description = crossoverDetected
        ? `${bullishCrossover ? "Bullish" : "Bearish"} crossover detected. Price crossed ${
            bullishCrossover ? "above" : "below"
          } the ${period}-period SMA at ${currentSma.toFixed(2)}. Current price: ${currentPrice.toFixed(2)}. ${
            trend === "UPWARD" ? "Upward" : trend === "DOWNWARD" ? "Downward" : "Neutral"
          } trend confirmed.`
        : `Price is ${pricePosition.toLowerCase()} the ${period}-period SMA (${currentSma.toFixed(2)}). Current price: ${currentPrice.toFixed(2)}. Trend is ${trend.toLowerCase()}.`;

      return {
        signal,
        confidence,
        description,
        timestamp: candles[candles.length - 1].timestamp,
        trend,
        currentPrice,
        smaValue: currentSma,
        pricePosition,
        crossoverDetected,
      };
    } catch (error) {
      logger.error({ error, params }, "Error calculating SMA");
      throw new Error(`Failed to calculate SMA: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  },
});

/**
 * Exponential Moving Average (EMA) tool
 */
export const exponentialMovingAverageTool = createTool({
  name: "exponentialMovingAverage",
  description: "Analyzes price trend using Exponential Moving Average (EMA). More responsive to recent price changes than SMA.",
  schema: z.object({
    period: z.number().min(2).max(200).default(20).describe("EMA period"),
    interval: z.enum(["1m", "5m", "15m", "1h", "4h", "1d"]).default("15m"),
  }),
  fn: async (params): Promise<ExponentialMovingAverageResult> => {
    try {
      const { period, interval } = params;
      const limit = period + 50;
      const { close } = await getOHLCArrays(interval, limit);
      const candles = await getMarketData(interval, limit);

      const emaValues = ema(period, close);
      const currentPrice = close[close.length - 1];
      const currentEma = emaValues[emaValues.length - 1];
      const previousEma = emaValues[emaValues.length - 2];

      let trend: TrendDirection = "NEUTRAL";
      if (currentEma > previousEma) trend = "UPWARD";
      else if (currentEma < previousEma) trend = "DOWNWARD";

      const priceAboveEma = currentPrice > currentEma;
      const pricePosition = priceAboveEma ? "ABOVE" : "BELOW";

      const previousPrice = close[close.length - 2];
      const bullishCrossover = previousPrice <= previousEma && currentPrice > currentEma;
      const bearishCrossover = previousPrice >= previousEma && currentPrice < currentEma;
      const crossoverDetected = bullishCrossover || bearishCrossover;

      let signal: "BUY" | "SELL" | "HOLD" = "HOLD";
      let confidence: SignalStrength = "MODERATE";

      if (bullishCrossover && trend === "UPWARD") {
        signal = "BUY";
        confidence = "VERY_STRONG";
      } else if (bearishCrossover && trend === "DOWNWARD") {
        signal = "SELL";
        confidence = "VERY_STRONG";
      } else if (priceAboveEma && trend === "UPWARD") {
        signal = "BUY";
        confidence = "MODERATE";
      } else if (!priceAboveEma && trend === "DOWNWARD") {
        signal = "SELL";
        confidence = "MODERATE";
      }

      const description = crossoverDetected
        ? `Strong ${bullishCrossover ? "bullish" : "bearish"} signal! Price crossed ${
            bullishCrossover ? "above" : "below"
          } the ${period}-EMA at ${currentEma.toFixed(2)}. EMA is more responsive than SMA, suggesting ${
            bullishCrossover ? "buying" : "selling"
          } momentum is building.`
        : `Price ${pricePosition.toLowerCase()} ${period}-EMA (${currentEma.toFixed(2)}). Trend: ${trend.toLowerCase()}. EMA currently ${
            trend === "UPWARD" ? "rising" : trend === "DOWNWARD" ? "falling" : "flat"
          }.`;

      return {
        signal,
        confidence,
        description,
        timestamp: candles[candles.length - 1].timestamp,
        trend,
        currentPrice,
        emaValue: currentEma,
        pricePosition,
        crossoverDetected,
        responsiveness: "HIGH",
      };
    } catch (error) {
      logger.error({ error, params }, "Error calculating EMA");
      throw new Error(`Failed to calculate EMA: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  },
});

/**
 * MACD (Moving Average Convergence Divergence) tool
 */
export const macdTool = createTool({
  name: "movingAverageConvergenceDivergence",
  description: "Analyzes momentum and trend using MACD. Identifies trend changes, momentum shifts, and divergences.",
  schema: z.object({
    fastPeriod: z.number().default(12).describe("Fast EMA period"),
    slowPeriod: z.number().default(26).describe("Slow EMA period"),
    signalPeriod: z.number().default(9).describe("Signal line period"),
    interval: z.enum(["1m", "5m", "15m", "1h", "4h", "1d"]).default("15m"),
  }),
  fn: async (params): Promise<MovingAverageConvergenceDivergenceResult> => {
    try {
      const { fastPeriod, slowPeriod, signalPeriod, interval } = params;
      const limit = Math.max(slowPeriod, fastPeriod) + signalPeriod + 50;
      const { close } = await getOHLCArrays(interval, limit);
      const candles = await getMarketData(interval, limit);

      const macdResult = macd(fastPeriod, slowPeriod, signalPeriod, close);
      const macdLine = macdResult.macdLine[macdResult.macdLine.length - 1];
      const signalLine = macdResult.signalLine[macdResult.signalLine.length - 1];
      const histogram = macdResult.histogram[macdResult.histogram.length - 1];
      const prevHistogram = macdResult.histogram[macdResult.histogram.length - 2];

      // Crossover detection
      const prevMacd = macdResult.macdLine[macdResult.macdLine.length - 2];
      const prevSignal = macdResult.signalLine[macdResult.signalLine.length - 2];
      const bullishCrossover = prevMacd <= prevSignal && macdLine > signalLine;
      const bearishCrossover = prevMacd >= prevSignal && macdLine < signalLine;
      const crossover = bullishCrossover ? "BULLISH" : bearishCrossover ? "BEARISH" : "NONE";

      // Divergence (simplified check)
      const divergence = "NONE"; // Would need price highs/lows for full divergence analysis

      // Momentum
      let momentum: "BULLISH" | "BEARISH" | "NEUTRAL" = "NEUTRAL";
      if (histogram > 0 && histogram > prevHistogram) momentum = "BULLISH";
      else if (histogram < 0 && histogram < prevHistogram) momentum = "BEARISH";

      let signal: "BUY" | "SELL" | "HOLD" = "HOLD";
      let confidence: SignalStrength = "MODERATE";

      if (bullishCrossover && histogram > 0) {
        signal = "BUY";
        confidence = "VERY_STRONG";
      } else if (bearishCrossover && histogram < 0) {
        signal = "SELL";
        confidence = "VERY_STRONG";
      } else if (macdLine > signalLine && momentum === "BULLISH") {
        signal = "BUY";
        confidence = "MODERATE";
      } else if (macdLine < signalLine && momentum === "BEARISH") {
        signal = "SELL";
        confidence = "MODERATE";
      }

      const description = crossover !== "NONE"
        ? `${crossover} MACD crossover detected! MACD line (${macdLine.toFixed(4)}) crossed ${
            crossover === "BULLISH" ? "above" : "below"
          } signal line (${signalLine.toFixed(4)}). Histogram: ${histogram.toFixed(4)}. Strong momentum shift ${
            crossover === "BULLISH" ? "upward" : "downward"
          }.`
        : `MACD: ${macdLine.toFixed(4)}, Signal: ${signalLine.toFixed(4)}, Histogram: ${histogram.toFixed(4)}. Momentum is ${momentum.toLowerCase()}. ${
            Math.abs(histogram) > Math.abs(prevHistogram) ? "Strengthening" : "Weakening"
          } trend.`;

      return {
        signal,
        confidence,
        description,
        timestamp: candles[candles.length - 1].timestamp,
        macdLine,
        signalLine,
        histogram,
        crossover,
        divergence,
        momentum,
      };
    } catch (error) {
      logger.error({ error, params }, "Error calculating MACD");
      throw new Error(`Failed to calculate MACD: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  },
});

/**
 * Parabolic SAR tool
 */
export const parabolicSarTool = createTool({
  name: "parabolicSAR",
  description: "Identifies potential trend reversals using Parabolic Stop and Reverse (SAR). Shows stop-loss levels and reversal points.",
  schema: z.object({
    accelerationFactor: z.number().default(0.02).describe("Acceleration factor"),
    maxAcceleration: z.number().default(0.2).describe("Maximum acceleration"),
    interval: z.enum(["1m", "5m", "15m", "1h", "4h", "1d"]).default("15m"),
  }),
  fn: async (params): Promise<ParabolicSARResult> => {
    try {
      const { accelerationFactor, maxAcceleration, interval } = params;
      const limit = 100;
      const { high, low, close } = await getOHLCArrays(interval, limit);
      const candles = await getMarketData(interval, limit);

      const sarValues = parabolicSar(accelerationFactor, maxAcceleration, high, low);
      const currentPrice = close[close.length - 1];
      const currentSar = sarValues[sarValues.length - 1];
      const previousSar = sarValues[sarValues.length - 2];

      const position = currentPrice > currentSar ? "ABOVE" : "BELOW";
      const previousPrice = close[close.length - 2];
      const reversalDetected =
        (previousPrice <= previousSar && currentPrice > currentSar) ||
        (previousPrice >= previousSar && currentPrice < currentSar);

      let signal: "BUY" | "SELL" | "HOLD" = "HOLD";
      let confidence: SignalStrength = "MODERATE";

      if (reversalDetected && position === "ABOVE") {
        signal = "BUY";
        confidence = "STRONG";
      } else if (reversalDetected && position === "BELOW") {
        signal = "SELL";
        confidence = "STRONG";
      } else if (position === "ABOVE" && currentSar < previousSar) {
        signal = "BUY";
        confidence = "MODERATE";
      } else if (position === "BELOW" && currentSar > previousSar) {
        signal = "SELL";
        confidence = "MODERATE";
      }

      const description = reversalDetected
        ? `Trend reversal detected! Price moved ${position.toLowerCase()} SAR level (${currentSar.toFixed(2)}). ${
            position === "ABOVE" ? "Bullish" : "Bearish"
          } trend likely starting. Consider ${position === "ABOVE" ? "buying" : "selling"}.`
        : `SAR at ${currentSar.toFixed(2)}, price ${position.toLowerCase()} at ${currentPrice.toFixed(2)}. ${
            position === "ABOVE" ? "Uptrend" : "Downtrend"
          } continues. Use SAR as trailing stop-loss.`;

      return {
        signal,
        confidence,
        description,
        timestamp: candles[candles.length - 1].timestamp,
        sarValue: currentSar,
        position,
        reversalDetected,
        stopLossLevel: currentSar,
      };
    } catch (error) {
      logger.error({ error, params }, "Error calculating Parabolic SAR");
      throw new Error(`Failed to calculate Parabolic SAR: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  },
});

/**
 * Aroon Indicator tool
 */
export const aroonTool = createTool({
  name: "aroonIndicator",
  description: "Identifies trend strength and potential reversals using Aroon Up and Aroon Down indicators.",
  schema: z.object({
    period: z.number().min(5).max(50).default(25).describe("Aroon period"),
    interval: z.enum(["1m", "5m", "15m", "1h", "4h", "1d"]).default("15m"),
  }),
  fn: async (params): Promise<AroonIndicatorResult> => {
    try {
      const { period, interval } = params;
      const limit = period + 50;
      const { high, low } = await getOHLCArrays(interval, limit);
      const candles = await getMarketData(interval, limit);

      const aroonResult = aroon(period, high, low);
      const aroonUp = aroonResult.up[aroonResult.up.length - 1];
      const aroonDown = aroonResult.down[aroonResult.down.length - 1];
      const oscillator = aroonUp - aroonDown;

      let trend: TrendDirection = "NEUTRAL";
      if (aroonUp > 70 && aroonDown < 30) trend = "UPWARD";
      else if (aroonDown > 70 && aroonUp < 30) trend = "DOWNWARD";

      let strength: SignalStrength = "WEAK";
      const maxAroon = Math.max(aroonUp, aroonDown);
      if (maxAroon > 90) strength = "VERY_STRONG";
      else if (maxAroon > 70) strength = "STRONG";
      else if (maxAroon > 50) strength = "MODERATE";

      const prevAroonUp = aroonResult.up[aroonResult.up.length - 2];
      const prevAroonDown = aroonResult.down[aroonResult.down.length - 2];
      const bullishCrossover = prevAroonUp <= prevAroonDown && aroonUp > aroonDown;
      const bearishCrossover = prevAroonUp >= prevAroonDown && aroonUp < aroonDown;
      const crossover = bullishCrossover ? "BULLISH" : bearishCrossover ? "BEARISH" : "NONE";

      let signal: "BUY" | "SELL" | "HOLD" = "HOLD";
      let confidence: SignalStrength = "MODERATE";

      if (bullishCrossover && aroonUp > 50) {
        signal = "BUY";
        confidence = "STRONG";
      } else if (bearishCrossover && aroonDown > 50) {
        signal = "SELL";
        confidence = "STRONG";
      } else if (trend === "UPWARD") {
        signal = "BUY";
        confidence = strength;
      } else if (trend === "DOWNWARD") {
        signal = "SELL";
        confidence = strength;
      }

      const description = crossover !== "NONE"
        ? `Aroon ${crossover.toLowerCase()} crossover! Aroon Up: ${aroonUp.toFixed(1)}%, Aroon Down: ${aroonDown.toFixed(1)}%. ${
            crossover === "BULLISH" ? "Bullish trend emerging" : "Bearish trend emerging"
          }.`
        : `Aroon Up: ${aroonUp.toFixed(1)}%, Down: ${aroonDown.toFixed(1)}%. ${
            trend === "UPWARD"
              ? "Strong uptrend - recent highs dominant"
              : trend === "DOWNWARD"
              ? "Strong downtrend - recent lows dominant"
              : "No clear trend"
          }. Strength: ${strength.toLowerCase()}.`;

      return {
        signal,
        confidence,
        description,
        timestamp: candles[candles.length - 1].timestamp,
        aroonUp,
        aroonDown,
        oscillator,
        trend,
        strength,
        crossover,
      };
    } catch (error) {
      logger.error({ error, params }, "Error calculating Aroon");
      throw new Error(`Failed to calculate Aroon: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  },
});

/**
 * ADX (Average Directional Index) tool
 */
export const adxTool = createTool({
  name: "averageDirectionalIndex",
  description: "Measures trend strength using ADX. Values above 25 indicate strong trends, below 20 suggest weak trends.",
  schema: z.object({
    period: z.number().min(5).max(50).default(14).describe("ADX period"),
    interval: z.enum(["1m", "5m", "15m", "1h", "4h", "1d"]).default("15m"),
  }),
  fn: async (params): Promise<AverageDirectionalIndexResult> => {
    try {
      const { period, interval } = params;
      const limit = period * 3;
      const { high, low, close } = await getOHLCArrays(interval, limit);
      const candles = await getMarketData(interval, limit);

      const adxResult = adx(period, high, low, close);
      const adxValue = adxResult.adx[adxResult.adx.length - 1];
      const plusDI = adxResult.pdi[adxResult.pdi.length - 1];
      const minusDI = adxResult.mdi[adxResult.mdi.length - 1];

      let strength: SignalStrength = "VERY_WEAK";
      if (adxValue > 50) strength = "VERY_STRONG";
      else if (adxValue > 25) strength = "STRONG";
      else if (adxValue > 20) strength = "MODERATE";
      else if (adxValue > 15) strength = "WEAK";

      let trend: TrendDirection = "NEUTRAL";
      if (plusDI > minusDI && adxValue > 25) trend = "UPWARD";
      else if (minusDI > plusDI && adxValue > 25) trend = "DOWNWARD";

      let signal: "BUY" | "SELL" | "HOLD" = "HOLD";
      let confidence: SignalStrength = "WEAK";

      if (trend === "UPWARD" && strength === "STRONG") {
        signal = "BUY";
        confidence = "STRONG";
      } else if (trend === "DOWNWARD" && strength === "STRONG") {
        signal = "SELL";
        confidence = "STRONG";
      }

      const trendStatus = adxValue > 25 ? "trending" : adxValue < 20 ? "ranging" : "weak trend";

      const description = `ADX: ${adxValue.toFixed(2)} (${strength.toLowerCase().replace("_", " ")}). +DI: ${plusDI.toFixed(2)}, -DI: ${minusDI.toFixed(2)}. Market is ${trendStatus}. ${
        trend === "UPWARD"
          ? "Bullish trend strength confirmed"
          : trend === "DOWNWARD"
          ? "Bearish trend strength confirmed"
          : "No strong directional bias"
      }.`;

      return {
        signal,
        confidence,
        description,
        timestamp: candles[candles.length - 1].timestamp,
        adxValue,
        plusDI,
        minusDI,
        strength,
        trend,
        trendStrength: adxValue > 25 ? "STRONG" : adxValue > 20 ? "MODERATE" : "WEAK",
      };
    } catch (error) {
      logger.error({ error, params }, "Error calculating ADX");
      throw new Error(`Failed to calculate ADX: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  },
});

// Export all tools
export const trendIndicatorTools = [
  simpleMovingAverageTool,
  exponentialMovingAverageTool,
  macdTool,
  parabolicSarTool,
  aroonTool,
  adxTool,
];
