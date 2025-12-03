import type { BaseIndicatorResult, SignalStrength, TradingSignal, TrendDirection, VolatilityLevel } from "./common.types";

/**
 * Result from ATR (Average True Range) analysis
 */
export interface AverageTrueRangeResult extends BaseIndicatorResult {
  atrValue: number;
  volatility: VolatilityLevel;
  trend: "EXPANDING" | "CONTRACTING" | "STABLE";
  percentOfPrice: number;
}

/**
 * Result from Bollinger Bands analysis
 */
export interface BollingerBandsResult extends BaseIndicatorResult {
  currentPrice: number;
  upperBand: number;
  middleBand: number;
  lowerBand: number;
  bandwidth: number;
  percentB: number;
  pricePosition: "ABOVE_UPPER" | "UPPER_MIDDLE" | "MIDDLE_LOWER" | "BELOW_LOWER";
  squeeze: boolean;
  expansion: boolean;
  volatility: VolatilityLevel;
}

/**
 * Result from Bollinger Band Width analysis
 */
export interface BollingerBandWidthResult extends BaseIndicatorResult {
  bandwidthValue: number;
  volatility: VolatilityLevel;
  squeeze: boolean;
  breakoutPotential: "HIGH" | "MODERATE" | "LOW";
}

/**
 * Result from Keltner Channel analysis
 */
export interface KeltnerChannelResult extends BaseIndicatorResult {
  currentPrice: number;
  upperChannel: number;
  middleChannel: number;
  lowerChannel: number;
  pricePosition: "ABOVE_UPPER" | "UPPER_MIDDLE" | "MIDDLE_LOWER" | "BELOW_LOWER";
  trend: TrendDirection;
  volatility: VolatilityLevel;
}

/**
 * Result from Donchian Channel analysis
 */
export interface DonchianChannelResult extends BaseIndicatorResult {
  currentPrice: number;
  upperChannel: number;
  middleChannel: number;
  lowerChannel: number;
  pricePosition: "AT_HIGH" | "AT_LOW" | "IN_CHANNEL";
  breakoutSignal: "BULLISH_BREAKOUT" | "BEARISH_BREAKOUT" | "NONE";
  channelWidth: number;
}

/**
 * Result from Chandelier Exit analysis
 */
export interface ChandelierExitResult extends BaseIndicatorResult {
  longExit: number;
  shortExit: number;
  currentPrice: number;
  exitSignal: "LONG_EXIT" | "SHORT_EXIT" | "NONE";
  volatility: VolatilityLevel;
}

/**
 * Result from Acceleration Bands analysis
 */
export interface AccelerationBandsResult extends BaseIndicatorResult {
  currentPrice: number;
  upperBand: number;
  middleBand: number;
  lowerBand: number;
  pricePosition: "ABOVE_UPPER" | "UPPER_MIDDLE" | "MIDDLE_LOWER" | "BELOW_LOWER";
  breakoutSignal: "BULLISH" | "BEARISH" | "NONE";
  volatility: VolatilityLevel;
}

/**
 * Result from Moving Standard Deviation analysis
 */
export interface MovingStandardDeviationResult extends BaseIndicatorResult {
  stdDevValue: number;
  volatility: VolatilityLevel;
  trend: "EXPANDING" | "CONTRACTING" | "STABLE";
  percentOfPrice: number;
}

/**
 * Result from Projection Oscillator analysis
 */
export interface ProjectionOscillatorResult extends BaseIndicatorResult {
  poValue: number;
  signalLine: number;
  trend: TrendDirection;
  crossover: "BULLISH" | "BEARISH" | "NONE";
  strength: SignalStrength;
}

/**
 * Result from True Range analysis
 */
export interface TrueRangeResult extends BaseIndicatorResult {
  trValue: number;
  volatility: VolatilityLevel;
  comparison: "ABOVE_AVERAGE" | "AVERAGE" | "BELOW_AVERAGE";
  expandingVolatility: boolean;
}

/**
 * Result from Ulcer Index analysis
 */
export interface UlcerIndexResult extends BaseIndicatorResult {
  ulcerValue: number;
  riskLevel: "VERY_HIGH" | "HIGH" | "MODERATE" | "LOW" | "VERY_LOW";
  trend: "WORSENING" | "IMPROVING" | "STABLE";
  downwardPressure: SignalStrength;
}
