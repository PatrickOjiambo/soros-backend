/**
 * Common types for indicator tools
 */

/**
 * Market data candle/bar structure
 */
export interface Candle {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timestamp: number;
}

/**
 * Trend direction
 */
export type TrendDirection = "UPWARD" | "DOWNWARD" | "SIDEWAYS" | "NEUTRAL";

/**
 * Signal strength/confidence levels
 */
export type SignalStrength = "VERY_STRONG" | "STRONG" | "MODERATE" | "WEAK" | "VERY_WEAK";

/**
 * Market conditions
 */
export type MarketCondition = "OVERBOUGHT" | "OVERSOLD" | "NEUTRAL" | "EXTREMELY_OVERBOUGHT" | "EXTREMELY_OVERSOLD";

/**
 * Trading signals
 */
export type TradingSignal = "BUY" | "SELL" | "HOLD";

/**
 * Volatility levels
 */
export type VolatilityLevel = "VERY_HIGH" | "HIGH" | "MODERATE" | "LOW" | "VERY_LOW";

/**
 * Volume levels
 */
export type VolumeLevel = "VERY_HIGH" | "HIGH" | "MODERATE" | "LOW" | "VERY_LOW";

/**
 * Base indicator result interface
 */
export interface BaseIndicatorResult {
  signal: TradingSignal;
  confidence: SignalStrength;
  description: string;
  timestamp: number;
}
