import type { BaseIndicatorResult, SignalStrength, TradingSignal, TrendDirection, VolumeLevel } from "./common.types";

/**
 * Result from Accumulation/Distribution analysis
 */
export interface AccumulationDistributionResult extends BaseIndicatorResult {
  adValue: number;
  trend: TrendDirection;
  divergence: "BULLISH" | "BEARISH" | "NONE";
  volumeStrength: VolumeLevel;
}

/**
 * Result from Chaikin Money Flow analysis
 */
export interface ChaikinMoneyFlowResult extends BaseIndicatorResult {
  cmfValue: number;
  buyingPressure: "STRONG_BUYING" | "MODERATE_BUYING" | "NEUTRAL" | "MODERATE_SELLING" | "STRONG_SELLING";
  volumeConfirmation: boolean;
  trend: TrendDirection;
}

/**
 * Result from Ease of Movement analysis
 */
export interface EaseOfMovementResult extends BaseIndicatorResult {
  emvValue: number;
  trendEase: "EASY_UPWARD" | "EASY_DOWNWARD" | "DIFFICULT" | "NEUTRAL";
  volumeEfficiency: "HIGH" | "MODERATE" | "LOW";
  strength: SignalStrength;
}

/**
 * Result from Force Index analysis
 */
export interface ForceIndexResult extends BaseIndicatorResult {
  forceValue: number;
  trend: TrendDirection;
  strength: SignalStrength;
  reversalSignal: boolean;
}

/**
 * Result from Money Flow Index analysis
 */
export interface MoneyFlowIndexResult extends BaseIndicatorResult {
  mfiValue: number;
  marketCondition: "OVERBOUGHT" | "OVERSOLD" | "NEUTRAL";
  divergence: "BULLISH" | "BEARISH" | "NONE";
  volumeConfirmation: boolean;
}

/**
 * Result from Negative Volume Index analysis
 */
export interface NegativeVolumeIndexResult extends BaseIndicatorResult {
  nviValue: number;
  smartMoneyTrend: TrendDirection;
  divergence: "BULLISH" | "BEARISH" | "NONE";
  strength: SignalStrength;
}

/**
 * Result from On Balance Volume analysis
 */
export interface OnBalanceVolumeResult extends BaseIndicatorResult {
  obvValue: number;
  trend: TrendDirection;
  divergence: "BULLISH" | "BEARISH" | "NONE";
  volumeConfirmation: boolean;
}

/**
 * Result from Volume Price Trend analysis
 */
export interface VolumePriceTrendResult extends BaseIndicatorResult {
  vptValue: number;
  trend: TrendDirection;
  divergence: "BULLISH" | "BEARISH" | "NONE";
  strength: SignalStrength;
}

/**
 * Result from VWAP (Volume Weighted Average Price) analysis
 */
export interface VWAPResult extends BaseIndicatorResult {
  vwapValue: number;
  currentPrice: number;
  pricePosition: "ABOVE_VWAP" | "BELOW_VWAP" | "AT_VWAP";
  trend: TrendDirection;
  institutionalBias: "BULLISH" | "BEARISH" | "NEUTRAL";
}
