/**
 * Technical Indicator Tools for AI Agents
 * 
 * This module exports all technical indicator tools that can be used by AI agents
 * to analyze WETHUSDT market data and provide trading insights.
 * 
 * All tools automatically fetch market data from Binance API and return
 * human-readable trading context rather than raw mathematical values.
 */

// Import all tool categories
import { trendIndicatorTools } from "./trend.indicators";
import { momentumIndicatorTools } from "./momentum.indicators";
import { volumeIndicatorTools } from "./volume.indicators";
import { volatilityIndicatorTools } from "./volatility.indicators";

// Export individual tool categories
export { trendIndicatorTools } from "./trend.indicators";
export { momentumIndicatorTools } from "./momentum.indicators";
export { volumeIndicatorTools } from "./volume.indicators";
export { volatilityIndicatorTools } from "./volatility.indicators";

// Export individual trend tools
export {
  simpleMovingAverageTool,
  exponentialMovingAverageTool,
  macdTool,
  parabolicSarTool,
  aroonTool,
} from "./trend.indicators";

// Export individual momentum tools
export {
  rsiTool,
  stochasticTool,
  williamsRTool,
  rocTool,
  awesomeOscillatorTool,
  ppoTool,
} from "./momentum.indicators";

// Export individual volume tools
export {
  accumulationDistributionTool,
  chaikinMoneyFlowTool,
  easeOfMovementTool,
  forceIndexTool,
  moneyFlowIndexTool,
  onBalanceVolumeTool,
  vwapTool,
} from "./volume.indicators";

// Export individual volatility tools
export {
  atrTool,
  bollingerBandsTool,
  bollingerBandWidthTool,
  keltnerChannelTool,
  donchianChannelTool,
  chandelierExitTool,
} from "./volatility.indicators";

// Export all types
export * from "./types/common.types";
export * from "./types/trend.types";
export * from "./types/momentum.types";
export * from "./types/volume.types";
export * from "./types/volatility.types";

// Export market data utilities
export { getMarketData, getOHLCArrays } from "./marketData";

/**
 * All technical indicator tools combined
 * Total: 19 tools across 4 categories
 * 
 * Trend (6): SMA, EMA, MACD, Parabolic SAR, Aroon, ADX
 * Momentum (6): RSI, Stochastic, Williams %R, ROC, Awesome Oscillator, PPO
 * Volume (7): A/D, CMF, EMV, Force Index, MFI, OBV, VWAP
 * Volatility (6): ATR, Bollinger Bands, BB Width, Keltner Channel, Donchian Channel, Chandelier Exit
 */
export const allIndicatorTools = [
  ...trendIndicatorTools,
  ...momentumIndicatorTools,
  ...volumeIndicatorTools,
  ...volatilityIndicatorTools,
];

/**
 * Get tools by category
 */
export function getToolsByCategory(category: "trend" | "momentum" | "volume" | "volatility") {
  switch (category) {
    case "trend":
      return trendIndicatorTools;
    case "momentum":
      return momentumIndicatorTools;
    case "volume":
      return volumeIndicatorTools;
    case "volatility":
      return volatilityIndicatorTools;
    default:
      return [];
  }
}

/**
 * Tool metadata for reference
 */
export const toolMetadata = {
  total: allIndicatorTools.length,
  categories: {
    trend: trendIndicatorTools.length,
    momentum: momentumIndicatorTools.length,
    volume: volumeIndicatorTools.length,
    volatility: volatilityIndicatorTools.length,
  },
  marketPair: "WETHUSDT",
  dataSource: "Binance API",
  cacheDuration: "60 seconds",
};
