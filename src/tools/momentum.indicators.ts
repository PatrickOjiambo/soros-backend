import { createTool } from "@iqai/adk/tools";
import { z } from "zod";
import {
  rsi,
  stochastic,
  williamsR,
  roc,
  awesomeOscillator,
  ppo,
  pvo,
  ichimokuCloud,
} from "indicatorts";
import { getOHLCArrays, getMarketData } from "./marketData";
import logger from "../lib/logger";
import type {
  RelativeStrengthIndexResult,
  StochasticOscillatorResult,
  WilliamsRResult,
  RateOfChangeResult,
  AwesomeOscillatorResult,
  PercentagePriceOscillatorResult,
  PercentageVolumeOscillatorResult,
  IchimokuCloudResult,
} from "./types/momentum.types";
import type { SignalStrength, TrendDirection } from "./types/common.types";

/**
 * RSI (Relative Strength Index) tool
 */
export const rsiTool = createTool({
  name: "relativeStrengthIndex",
  description: "Measures momentum and identifies overbought/oversold conditions using RSI. Values above 70 suggest overbought, below 30 suggest oversold.",
  schema: z.object({
    period: z.number().min(2).max(50).default(14).describe("RSI period"),
    interval: z.enum(["1m", "5m", "15m", "1h", "4h", "1d"]).default("15m"),
  }),
  fn: async (params): Promise<RelativeStrengthIndexResult> => {
    try {
      const { period, interval } = params;
      const limit = period * 3;
      const { close } = await getOHLCArrays(interval, limit);
      const candles = await getMarketData(interval, limit);

      const rsiValues = rsi(period, close);
      const currentRsi = rsiValues[rsiValues.length - 1];
      const previousRsi = rsiValues[rsiValues.length - 2];

      let marketCondition: "OVERBOUGHT" | "OVERSOLD" | "NEUTRAL" = "NEUTRAL";
      if (currentRsi > 70) marketCondition = "OVERBOUGHT";
      else if (currentRsi < 30) marketCondition = "OVERSOLD";

      // Simplified divergence check
      const divergence = "NONE";

      let trendStrength: SignalStrength = "MODERATE";
      if (currentRsi > 80 || currentRsi < 20) trendStrength = "VERY_STRONG";
      else if (currentRsi > 70 || currentRsi < 30) trendStrength = "STRONG";
      else if (currentRsi > 60 || currentRsi < 40) trendStrength = "MODERATE";
      else trendStrength = "WEAK";

      let signal: "BUY" | "SELL" | "HOLD" = "HOLD";
      let confidence: SignalStrength = "MODERATE";

      if (currentRsi < 30 && previousRsi < currentRsi) {
        signal = "BUY";
        confidence = "STRONG";
      } else if (currentRsi > 70 && previousRsi > currentRsi) {
        signal = "SELL";
        confidence = "STRONG";
      } else if (currentRsi > 50 && currentRsi < 70) {
        signal = "BUY";
        confidence = "WEAK";
      } else if (currentRsi < 50 && currentRsi > 30) {
        signal = "SELL";
        confidence = "WEAK";
      }

      const description =
        marketCondition === "OVERBOUGHT"
          ? `RSI at ${currentRsi.toFixed(2)} - OVERBOUGHT territory! Price may be overextended. Consider taking profits or waiting for pullback. ${
              previousRsi > currentRsi ? "RSI starting to decline - reversal possible." : "Still climbing - extreme momentum."
            }`
          : marketCondition === "OVERSOLD"
          ? `RSI at ${currentRsi.toFixed(2)} - OVERSOLD territory! Price may be undervalued. Potential buying opportunity. ${
              previousRsi < currentRsi ? "RSI starting to rise - reversal possible." : "Still falling - strong selling pressure."
            }`
          : `RSI at ${currentRsi.toFixed(2)} - NEUTRAL zone. Market momentum is balanced. ${
              currentRsi > 50 ? "Slight bullish bias" : "Slight bearish bias"
            }. Trend strength: ${trendStrength.toLowerCase().replace("_", " ")}.`;

      return {
        signal,
        confidence,
        description,
        timestamp: candles[candles.length - 1].timestamp,
        rsiValue: currentRsi,
        marketCondition,
        divergence,
        trendStrength,
      };
    } catch (error) {
      logger.error({ error, params }, "Error calculating RSI");
      throw new Error(`Failed to calculate RSI: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  },
});

/**
 * Stochastic Oscillator tool
 */
export const stochasticTool = createTool({
  name: "stochasticOscillator",
  description: "Identifies momentum and overbought/oversold conditions using Stochastic Oscillator. Compares closing price to price range.",
  schema: z.object({
    kPeriod: z.number().default(14).describe("%K period"),
    dPeriod: z.number().default(3).describe("%D period (signal line)"),
    interval: z.enum(["1m", "5m", "15m", "1h", "4h", "1d"]).default("15m"),
  }),
  fn: async (params): Promise<StochasticOscillatorResult> => {
    try {
      const { kPeriod, dPeriod, interval } = params;
      const limit = kPeriod + dPeriod + 50;
      const { high, low, close } = await getOHLCArrays(interval, limit);
      const candles = await getMarketData(interval, limit);

      const stochResult = stochastic(kPeriod, dPeriod, high, low, close);
      const kValue = stochResult.k[stochResult.k.length - 1];
      const dValue = stochResult.d[stochResult.d.length - 1];
      const prevK = stochResult.k[stochResult.k.length - 2];
      const prevD = stochResult.d[stochResult.d.length - 2];

      let marketCondition: "OVERBOUGHT" | "OVERSOLD" | "NEUTRAL" = "NEUTRAL";
      if (kValue > 80 || dValue > 80) marketCondition = "OVERBOUGHT";
      else if (kValue < 20 || dValue < 20) marketCondition = "OVERSOLD";

      const bullishCrossover = prevK <= prevD && kValue > dValue;
      const bearishCrossover = prevK >= prevD && kValue < dValue;
      const crossover = bullishCrossover ? "BULLISH" : bearishCrossover ? "BEARISH" : "NONE";

      const divergence = "NONE";

      let signal: "BUY" | "SELL" | "HOLD" = "HOLD";
      let confidence: SignalStrength = "MODERATE";

      if (bullishCrossover && kValue < 40) {
        signal = "BUY";
        confidence = "VERY_STRONG";
      } else if (bearishCrossover && kValue > 60) {
        signal = "SELL";
        confidence = "VERY_STRONG";
      } else if (marketCondition === "OVERSOLD" && kValue > dValue) {
        signal = "BUY";
        confidence = "MODERATE";
      } else if (marketCondition === "OVERBOUGHT" && kValue < dValue) {
        signal = "SELL";
        confidence = "MODERATE";
      }

      const description =
        crossover !== "NONE"
          ? `Stochastic ${crossover.toLowerCase()} crossover! %K (${kValue.toFixed(2)}) crossed ${
              crossover === "BULLISH" ? "above" : "below"
            } %D (${dValue.toFixed(2)}). ${
              marketCondition === "OVERSOLD" && crossover === "BULLISH"
                ? "Strong buy signal from oversold zone!"
                : marketCondition === "OVERBOUGHT" && crossover === "BEARISH"
                ? "Strong sell signal from overbought zone!"
                : `${crossover === "BULLISH" ? "Bullish" : "Bearish"} momentum shift.`
            }`
          : `Stochastic: %K=${kValue.toFixed(2)}, %D=${dValue.toFixed(2)}. ${
              marketCondition === "OVERBOUGHT"
                ? "Overbought - potential reversal"
                : marketCondition === "OVERSOLD"
                ? "Oversold - potential bounce"
                : "Neutral momentum"
            }.`;

      return {
        signal,
        confidence,
        description,
        timestamp: candles[candles.length - 1].timestamp,
        kValue,
        dValue,
        marketCondition,
        crossover,
        divergence,
      };
    } catch (error) {
      logger.error({ error, params }, "Error calculating Stochastic");
      throw new Error(`Failed to calculate Stochastic: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  },
});

/**
 * Williams %R tool
 */
export const williamsRTool = createTool({
  name: "williamsR",
  description: "Measures momentum and identifies overbought/oversold levels using Williams %R. Similar to Stochastic but inverted scale.",
  schema: z.object({
    period: z.number().min(5).max(50).default(14).describe("Williams %R period"),
    interval: z.enum(["1m", "5m", "15m", "1h", "4h", "1d"]).default("15m"),
  }),
  fn: async (params): Promise<WilliamsRResult> => {
    try {
      const { period, interval } = params;
      const limit = period + 50;
      const { high, low, close } = await getOHLCArrays(interval, limit);
      const candles = await getMarketData(interval, limit);

      const wrValues = williamsR(period, high, low, close);
      const williamsRValue = wrValues[wrValues.length - 1];
      const previousWR = wrValues[wrValues.length - 2];

      let marketCondition: "OVERBOUGHT" | "OVERSOLD" | "NEUTRAL" = "NEUTRAL";
      if (williamsRValue > -20) marketCondition = "OVERBOUGHT";
      else if (williamsRValue < -80) marketCondition = "OVERSOLD";

      let reversalPotential: "HIGH" | "MODERATE" | "LOW" = "LOW";
      if ((marketCondition === "OVERBOUGHT" && williamsRValue < previousWR) ||
          (marketCondition === "OVERSOLD" && williamsRValue > previousWR)) {
        reversalPotential = "HIGH";
      } else if (marketCondition !== "NEUTRAL") {
        reversalPotential = "MODERATE";
      }

      let momentum: "BULLISH" | "BEARISH" | "NEUTRAL" = "NEUTRAL";
      if (williamsRValue > previousWR && williamsRValue < -50) momentum = "BULLISH";
      else if (williamsRValue < previousWR && williamsRValue > -50) momentum = "BEARISH";

      let signal: "BUY" | "SELL" | "HOLD" = "HOLD";
      let confidence: SignalStrength = "MODERATE";

      if (marketCondition === "OVERSOLD" && williamsRValue > previousWR) {
        signal = "BUY";
        confidence = reversalPotential === "HIGH" ? "STRONG" : "MODERATE";
      } else if (marketCondition === "OVERBOUGHT" && williamsRValue < previousWR) {
        signal = "SELL";
        confidence = reversalPotential === "HIGH" ? "STRONG" : "MODERATE";
      }

      const description = `Williams %R: ${williamsRValue.toFixed(2)}. ${
        marketCondition === "OVERBOUGHT"
          ? `OVERBOUGHT (>${-20}). ${reversalPotential === "HIGH" ? "High reversal potential - consider selling!" : "Monitor for reversal."}`
          : marketCondition === "OVERSOLD"
          ? `OVERSOLD (<${-80}). ${reversalPotential === "HIGH" ? "High reversal potential - consider buying!" : "Monitor for bounce."}`
          : `NEUTRAL range. Momentum: ${momentum.toLowerCase()}.`
      }`;

      return {
        signal,
        confidence,
        description,
        timestamp: candles[candles.length - 1].timestamp,
        williamsRValue,
        marketCondition,
        reversalPotential,
        momentum,
      };
    } catch (error) {
      logger.error({ error, params }, "Error calculating Williams %R");
      throw new Error(`Failed to calculate Williams %R: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  },
});

/**
 * ROC (Rate of Change) tool
 */
export const rocTool = createTool({
  name: "rateOfChange",
  description: "Measures momentum by calculating rate of change in price over a period. Positive values indicate upward momentum.",
  schema: z.object({
    period: z.number().min(5).max(50).default(12).describe("ROC period"),
    interval: z.enum(["1m", "5m", "15m", "1h", "4h", "1d"]).default("15m"),
  }),
  fn: async (params): Promise<RateOfChangeResult> => {
    try {
      const { period, interval } = params;
      const limit = period + 50;
      const { close } = await getOHLCArrays(interval, limit);
      const candles = await getMarketData(interval, limit);

      const rocValues = roc(period, close);
      const rocValue = rocValues[rocValues.length - 1];
      const previousRoc = rocValues[rocValues.length - 2];

      let momentum: TrendDirection = "NEUTRAL";
      if (rocValue > 0) momentum = "UPWARD";
      else if (rocValue < 0) momentum = "DOWNWARD";

      let acceleration: "INCREASING" | "DECREASING" | "STABLE" = "STABLE";
      if (Math.abs(rocValue) > Math.abs(previousRoc) * 1.1) acceleration = "INCREASING";
      else if (Math.abs(rocValue) < Math.abs(previousRoc) * 0.9) acceleration = "DECREASING";

      let strength: SignalStrength = "WEAK";
      const absRoc = Math.abs(rocValue);
      if (absRoc > 5) strength = "VERY_STRONG";
      else if (absRoc > 3) strength = "STRONG";
      else if (absRoc > 1) strength = "MODERATE";

      let signal: "BUY" | "SELL" | "HOLD" = "HOLD";
      let confidence: SignalStrength = "MODERATE";

      if (rocValue > 0 && acceleration === "INCREASING") {
        signal = "BUY";
        confidence = strength;
      } else if (rocValue < 0 && acceleration === "INCREASING") {
        signal = "SELL";
        confidence = strength;
      }

      const description = `ROC: ${rocValue.toFixed(2)}%. ${
        momentum === "UPWARD"
          ? `Positive momentum - price rising ${Math.abs(rocValue).toFixed(2)}% over ${period} periods`
          : momentum === "DOWNWARD"
          ? `Negative momentum - price falling ${Math.abs(rocValue).toFixed(2)}% over ${period} periods`
          : "No momentum"
      }. Acceleration: ${acceleration.toLowerCase()}. Strength: ${strength.toLowerCase().replace("_", " ")}.`;

      return {
        signal,
        confidence,
        description,
        timestamp: candles[candles.length - 1].timestamp,
        rocValue,
        momentum,
        acceleration,
        strength,
      };
    } catch (error) {
      logger.error({ error, params }, "Error calculating ROC");
      throw new Error(`Failed to calculate ROC: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  },
});

/**
 * Awesome Oscillator tool
 */
export const awesomeOscillatorTool = createTool({
  name: "awesomeOscillator",
  description: "Measures market momentum using Awesome Oscillator. Identifies saucer patterns and zero-line crossovers.",
  schema: z.object({
    shortPeriod: z.number().default(5).describe("Short SMA period"),
    longPeriod: z.number().default(34).describe("Long SMA period"),
    interval: z.enum(["1m", "5m", "15m", "1h", "4h", "1d"]).default("15m"),
  }),
  fn: async (params): Promise<AwesomeOscillatorResult> => {
    try {
      const { shortPeriod, longPeriod, interval } = params;
      const limit = longPeriod + 50;
      const { high, low } = await getOHLCArrays(interval, limit);
      const candles = await getMarketData(interval, limit);

      const aoValues = awesomeOscillator(shortPeriod, longPeriod, high, low);
      const aoValue = aoValues[aoValues.length - 1];
      const prevAO = aoValues[aoValues.length - 2];
      const prevAO2 = aoValues[aoValues.length - 3];

      let momentum: "BULLISH" | "BEARISH" | "NEUTRAL" = "NEUTRAL";
      if (aoValue > 0) momentum = "BULLISH";
      else if (aoValue < 0) momentum = "BEARISH";

      // Saucer pattern detection
      let saucerPattern: "BULLISH_SAUCER" | "BEARISH_SAUCER" | "NONE" = "NONE";
      if (aoValue > 0 && aoValue > prevAO && prevAO < prevAO2) saucerPattern = "BULLISH_SAUCER";
      else if (aoValue < 0 && aoValue < prevAO && prevAO > prevAO2) saucerPattern = "BEARISH_SAUCER";

      const bullishCrossover = prevAO <= 0 && aoValue > 0;
      const bearishCrossover = prevAO >= 0 && aoValue < 0;
      const crossover = bullishCrossover ? "BULLISH" : bearishCrossover ? "BEARISH" : "NONE";

      let signal: "BUY" | "SELL" | "HOLD" = "HOLD";
      let confidence: SignalStrength = "MODERATE";

      if (saucerPattern === "BULLISH_SAUCER" || (bullishCrossover && aoValue > prevAO)) {
        signal = "BUY";
        confidence = saucerPattern === "BULLISH_SAUCER" ? "STRONG" : "MODERATE";
      } else if (saucerPattern === "BEARISH_SAUCER" || (bearishCrossover && aoValue < prevAO)) {
        signal = "SELL";
        confidence = saucerPattern === "BEARISH_SAUCER" ? "STRONG" : "MODERATE";
      }

      const description =
        saucerPattern !== "NONE"
          ? `${saucerPattern.replace("_", " ")} detected! AO: ${aoValue.toFixed(4)}. Strong ${
              saucerPattern === "BULLISH_SAUCER" ? "buy" : "sell"
            } signal - momentum reversing.`
          : crossover !== "NONE"
          ? `AO ${crossover.toLowerCase()} crossover at zero line! Current: ${aoValue.toFixed(4)}. ${
              crossover === "BULLISH" ? "Bullish momentum building" : "Bearish momentum building"
            }.`
          : `AO: ${aoValue.toFixed(4)}. ${momentum} momentum. ${
              Math.abs(aoValue) > Math.abs(prevAO) ? "Strengthening" : "Weakening"
            }.`;

      return {
        signal,
        confidence,
        description,
        timestamp: candles[candles.length - 1].timestamp,
        aoValue,
        momentum,
        saucerPattern,
        crossover,
      };
    } catch (error) {
      logger.error({ error, params }, "Error calculating Awesome Oscillator");
      throw new Error(`Failed to calculate Awesome Oscillator: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  },
});

/**
 * PPO (Percentage Price Oscillator) tool
 */
export const ppoTool = createTool({
  name: "percentagePriceOscillator",
  description: "Measures momentum using Percentage Price Oscillator. Similar to MACD but normalized as percentage.",
  schema: z.object({
    fastPeriod: z.number().default(12).describe("Fast EMA period"),
    slowPeriod: z.number().default(26).describe("Slow EMA period"),
    signalPeriod: z.number().default(9).describe("Signal line period"),
    interval: z.enum(["1m", "5m", "15m", "1h", "4h", "1d"]).default("15m"),
  }),
  fn: async (params): Promise<PercentagePriceOscillatorResult> => {
    try {
      const { fastPeriod, slowPeriod, signalPeriod, interval } = params;
      const limit = Math.max(slowPeriod, fastPeriod) + signalPeriod + 50;
      const { close } = await getOHLCArrays(interval, limit);
      const candles = await getMarketData(interval, limit);

      const ppoResult = ppo(fastPeriod, slowPeriod, signalPeriod, close);
      const ppoValue = ppoResult.ppo[ppoResult.ppo.length - 1];
      const signalLine = ppoResult.signal[ppoResult.signal.length - 1];
      const histogram = ppoResult.histogram[ppoResult.histogram.length - 1];

      const prevPPO = ppoResult.ppo[ppoResult.ppo.length - 2];
      const prevSignal = ppoResult.signal[ppoResult.signal.length - 2];
      const bullishCrossover = prevPPO <= prevSignal && ppoValue > signalLine;
      const bearishCrossover = prevPPO >= prevSignal && ppoValue < signalLine;
      const crossover = bullishCrossover ? "BULLISH" : bearishCrossover ? "BEARISH" : "NONE";

      const divergence = "NONE";

      let signal: "BUY" | "SELL" | "HOLD" = "HOLD";
      let confidence: SignalStrength = "MODERATE";

      if (bullishCrossover && histogram > 0) {
        signal = "BUY";
        confidence = "STRONG";
      } else if (bearishCrossover && histogram < 0) {
        signal = "SELL";
        confidence = "STRONG";
      } else if (ppoValue > signalLine && histogram > 0) {
        signal = "BUY";
        confidence = "MODERATE";
      } else if (ppoValue < signalLine && histogram < 0) {
        signal = "SELL";
        confidence = "MODERATE";
      }

      const description = crossover !== "NONE"
        ? `PPO ${crossover.toLowerCase()} crossover! PPO (${ppoValue.toFixed(2)}%) crossed ${
            crossover === "BULLISH" ? "above" : "below"
          } signal (${signalLine.toFixed(2)}%). Histogram: ${histogram.toFixed(2)}%.`
        : `PPO: ${ppoValue.toFixed(2)}%, Signal: ${signalLine.toFixed(2)}%, Histogram: ${histogram.toFixed(2)}%. ${
            histogram > 0 ? "Positive" : "Negative"
          } momentum.`;

      return {
        signal,
        confidence,
        description,
        timestamp: candles[candles.length - 1].timestamp,
        ppoValue,
        signalLine,
        histogram,
        crossover,
        divergence,
      };
    } catch (error) {
      logger.error({ error, params }, "Error calculating PPO");
      throw new Error(`Failed to calculate PPO: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  },
});

// Export all tools
export const momentumIndicatorTools = [
  rsiTool,
  stochasticTool,
  williamsRTool,
  rocTool,
  awesomeOscillatorTool,
  ppoTool,
];
