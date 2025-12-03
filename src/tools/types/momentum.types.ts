import type { BaseIndicatorResult, MarketCondition, SignalStrength, TradingSignal, TrendDirection } from "./common.types";

/**
 * Result from RSI (Relative Strength Index) analysis
 */
export interface RelativeStrengthIndexResult extends BaseIndicatorResult {
  rsiValue: number;
  marketCondition: MarketCondition;
  divergence: "BULLISH" | "BEARISH" | "NONE";
  trendStrength: SignalStrength;
}

/**
 * Result from Stochastic Oscillator analysis
 */
export interface StochasticOscillatorResult extends BaseIndicatorResult {
  kValue: number;
  dValue: number;
  marketCondition: MarketCondition;
  crossover: "BULLISH" | "BEARISH" | "NONE";
  divergence: "BULLISH" | "BEARISH" | "NONE";
}

/**
 * Result from Williams %R analysis
 */
export interface WilliamsRResult extends BaseIndicatorResult {
  williamsRValue: number;
  marketCondition: MarketCondition;
  reversalPotential: "HIGH" | "MODERATE" | "LOW";
  momentum: "BULLISH" | "BEARISH" | "NEUTRAL";
}

/**
 * Result from ROC (Rate of Change) analysis
 */
export interface RateOfChangeResult extends BaseIndicatorResult {
  rocValue: number;
  momentum: TrendDirection;
  acceleration: "INCREASING" | "DECREASING" | "STABLE";
  strength: SignalStrength;
}

/**
 * Result from Awesome Oscillator analysis
 */
export interface AwesomeOscillatorResult extends BaseIndicatorResult {
  aoValue: number;
  momentum: "BULLISH" | "BEARISH" | "NEUTRAL";
  saucerPattern: "BULLISH_SAUCER" | "BEARISH_SAUCER" | "NONE";
  crossover: "BULLISH" | "BEARISH" | "NONE";
}

/**
 * Result from PPO (Percentage Price Oscillator) analysis
 */
export interface PercentagePriceOscillatorResult extends BaseIndicatorResult {
  ppoValue: number;
  signalLine: number;
  histogram: number;
  crossover: "BULLISH" | "BEARISH" | "NONE";
  divergence: "BULLISH" | "BEARISH" | "NONE";
}

/**
 * Result from PVO (Percentage Volume Oscillator) analysis
 */
export interface PercentageVolumeOscillatorResult extends BaseIndicatorResult {
  pvoValue: number;
  signalLine: number;
  volumeTrend: "INCREASING" | "DECREASING" | "STABLE";
  confirmation: boolean;
}

/**
 * Result from Ichimoku Cloud analysis
 */
export interface IchimokuCloudResult extends BaseIndicatorResult {
  trend: TrendDirection;
  conversionLine: number;
  baseLine: number;
  leadingSpanA: number;
  leadingSpanB: number;
  laggingSpan: number;
  cloudStatus: "BULLISH_CLOUD" | "BEARISH_CLOUD" | "NEUTRAL_CLOUD";
  pricePosition: "ABOVE_CLOUD" | "IN_CLOUD" | "BELOW_CLOUD";
  strength: SignalStrength;
}

/**
 * Result from Chaikin Oscillator analysis
 */
export interface ChaikinOscillatorResult extends BaseIndicatorResult {
  oscillatorValue: number;
  trend: TrendDirection;
  divergence: "BULLISH" | "BEARISH" | "NONE";
  volumeConfirmation: boolean;
}
