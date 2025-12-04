import { createTool } from "@iqai/adk/tools";
import { z } from "zod";
import {
  atr,
  bollingerBands,
  bollingerBandsWidth,
  keltnerChannel,
  donchianChannel,
  chandelierExit,
  accelerationBands,
  mstd,
  projectionOscillator,
  trueRange,
  ulcerIndex,
} from "indicatorts";
import { getOHLCArrays, getMarketData } from "./marketData";
import logger from "../lib/logger";
import type {
  AverageTrueRangeResult,
  BollingerBandsResult,
  BollingerBandWidthResult,
  KeltnerChannelResult,
  DonchianChannelResult,
  ChandelierExitResult,
  AccelerationBandsResult,
  MovingStandardDeviationResult,
  ProjectionOscillatorResult,
  TrueRangeResult,
  UlcerIndexResult,
} from "./types/volatility.types";
import type { SignalStrength, TrendDirection, VolatilityLevel } from "./types/common.types";

/**
 * ATR (Average True Range) tool
 */
export const atrTool = createTool({
  name: "averageTrueRange",
  description: "Measures market volatility using Average True Range. High ATR indicates high volatility, low ATR indicates low volatility.",
  schema: z.object({
    period: z.number().min(5).max(50).default(14).describe("ATR period"),
    interval: z.enum(["1m", "5m", "15m", "1h", "4h", "1d"]).default("15m"),
  }),
  fn: async (params): Promise<AverageTrueRangeResult> => {
    try {
      const { period, interval } = params;
      const limit = period * 2;
      const { high, low, close } = await getOHLCArrays(interval, limit);
      const candles = await getMarketData(interval, limit);

      const atrValues = atr(period, high, low, close);
      const atrValue = atrValues[atrValues.length - 1];
      const previousATR = atrValues[atrValues.length - 2];
      const currentPrice = close[close.length - 1];
      const percentOfPrice = (atrValue / currentPrice) * 100;

      let volatility: VolatilityLevel = "MODERATE";
      if (percentOfPrice > 5) volatility = "VERY_HIGH";
      else if (percentOfPrice > 3) volatility = "HIGH";
      else if (percentOfPrice > 1.5) volatility = "MODERATE";
      else if (percentOfPrice > 0.5) volatility = "LOW";
      else volatility = "VERY_LOW";

      let trend: "EXPANDING" | "CONTRACTING" | "STABLE" = "STABLE";
      const atrChange = ((atrValue - previousATR) / previousATR) * 100;
      if (atrChange > 5) trend = "EXPANDING";
      else if (atrChange < -5) trend = "CONTRACTING";

      let signal: "BUY" | "SELL" | "HOLD" = "HOLD";
      let confidence: SignalStrength = "WEAK";

      const description = `ATR: ${atrValue.toFixed(4)} (${percentOfPrice.toFixed(2)}% of price). Volatility: ${volatility
        .toLowerCase()
        .replace("_", " ")}. ${
        trend === "EXPANDING"
          ? "Volatility EXPANDING - increased risk and opportunity. Consider wider stops."
          : trend === "CONTRACTING"
          ? "Volatility CONTRACTING - potential breakout ahead. Market consolidating."
          : "Volatility STABLE - normal market conditions."
      }`;

      return {
        signal,
        confidence,
        description,
        timestamp: candles[candles.length - 1].timestamp,
        atrValue,
        volatility,
        trend,
        percentOfPrice,
      };
    } catch (error) {
      logger.error({ error, params }, "Error calculating ATR");
      throw new Error(`Failed to calculate ATR: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  },
});

/**
 * Bollinger Bands tool
 */
export const bollingerBandsTool = createTool({
  name: "bollingerBands",
  description: "Volatility bands around moving average. Price at upper band suggests overbought, at lower band suggests oversold. Squeeze indicates low volatility.",
  schema: z.object({
    period: z.number().min(5).max(50).default(20).describe("BB period"),
    stdDev: z.number().default(2).describe("Standard deviation multiplier"),
    interval: z.enum(["1m", "5m", "15m", "1h", "4h", "1d"]).default("15m"),
  }),
  fn: async (params): Promise<BollingerBandsResult> => {
    try {
      const { period, stdDev, interval } = params;
      const limit = period + 50;
      const { close } = await getOHLCArrays(interval, limit);
      const candles = await getMarketData(interval, limit);

      const bb = bollingerBands(period, stdDev, close);
      const currentPrice = close[close.length - 1];
      const upperBand = bb.upper[bb.upper.length - 1];
      const middleBand = bb.middle[bb.middle.length - 1];
      const lowerBand = bb.lower[bb.lower.length - 1];
      const bandwidth = upperBand - lowerBand;
      const percentB = (currentPrice - lowerBand) / bandwidth;

      let pricePosition: "ABOVE_UPPER" | "UPPER_MIDDLE" | "MIDDLE_LOWER" | "BELOW_LOWER" = "MIDDLE_LOWER";
      if (currentPrice > upperBand) pricePosition = "ABOVE_UPPER";
      else if (currentPrice > middleBand) pricePosition = "UPPER_MIDDLE";
      else if (currentPrice > lowerBand) pricePosition = "MIDDLE_LOWER";
      else pricePosition = "BELOW_LOWER";

      const prevBandwidth = bb.upper[bb.upper.length - 2] - bb.lower[bb.lower.length - 2];
      const squeeze = bandwidth < prevBandwidth * 0.8 && bandwidth < currentPrice * 0.02;
      const expansion = bandwidth > prevBandwidth * 1.2;

      let volatility: VolatilityLevel = "MODERATE";
      const bandwidthPercent = (bandwidth / currentPrice) * 100;
      if (bandwidthPercent > 8) volatility = "VERY_HIGH";
      else if (bandwidthPercent > 5) volatility = "HIGH";
      else if (bandwidthPercent > 3) volatility = "MODERATE";
      else if (bandwidthPercent > 1.5) volatility = "LOW";
      else volatility = "VERY_LOW";

      let signal: "BUY" | "SELL" | "HOLD" = "HOLD";
      let confidence: SignalStrength = "MODERATE";

      if (pricePosition === "BELOW_LOWER" || (pricePosition === "MIDDLE_LOWER" && percentB < 0.2)) {
        signal = "BUY";
        confidence = squeeze ? "STRONG" : "MODERATE";
      } else if (pricePosition === "ABOVE_UPPER" || (pricePosition === "UPPER_MIDDLE" && percentB > 0.8)) {
        signal = "SELL";
        confidence = squeeze ? "STRONG" : "MODERATE";
      }

      const description = `Bollinger Bands - Upper: ${upperBand.toFixed(2)}, Middle: ${middleBand.toFixed(2)}, Lower: ${lowerBand.toFixed(2)}. Price: ${currentPrice.toFixed(2)} (${pricePosition.replace("_", " ").toLowerCase()}). %B: ${percentB.toFixed(2)}. ${
        squeeze
          ? "SQUEEZE detected! Low volatility - expect breakout soon."
          : expansion
          ? "EXPANSION - high volatility, trend in motion."
          : `Normal volatility (${volatility.toLowerCase().replace("_", " ")}).`
      } ${
        pricePosition === "ABOVE_UPPER"
          ? "Overbought - potential reversal."
          : pricePosition === "BELOW_LOWER"
          ? "Oversold - potential bounce."
          : ""
      }`;

      return {
        signal,
        confidence,
        description,
        timestamp: candles[candles.length - 1].timestamp,
        currentPrice,
        upperBand,
        middleBand,
        lowerBand,
        bandwidth,
        percentB,
        pricePosition,
        squeeze,
        expansion,
        volatility,
      };
    } catch (error) {
      logger.error({ error, params }, "Error calculating Bollinger Bands");
      throw new Error(`Failed to calculate Bollinger Bands: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  },
});

/**
 * Bollinger Band Width tool
 */
export const bollingerBandWidthTool = createTool({
  name: "bollingerBandWidth",
  description: "Measures Bollinger Band width to identify volatility levels. Low bandwidth suggests squeeze and potential breakout.",
  schema: z.object({
    period: z.number().min(5).max(50).default(20).describe("BB period"),
    stdDev: z.number().default(2).describe("Standard deviation multiplier"),
    interval: z.enum(["1m", "5m", "15m", "1h", "4h", "1d"]).default("15m"),
  }),
  fn: async (params): Promise<BollingerBandWidthResult> => {
    try {
      const { period, stdDev, interval } = params;
      const limit = period + 50;
      const { close } = await getOHLCArrays(interval, limit);
      const candles = await getMarketData(interval, limit);

      const bbw = bollingerBandsWidth(period, stdDev, close);
      const bandwidthValue = bbw[bbw.length - 1];
      const previousBBW = bbw[bbw.length - 2];

      let volatility: VolatilityLevel = "MODERATE";
      if (bandwidthValue > 8) volatility = "VERY_HIGH";
      else if (bandwidthValue > 5) volatility = "HIGH";
      else if (bandwidthValue > 3) volatility = "MODERATE";
      else if (bandwidthValue > 1.5) volatility = "LOW";
      else volatility = "VERY_LOW";

      const squeeze = volatility === "VERY_LOW" || volatility === "LOW";

      let breakoutPotential: "HIGH" | "MODERATE" | "LOW" = "LOW";
      if (squeeze && bandwidthValue < previousBBW) breakoutPotential = "HIGH";
      else if (squeeze) breakoutPotential = "MODERATE";

      let signal: "BUY" | "SELL" | "HOLD" = "HOLD";
      let confidence: SignalStrength = "WEAK";

      if (breakoutPotential === "HIGH") {
        confidence = "MODERATE";
      }

      const description = `Bollinger Band Width: ${bandwidthValue.toFixed(2)}%. Volatility: ${volatility
        .toLowerCase()
        .replace("_", " ")}. ${
        squeeze
          ? `SQUEEZE in progress! Breakout potential: ${breakoutPotential.toLowerCase()}. ${
              breakoutPotential === "HIGH" ? "Prepare for significant move - direction uncertain." : "Monitor for expansion."
            }`
          : volatility === "VERY_HIGH"
          ? "Extreme volatility - bands very wide. Strong trend or panic."
          : "Normal bandwidth - standard volatility."
      }`;

      return {
        signal,
        confidence,
        description,
        timestamp: candles[candles.length - 1].timestamp,
        bandwidthValue,
        volatility,
        squeeze,
        breakoutPotential,
      };
    } catch (error) {
      logger.error({ error, params }, "Error calculating BB Width");
      throw new Error(`Failed to calculate BB Width: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  },
});

/**
 * Keltner Channel tool
 */
export const keltnerChannelTool = createTool({
  name: "keltnerChannel",
  description: "Volatility-based channel using EMA and ATR. Price above upper channel suggests strong uptrend, below lower suggests strong downtrend.",
  schema: z.object({
    period: z.number().min(5).max(50).default(20).describe("EMA period"),
    atrPeriod: z.number().default(10).describe("ATR period"),
    multiplier: z.number().default(2).describe("ATR multiplier"),
    interval: z.enum(["1m", "5m", "15m", "1h", "4h", "1d"]).default("15m"),
  }),
  fn: async (params): Promise<KeltnerChannelResult> => {
    try {
      const { period, atrPeriod, multiplier, interval } = params;
      const limit = Math.max(period, atrPeriod) + 50;
      const { high, low, close } = await getOHLCArrays(interval, limit);
      const candles = await getMarketData(interval, limit);

      const kc = keltnerChannel(period, atrPeriod, multiplier, high, low, close);
      const currentPrice = close[close.length - 1];
      const upperChannel = kc.upper[kc.upper.length - 1];
      const middleChannel = kc.middle[kc.middle.length - 1];
      const lowerChannel = kc.lower[kc.lower.length - 1];

      let pricePosition: "ABOVE_UPPER" | "UPPER_MIDDLE" | "MIDDLE_LOWER" | "BELOW_LOWER" = "MIDDLE_LOWER";
      if (currentPrice > upperChannel) pricePosition = "ABOVE_UPPER";
      else if (currentPrice > middleChannel) pricePosition = "UPPER_MIDDLE";
      else if (currentPrice > lowerChannel) pricePosition = "MIDDLE_LOWER";
      else pricePosition = "BELOW_LOWER";

      let trend: TrendDirection = "NEUTRAL";
      const prevMiddle = kc.middle[kc.middle.length - 2];
      if (middleChannel > prevMiddle) trend = "UPWARD";
      else if (middleChannel < prevMiddle) trend = "DOWNWARD";

      const channelWidth = upperChannel - lowerChannel;
      const widthPercent = (channelWidth / currentPrice) * 100;
      let volatility: VolatilityLevel = "MODERATE";
      if (widthPercent > 6) volatility = "VERY_HIGH";
      else if (widthPercent > 4) volatility = "HIGH";
      else if (widthPercent > 2) volatility = "MODERATE";
      else if (widthPercent > 1) volatility = "LOW";
      else volatility = "VERY_LOW";

      let signal: "BUY" | "SELL" | "HOLD" = "HOLD";
      let confidence: SignalStrength = "MODERATE";

      if (pricePosition === "ABOVE_UPPER" && trend === "UPWARD") {
        signal = "BUY";
        confidence = "STRONG";
      } else if (pricePosition === "BELOW_LOWER" && trend === "DOWNWARD") {
        signal = "SELL";
        confidence = "STRONG";
      } else if (pricePosition === "UPPER_MIDDLE" && trend === "UPWARD") {
        signal = "BUY";
        confidence = "MODERATE";
      } else if (pricePosition === "MIDDLE_LOWER" && trend === "DOWNWARD") {
        signal = "SELL";
        confidence = "MODERATE";
      }

      const description = `Keltner Channel - Upper: ${upperChannel.toFixed(2)}, Middle: ${middleChannel.toFixed(2)}, Lower: ${lowerChannel.toFixed(2)}. Price: ${currentPrice.toFixed(2)} (${pricePosition.replace("_", " ").toLowerCase()}). ${
        pricePosition === "ABOVE_UPPER"
          ? "Strong UPTREND - price breaking above channel!"
          : pricePosition === "BELOW_LOWER"
          ? "Strong DOWNTREND - price breaking below channel!"
          : `In channel. Trend: ${trend.toLowerCase()}.`
      } Volatility: ${volatility.toLowerCase().replace("_", " ")}.`;

      return {
        signal,
        confidence,
        description,
        timestamp: candles[candles.length - 1].timestamp,
        currentPrice,
        upperChannel,
        middleChannel,
        lowerChannel,
        pricePosition,
        trend,
        volatility,
      };
    } catch (error) {
      logger.error({ error, params }, "Error calculating Keltner Channel");
      throw new Error(`Failed to calculate Keltner Channel: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  },
});

/**
 * Donchian Channel tool
 */
export const donchianChannelTool = createTool({
  name: "donchianChannel",
  description: "Shows highest high and lowest low over period. Breakouts above/below channel signal strong trends.",
  schema: z.object({
    period: z.number().min(5).max(100).default(20).describe("Donchian period"),
    interval: z.enum(["1m", "5m", "15m", "1h", "4h", "1d"]).default("15m"),
  }),
  fn: async (params): Promise<DonchianChannelResult> => {
    try {
      const { period, interval } = params;
      const limit = period + 50;
      const { high, low, close } = await getOHLCArrays(interval, limit);
      const candles = await getMarketData(interval, limit);

      const dc = donchianChannel(period, high, low);
      const currentPrice = close[close.length - 1];
      const upperChannel = dc.upper[dc.upper.length - 1];
      const middleChannel = dc.middle[dc.middle.length - 1];
      const lowerChannel = dc.lower[dc.lower.length - 1];
      const channelWidth = upperChannel - lowerChannel;

      const prevHigh = high[high.length - 2];
      const prevLow = low[low.length - 2];
      const prevUpper = dc.upper[dc.upper.length - 2];
      const prevLower = dc.lower[dc.lower.length - 2];

      let pricePosition: "AT_HIGH" | "AT_LOW" | "IN_CHANNEL" = "IN_CHANNEL";
      if (currentPrice >= upperChannel) pricePosition = "AT_HIGH";
      else if (currentPrice <= lowerChannel) pricePosition = "AT_LOW";

      let breakoutSignal: "BULLISH_BREAKOUT" | "BEARISH_BREAKOUT" | "NONE" = "NONE";
      if (currentPrice > prevUpper && prevHigh <= prevUpper) breakoutSignal = "BULLISH_BREAKOUT";
      else if (currentPrice < prevLower && prevLow >= prevLower) breakoutSignal = "BEARISH_BREAKOUT";

      let signal: "BUY" | "SELL" | "HOLD" = "HOLD";
      let confidence: SignalStrength = "MODERATE";

      if (breakoutSignal === "BULLISH_BREAKOUT") {
        signal = "BUY";
        confidence = "VERY_STRONG";
      } else if (breakoutSignal === "BEARISH_BREAKOUT") {
        signal = "SELL";
        confidence = "VERY_STRONG";
      } else if (pricePosition === "AT_HIGH") {
        signal = "BUY";
        confidence = "MODERATE";
      } else if (pricePosition === "AT_LOW") {
        signal = "SELL";
        confidence = "MODERATE";
      }

      const description = breakoutSignal !== "NONE"
        ? `${breakoutSignal.replace("_", " ")}! Price broke ${
            breakoutSignal === "BULLISH_BREAKOUT" ? "above" : "below"
          } ${period}-period ${breakoutSignal === "BULLISH_BREAKOUT" ? "high" : "low"}. Strong momentum signal!`
        : `Donchian Channel - High: ${upperChannel.toFixed(2)}, Mid: ${middleChannel.toFixed(2)}, Low: ${lowerChannel.toFixed(2)}. Price: ${currentPrice.toFixed(2)} (${pricePosition.replace("_", " ").toLowerCase()}). Channel width: ${channelWidth.toFixed(2)}.`;

      return {
        signal,
        confidence,
        description,
        timestamp: candles[candles.length - 1].timestamp,
        currentPrice,
        upperChannel,
        middleChannel,
        lowerChannel,
        pricePosition,
        breakoutSignal,
        channelWidth,
      };
    } catch (error) {
      logger.error({ error, params }, "Error calculating Donchian Channel");
      throw new Error(`Failed to calculate Donchian Channel: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  },
});

/**
 * Chandelier Exit tool
 */
export const chandelierExitTool = createTool({
  name: "chandelierExit",
  description: "Provides trailing stop-loss levels based on ATR. Helps manage risk and protect profits in trending markets.",
  schema: z.object({
    period: z.number().min(5).max(50).default(22).describe("ATR period"),
    multiplier: z.number().default(3).describe("ATR multiplier"),
    interval: z.enum(["1m", "5m", "15m", "1h", "4h", "1d"]).default("15m"),
  }),
  fn: async (params): Promise<ChandelierExitResult> => {
    try {
      const { period, multiplier, interval } = params;
      const limit = period + 50;
      const { high, low, close } = await getOHLCArrays(interval, limit);
      const candles = await getMarketData(interval, limit);

      const ce = chandelierExit(period, multiplier, high, low, close);
      const longExit = ce.long[ce.long.length - 1];
      const shortExit = ce.short[ce.short.length - 1];
      const currentPrice = close[close.length - 1];

      let exitSignal: "LONG_EXIT" | "SHORT_EXIT" | "NONE" = "NONE";
      if (currentPrice < longExit) exitSignal = "LONG_EXIT";
      else if (currentPrice > shortExit) exitSignal = "SHORT_EXIT";

      const atrValues = atr(period, high, low, close);
      const currentATR = atrValues[atrValues.length - 1];
      const atrPercent = (currentATR / currentPrice) * 100;
      let volatility: VolatilityLevel = "MODERATE";
      if (atrPercent > 5) volatility = "VERY_HIGH";
      else if (atrPercent > 3) volatility = "HIGH";
      else if (atrPercent > 1.5) volatility = "MODERATE";
      else if (atrPercent > 0.5) volatility = "LOW";
      else volatility = "VERY_LOW";

      let signal: "BUY" | "SELL" | "HOLD" = "HOLD";
      let confidence: SignalStrength = "MODERATE";

      if (exitSignal === "LONG_EXIT") {
        signal = "SELL";
        confidence = "STRONG";
      } else if (exitSignal === "SHORT_EXIT") {
        signal = "BUY";
        confidence = "STRONG";
      }

      const description = exitSignal !== "NONE"
        ? `${exitSignal.replace("_", " ")} triggered! ${
            exitSignal === "LONG_EXIT"
              ? `Price (${currentPrice.toFixed(2)}) fell below long exit level (${longExit.toFixed(2)}). Exit long positions!`
              : `Price (${currentPrice.toFixed(2)}) rose above short exit level (${shortExit.toFixed(2)}). Cover short positions!`
          }`
        : `Chandelier Exit - Long stop: ${longExit.toFixed(2)}, Short stop: ${shortExit.toFixed(2)}. Price: ${currentPrice.toFixed(2)}. No exit triggered. Volatility: ${volatility.toLowerCase().replace("_", " ")}.`;

      return {
        signal,
        confidence,
        description,
        timestamp: candles[candles.length - 1].timestamp,
        longExit,
        shortExit,
        currentPrice,
        exitSignal,
        volatility,
      };
    } catch (error) {
      logger.error({ error, params }, "Error calculating Chandelier Exit");
      throw new Error(`Failed to calculate Chandelier Exit: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  },
});

// Export all tools
export const volatilityIndicatorTools = [
  atrTool,
  bollingerBandsTool,
  bollingerBandWidthTool,
  keltnerChannelTool,
  donchianChannelTool,
  chandelierExitTool,
];
