import { createTool } from "@iqai/adk/tools";
import { z } from "zod";
import {
  ad,
  cmf,
  emv,
  forceIndex,
  mfi,
  nvi,
  obv,
  vpt,
  vwap as vwapIndicator,
} from "indicatorts";
import { getOHLCArrays, getMarketData } from "./marketData";
import logger from "../lib/logger";
import type {
  AccumulationDistributionResult,
  ChaikinMoneyFlowResult,
  EaseOfMovementResult,
  ForceIndexResult,
  MoneyFlowIndexResult,
  NegativeVolumeIndexResult,
  OnBalanceVolumeResult,
  VolumePriceTrendResult,
  VWAPResult,
} from "./types/volume.types";
import type { SignalStrength, TrendDirection, VolumeLevel } from "./types/common.types";

/**
 * Accumulation/Distribution tool
 */
export const accumulationDistributionTool = createTool({
  name: "accumulationDistribution",
  description: "Measures cumulative flow of money into and out of the asset. Rising AD line indicates accumulation (buying pressure).",
  schema: z.object({
    interval: z.enum(["1m", "5m", "15m", "1h", "4h", "1d"]).default("15m"),
  }),
  fn: async (params): Promise<AccumulationDistributionResult> => {
    try {
      const { interval } = params;
      const limit = 100;
      const { high, low, close, volume } = await getOHLCArrays(interval, limit);
      const candles = await getMarketData(interval, limit);

      const adValues = ad(high, low, close, volume);
      const adValue = adValues[adValues.length - 1];
      const previousAD = adValues[adValues.length - 2];
      const adChange = ((adValue - previousAD) / Math.abs(previousAD)) * 100;

      let trend: TrendDirection = "NEUTRAL";
      if (adValue > previousAD) trend = "UPWARD";
      else if (adValue < previousAD) trend = "DOWNWARD";

      const divergence = "NONE"; // Would need price comparison for full divergence

      let volumeStrength: VolumeLevel = "MODERATE";
      const absChange = Math.abs(adChange);
      if (absChange > 5) volumeStrength = "VERY_HIGH";
      else if (absChange > 2) volumeStrength = "HIGH";
      else if (absChange > 0.5) volumeStrength = "MODERATE";
      else if (absChange > 0) volumeStrength = "LOW";
      else volumeStrength = "VERY_LOW";

      let signal: "BUY" | "SELL" | "HOLD" = "HOLD";
      let confidence: SignalStrength = "MODERATE";

      if (trend === "UPWARD" && volumeStrength === "HIGH") {
        signal = "BUY";
        confidence = "STRONG";
      } else if (trend === "DOWNWARD" && volumeStrength === "HIGH") {
        signal = "SELL";
        confidence = "STRONG";
      } else if (trend === "UPWARD") {
        signal = "BUY";
        confidence = "MODERATE";
      } else if (trend === "DOWNWARD") {
        signal = "SELL";
        confidence = "MODERATE";
      }

      const description = `A/D Line: ${adValue.toFixed(0)}. ${
        trend === "UPWARD"
          ? `Rising (${adChange.toFixed(2)}%) - ACCUMULATION phase. Buying pressure with ${volumeStrength.toLowerCase().replace("_", " ")} volume strength.`
          : trend === "DOWNWARD"
          ? `Falling (${adChange.toFixed(2)}%) - DISTRIBUTION phase. Selling pressure with ${volumeStrength.toLowerCase().replace("_", " ")} volume strength.`
          : "Flat - neutral volume flow."
      }`;

      return {
        signal,
        confidence,
        description,
        timestamp: candles[candles.length - 1].timestamp,
        adValue,
        trend,
        divergence,
        volumeStrength,
      };
    } catch (error) {
      logger.error({ error, params }, "Error calculating A/D");
      throw new Error(`Failed to calculate A/D: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  },
});

/**
 * Chaikin Money Flow tool
 */
export const chaikinMoneyFlowTool = createTool({
  name: "chaikinMoneyFlow",
  description: "Measures buying and selling pressure over a period. Positive values indicate buying pressure, negative values indicate selling pressure.",
  schema: z.object({
    period: z.number().min(5).max(50).default(20).describe("CMF period"),
    interval: z.enum(["1m", "5m", "15m", "1h", "4h", "1d"]).default("15m"),
  }),
  fn: async (params): Promise<ChaikinMoneyFlowResult> => {
    try {
      const { period, interval } = params;
      const limit = period + 50;
      const { high, low, close, volume } = await getOHLCArrays(interval, limit);
      const candles = await getMarketData(interval, limit);

      const cmfValues = cmf(period, high, low, close, volume);
      const cmfValue = cmfValues[cmfValues.length - 1];
      const previousCMF = cmfValues[cmfValues.length - 2];

      let buyingPressure: "STRONG_BUYING" | "MODERATE_BUYING" | "NEUTRAL" | "MODERATE_SELLING" | "STRONG_SELLING" = "NEUTRAL";
      if (cmfValue > 0.25) buyingPressure = "STRONG_BUYING";
      else if (cmfValue > 0.05) buyingPressure = "MODERATE_BUYING";
      else if (cmfValue < -0.25) buyingPressure = "STRONG_SELLING";
      else if (cmfValue < -0.05) buyingPressure = "MODERATE_SELLING";

      const volumeConfirmation = Math.abs(cmfValue) > 0.05;

      let trend: TrendDirection = "NEUTRAL";
      if (cmfValue > 0 && cmfValue > previousCMF) trend = "UPWARD";
      else if (cmfValue < 0 && cmfValue < previousCMF) trend = "DOWNWARD";

      let signal: "BUY" | "SELL" | "HOLD" = "HOLD";
      let confidence: SignalStrength = "MODERATE";

      if (buyingPressure === "STRONG_BUYING" && volumeConfirmation) {
        signal = "BUY";
        confidence = "STRONG";
      } else if (buyingPressure === "STRONG_SELLING" && volumeConfirmation) {
        signal = "SELL";
        confidence = "STRONG";
      } else if (cmfValue > 0 && trend === "UPWARD") {
        signal = "BUY";
        confidence = "MODERATE";
      } else if (cmfValue < 0 && trend === "DOWNWARD") {
        signal = "SELL";
        confidence = "MODERATE";
      }

      const description = `CMF: ${cmfValue.toFixed(4)}. ${
        buyingPressure === "STRONG_BUYING"
          ? "STRONG buying pressure - significant accumulation with volume confirmation."
          : buyingPressure === "MODERATE_BUYING"
          ? "MODERATE buying pressure - mild accumulation detected."
          : buyingPressure === "STRONG_SELLING"
          ? "STRONG selling pressure - significant distribution with volume confirmation."
          : buyingPressure === "MODERATE_SELLING"
          ? "MODERATE selling pressure - mild distribution detected."
          : "NEUTRAL - balanced buying and selling."
      } ${volumeConfirmation ? "Volume confirms trend." : "Weak volume."}`;

      return {
        signal,
        confidence,
        description,
        timestamp: candles[candles.length - 1].timestamp,
        cmfValue,
        buyingPressure,
        volumeConfirmation,
        trend,
      };
    } catch (error) {
      logger.error({ error, params }, "Error calculating CMF");
      throw new Error(`Failed to calculate CMF: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  },
});

/**
 * Ease of Movement tool
 */
export const easeOfMovementTool = createTool({
  name: "easeOfMovement",
  description: "Relates price change to volume, showing how easily price moves. High values suggest easy price movement with low volume.",
  schema: z.object({
    period: z.number().min(5).max(50).default(14).describe("EMV period"),
    interval: z.enum(["1m", "5m", "15m", "1h", "4h", "1d"]).default("15m"),
  }),
  fn: async (params): Promise<EaseOfMovementResult> => {
    try {
      const { period, interval } = params;
      const limit = period + 50;
      const { high, low, volume } = await getOHLCArrays(interval, limit);
      const candles = await getMarketData(interval, limit);

      const emvValues = emv(period, high, low, volume);
      const emvValue = emvValues[emvValues.length - 1];
      const previousEMV = emvValues[emvValues.length - 2];

      let trendEase: "EASY_UPWARD" | "EASY_DOWNWARD" | "DIFFICULT" | "NEUTRAL" = "NEUTRAL";
      if (emvValue > 0 && Math.abs(emvValue) > 0.1) trendEase = "EASY_UPWARD";
      else if (emvValue < 0 && Math.abs(emvValue) > 0.1) trendEase = "EASY_DOWNWARD";
      else if (Math.abs(emvValue) < 0.05) trendEase = "DIFFICULT";

      let volumeEfficiency: "HIGH" | "MODERATE" | "LOW" = "MODERATE";
      if (Math.abs(emvValue) > 0.5) volumeEfficiency = "HIGH";
      else if (Math.abs(emvValue) < 0.1) volumeEfficiency = "LOW";

      let strength: SignalStrength = "MODERATE";
      const absEMV = Math.abs(emvValue);
      if (absEMV > 1) strength = "VERY_STRONG";
      else if (absEMV > 0.5) strength = "STRONG";
      else if (absEMV > 0.1) strength = "MODERATE";
      else strength = "WEAK";

      let signal: "BUY" | "SELL" | "HOLD" = "HOLD";
      let confidence: SignalStrength = "MODERATE";

      if (trendEase === "EASY_UPWARD" && volumeEfficiency === "HIGH") {
        signal = "BUY";
        confidence = "STRONG";
      } else if (trendEase === "EASY_DOWNWARD" && volumeEfficiency === "HIGH") {
        signal = "SELL";
        confidence = "STRONG";
      }

      const description = `EMV: ${emvValue.toFixed(4)}. ${
        trendEase === "EASY_UPWARD"
          ? "Price moving upward EASILY with low volume resistance - efficient bullish movement."
          : trendEase === "EASY_DOWNWARD"
          ? "Price moving downward EASILY with low volume resistance - efficient bearish movement."
          : trendEase === "DIFFICULT"
          ? "Price movement DIFFICULT - high volume required for movement, possible consolidation."
          : "Neutral ease."
      } Volume efficiency: ${volumeEfficiency.toLowerCase()}.`;

      return {
        signal,
        confidence,
        description,
        timestamp: candles[candles.length - 1].timestamp,
        emvValue,
        trendEase,
        volumeEfficiency,
        strength,
      };
    } catch (error) {
      logger.error({ error, params }, "Error calculating EMV");
      throw new Error(`Failed to calculate EMV: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  },
});

/**
 * Force Index tool
 */
export const forceIndexTool = createTool({
  name: "forceIndex",
  description: "Combines price and volume to measure buying/selling force. Positive values show buying force, negative shows selling force.",
  schema: z.object({
    period: z.number().min(1).max(50).default(13).describe("Force Index smoothing period"),
    interval: z.enum(["1m", "5m", "15m", "1h", "4h", "1d"]).default("15m"),
  }),
  fn: async (params): Promise<ForceIndexResult> => {
    try {
      const { period, interval } = params;
      const limit = period + 50;
      const { close, volume } = await getOHLCArrays(interval, limit);
      const candles = await getMarketData(interval, limit);

      const fiValues = forceIndex(period, close, volume);
      const forceValue = fiValues[fiValues.length - 1];
      const previousFI = fiValues[fiValues.length - 2];

      let trend: TrendDirection = "NEUTRAL";
      if (forceValue > 0) trend = "UPWARD";
      else if (forceValue < 0) trend = "DOWNWARD";

      let strength: SignalStrength = "MODERATE";
      const absFI = Math.abs(forceValue);
      if (absFI > 1000) strength = "VERY_STRONG";
      else if (absFI > 500) strength = "STRONG";
      else if (absFI > 100) strength = "MODERATE";
      else strength = "WEAK";

      const reversalSignal = (previousFI > 0 && forceValue < 0) || (previousFI < 0 && forceValue > 0);

      let signal: "BUY" | "SELL" | "HOLD" = "HOLD";
      let confidence: SignalStrength = "MODERATE";

      if (reversalSignal && forceValue > 0) {
        signal = "BUY";
        confidence = "STRONG";
      } else if (reversalSignal && forceValue < 0) {
        signal = "SELL";
        confidence = "STRONG";
      } else if (trend === "UPWARD" && strength !== "WEAK") {
        signal = "BUY";
        confidence = strength;
      } else if (trend === "DOWNWARD" && strength !== "WEAK") {
        signal = "SELL";
        confidence = strength;
      }

      const description = reversalSignal
        ? `Force Index reversal! Changed from ${previousFI > 0 ? "positive" : "negative"} to ${
            forceValue > 0 ? "positive" : "negative"
          } (${forceValue.toFixed(2)}). ${
            forceValue > 0 ? "Buying force emerging" : "Selling force emerging"
          }. Strength: ${strength.toLowerCase().replace("_", " ")}.`
        : `Force Index: ${forceValue.toFixed(2)}. ${
            trend === "UPWARD"
              ? "BUYING force dominates"
              : trend === "DOWNWARD"
              ? "SELLING force dominates"
              : "Balanced"
          }. Strength: ${strength.toLowerCase().replace("_", " ")}.`;

      return {
        signal,
        confidence,
        description,
        timestamp: candles[candles.length - 1].timestamp,
        forceValue,
        trend,
        strength,
        reversalSignal,
      };
    } catch (error) {
      logger.error({ error, params }, "Error calculating Force Index");
      throw new Error(`Failed to calculate Force Index: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  },
});

/**
 * Money Flow Index tool
 */
export const moneyFlowIndexTool = createTool({
  name: "moneyFlowIndex",
  description: "Volume-weighted RSI that identifies overbought/oversold conditions. Above 80 is overbought, below 20 is oversold.",
  schema: z.object({
    period: z.number().min(5).max(50).default(14).describe("MFI period"),
    interval: z.enum(["1m", "5m", "15m", "1h", "4h", "1d"]).default("15m"),
  }),
  fn: async (params): Promise<MoneyFlowIndexResult> => {
    try {
      const { period, interval } = params;
      const limit = period + 50;
      const { high, low, close, volume } = await getOHLCArrays(interval, limit);
      const candles = await getMarketData(interval, limit);

      const mfiValues = mfi(period, high, low, close, volume);
      const mfiValue = mfiValues[mfiValues.length - 1];
      const previousMFI = mfiValues[mfiValues.length - 2];

      let marketCondition: "OVERBOUGHT" | "OVERSOLD" | "NEUTRAL" = "NEUTRAL";
      if (mfiValue > 80) marketCondition = "OVERBOUGHT";
      else if (mfiValue < 20) marketCondition = "OVERSOLD";

      const divergence = "NONE";
      const volumeConfirmation = true; // MFI inherently includes volume

      let signal: "BUY" | "SELL" | "HOLD" = "HOLD";
      let confidence: SignalStrength = "MODERATE";

      if (marketCondition === "OVERSOLD" && mfiValue > previousMFI) {
        signal = "BUY";
        confidence = "STRONG";
      } else if (marketCondition === "OVERBOUGHT" && mfiValue < previousMFI) {
        signal = "SELL";
        confidence = "STRONG";
      } else if (mfiValue > 50 && mfiValue < 80) {
        signal = "BUY";
        confidence = "MODERATE";
      } else if (mfiValue < 50 && mfiValue > 20) {
        signal = "SELL";
        confidence = "MODERATE";
      }

      const description = `MFI: ${mfiValue.toFixed(2)}. ${
        marketCondition === "OVERBOUGHT"
          ? `OVERBOUGHT - heavy buying volume may lead to reversal. ${
              mfiValue < previousMFI ? "Starting to decline." : "Still elevated."
            }`
          : marketCondition === "OVERSOLD"
          ? `OVERSOLD - heavy selling volume may lead to bounce. ${
              mfiValue > previousMFI ? "Starting to recover." : "Still depressed."
            }`
          : `NEUTRAL - balanced money flow. ${mfiValue > 50 ? "Slight buying bias" : "Slight selling bias"}.`
      } Volume-confirmed signal.`;

      return {
        signal,
        confidence,
        description,
        timestamp: candles[candles.length - 1].timestamp,
        mfiValue,
        marketCondition,
        divergence,
        volumeConfirmation,
      };
    } catch (error) {
      logger.error({ error, params }, "Error calculating MFI");
      throw new Error(`Failed to calculate MFI: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  },
});

/**
 * On Balance Volume tool
 */
export const onBalanceVolumeTool = createTool({
  name: "onBalanceVolume",
  description: "Cumulative volume indicator that shows buying/selling pressure. Rising OBV confirms uptrend, falling OBV confirms downtrend.",
  schema: z.object({
    interval: z.enum(["1m", "5m", "15m", "1h", "4h", "1d"]).default("15m"),
  }),
  fn: async (params): Promise<OnBalanceVolumeResult> => {
    try {
      const { interval } = params;
      const limit = 100;
      const { close, volume } = await getOHLCArrays(interval, limit);
      const candles = await getMarketData(interval, limit);

      const obvValues = obv(close, volume);
      const obvValue = obvValues[obvValues.length - 1];
      const previousOBV = obvValues[obvValues.length - 2];

      let trend: TrendDirection = "NEUTRAL";
      if (obvValue > previousOBV) trend = "UPWARD";
      else if (obvValue < previousOBV) trend = "DOWNWARD";

      const divergence = "NONE";
      const volumeConfirmation = trend !== "NEUTRAL";

      let signal: "BUY" | "SELL" | "HOLD" = "HOLD";
      let confidence: SignalStrength = "MODERATE";

      if (trend === "UPWARD" && volumeConfirmation) {
        signal = "BUY";
        confidence = "MODERATE";
      } else if (trend === "DOWNWARD" && volumeConfirmation) {
        signal = "SELL";
        confidence = "MODERATE";
      }

      const obvChange = obvValue - previousOBV;
      const description = `OBV: ${obvValue.toFixed(0)} (${obvChange > 0 ? "+" : ""}${obvChange.toFixed(0)}). ${
        trend === "UPWARD"
          ? "Rising - buying volume exceeds selling volume. Uptrend confirmed."
          : trend === "DOWNWARD"
          ? "Falling - selling volume exceeds buying volume. Downtrend confirmed."
          : "Flat - balanced volume."
      }`;

      return {
        signal,
        confidence,
        description,
        timestamp: candles[candles.length - 1].timestamp,
        obvValue,
        trend,
        divergence,
        volumeConfirmation,
      };
    } catch (error) {
      logger.error({ error, params }, "Error calculating OBV");
      throw new Error(`Failed to calculate OBV: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  },
});

/**
 * VWAP tool
 */
export const vwapTool = createTool({
  name: "volumeWeightedAveragePrice",
  description: "Shows average price weighted by volume. Used by institutions. Price above VWAP suggests bullish bias, below suggests bearish.",
  schema: z.object({
    interval: z.enum(["1m", "5m", "15m", "1h", "4h", "1d"]).default("15m"),
  }),
  fn: async (params): Promise<VWAPResult> => {
    try {
      const { interval } = params;
      const limit = 100;
      const { high, low, close, volume } = await getOHLCArrays(interval, limit);
      const candles = await getMarketData(interval, limit);

      const vwapValues = vwapIndicator(high, low, close, volume);
      const vwapValue = vwapValues[vwapValues.length - 1];
      const currentPrice = close[close.length - 1];
      const previousVWAP = vwapValues[vwapValues.length - 2];

      let pricePosition: "ABOVE_VWAP" | "BELOW_VWAP" | "AT_VWAP" = "AT_VWAP";
      const priceDiff = ((currentPrice - vwapValue) / vwapValue) * 100;
      if (Math.abs(priceDiff) < 0.1) pricePosition = "AT_VWAP";
      else if (currentPrice > vwapValue) pricePosition = "ABOVE_VWAP";
      else pricePosition = "BELOW_VWAP";

      let trend: TrendDirection = "NEUTRAL";
      if (vwapValue > previousVWAP) trend = "UPWARD";
      else if (vwapValue < previousVWAP) trend = "DOWNWARD";

      let institutionalBias: "BULLISH" | "BEARISH" | "NEUTRAL" = "NEUTRAL";
      if (pricePosition === "ABOVE_VWAP" && trend === "UPWARD") institutionalBias = "BULLISH";
      else if (pricePosition === "BELOW_VWAP" && trend === "DOWNWARD") institutionalBias = "BEARISH";

      let signal: "BUY" | "SELL" | "HOLD" = "HOLD";
      let confidence: SignalStrength = "MODERATE";

      if (pricePosition === "ABOVE_VWAP" && institutionalBias === "BULLISH") {
        signal = "BUY";
        confidence = "MODERATE";
      } else if (pricePosition === "BELOW_VWAP" && institutionalBias === "BEARISH") {
        signal = "SELL";
        confidence = "MODERATE";
      }

      const description = `VWAP: ${vwapValue.toFixed(2)}, Price: ${currentPrice.toFixed(2)} (${priceDiff > 0 ? "+" : ""}${priceDiff.toFixed(2)}%). ${
        pricePosition === "ABOVE_VWAP"
          ? "Price ABOVE VWAP - bullish institutional bias. Buyers in control."
          : pricePosition === "BELOW_VWAP"
          ? "Price BELOW VWAP - bearish institutional bias. Sellers in control."
          : "Price AT VWAP - fair value, neutral."
      } VWAP trend: ${trend.toLowerCase()}.`;

      return {
        signal,
        confidence,
        description,
        timestamp: candles[candles.length - 1].timestamp,
        vwapValue,
        currentPrice,
        pricePosition,
        trend,
        institutionalBias,
      };
    } catch (error) {
      logger.error({ error, params }, "Error calculating VWAP");
      throw new Error(`Failed to calculate VWAP: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  },
});

// Export all tools
export const volumeIndicatorTools = [
  accumulationDistributionTool,
  chaikinMoneyFlowTool,
  easeOfMovementTool,
  forceIndexTool,
  moneyFlowIndexTool,
  onBalanceVolumeTool,
  vwapTool,
];
