import type { BaseIndicatorResult, SignalStrength, TradingSignal, TrendDirection } from "./common.types";

/**
 * Result from Simple Moving Average (SMA) analysis
 */
export interface SimpleMovingAverageResult extends BaseIndicatorResult {
  trend: TrendDirection;
  currentPrice: number;
  smaValue: number;
  pricePosition: "ABOVE_SMA" | "BELOW_SMA" | "AT_SMA";
  crossoverDetected: boolean;
}

/**
 * Result from Exponential Moving Average (EMA) analysis
 */
export interface ExponentialMovingAverageResult extends BaseIndicatorResult {
  trend: TrendDirection;
  currentPrice: number;
  emaValue: number;
  pricePosition: "ABOVE_EMA" | "BELOW_EMA" | "AT_EMA";
  momentum: "ACCELERATING" | "DECELERATING" | "STEADY";
  crossoverDetected: boolean;
  responsiveness: string
}

/**
 * Result from MACD (Moving Average Convergence Divergence) analysis
 */
export interface MovingAverageConvergenceDivergenceResult extends BaseIndicatorResult {
  trend: TrendDirection;
  macdLine: number;
  signalLine: number;
  histogram: number;
  crossover: "BULLISH" | "BEARISH" | "NONE";
  divergence: "BULLISH" | "BEARISH" | "NONE";
}

/**
 * Result from Parabolic SAR analysis
 */
export interface ParabolicSARResult extends BaseIndicatorResult {
  trend: TrendDirection;
  sarValue: number;
  currentPrice: number;
  position: "ABOVE_PRICE" | "BELOW_PRICE";
  reversalDetected: boolean;
  stopLossLevel: number;
}

/**
 * Result from Aroon Indicator analysis
 */
export interface AroonIndicatorResult extends BaseIndicatorResult {
  trend: TrendDirection;
  aroonUp: number;
  aroonDown: number;
  strength: "VERY_STRONG" | "STRONG" | "MODERATE" | "WEAK";
  oscillator: number;
  crossover: "BULLISH" | "BEARISH" | "NONE";
}

/**
 * Result from ADX (Average Directional Index) analysis
 */
export interface AverageDirectionalIndexResult extends BaseIndicatorResult {
  trend: TrendDirection;
  adxValue: number;
  plusDI: number;
  minusDI: number;
  trendStrength: "VERY_STRONG" | "STRONG" | "MODERATE" | "WEAK" | "NO_TREND";
}

/**
 * Result from CCI (Commodity Channel Index) analysis
 */
export interface CommodityChannelIndexResult extends BaseIndicatorResult {
  trend: TrendDirection;
  cciValue: number;
  marketCondition: "EXTREMELY_OVERBOUGHT" | "OVERBOUGHT" | "NEUTRAL" | "OVERSOLD" | "EXTREMELY_OVERSOLD";
  divergence: "BULLISH" | "BEARISH" | "NONE";
}

/**
 * Result from Vortex Indicator analysis
 */
export interface VortexIndicatorResult extends BaseIndicatorResult {
  trend: TrendDirection;
  positiveVI: number;
  negativeVI: number;
  crossover: "BULLISH" | "BEARISH" | "NONE";
  trendConfirmation: boolean;
}

/**
 * Result from DEMA (Double Exponential Moving Average) analysis
 */
export interface DoubleExponentialMovingAverageResult extends BaseIndicatorResult {
  trend: TrendDirection;
  demaValue: number;
  currentPrice: number;
  pricePosition: "ABOVE_DEMA" | "BELOW_DEMA" | "AT_DEMA";
  responsiveness: "HIGH" | "MODERATE" | "LOW";
}

/**
 * Result from TEMA (Triple Exponential Moving Average) analysis
 */
export interface TripleExponentialMovingAverageResult extends BaseIndicatorResult {
  trend: TrendDirection;
  temaValue: number;
  currentPrice: number;
  pricePosition: "ABOVE_TEMA" | "BELOW_TEMA" | "AT_TEMA";
  lag: "MINIMAL" | "LOW" | "MODERATE";
}

/**
 * Result from Balance of Power analysis
 */
export interface BalanceOfPowerResult extends BaseIndicatorResult {
  trend: TrendDirection;
  bopValue: number;
  buyerStrength: SignalStrength;
  sellerStrength: SignalStrength;
  marketDominance: "BUYERS" | "SELLERS" | "BALANCED";
}

/**
 * Result from Mass Index analysis
 */
export interface MassIndexResult extends BaseIndicatorResult {
  trend: TrendDirection;
  massIndexValue: number;
  reversalWarning: boolean;
  volatilityLevel: "HIGH" | "MODERATE" | "LOW";
}

/**
 * Result from TRIX (Triple Exponential Average) analysis
 */
export interface TripleExponentialAverageResult extends BaseIndicatorResult {
  trend: TrendDirection;
  trixValue: number;
  trixSignal: number;
  crossover: "BULLISH" | "BEARISH" | "NONE";
  momentum: "INCREASING" | "DECREASING" | "STABLE";
}

/**
 * Result from VWMA (Volume Weighted Moving Average) analysis
 */
export interface VolumeWeightedMovingAverageResult extends BaseIndicatorResult {
  trend: TrendDirection;
  vwmaValue: number;
  currentPrice: number;
  volumeConfirmation: boolean;
  significance: SignalStrength;
}
