/**
 * Agents Module - Central Exports
 * 
 * Provides centralized access to all AI agents and utilities
 */

// Export agent types
export * from "./types";

// Export individual agents
export { refinerAgent, needsRefinement, parseRefinerOutput } from "./refiner.agent";
export { analyzerAgent, parseAnalyzerOutput } from "./analyzer.agent";
export { validatorAgent, parseValidatorOutput, saveTrade } from "./validator.agent";

// Export trading pipeline
export {
  tradingAgent,
  prepareStrategyInput,
  executeTradingPipeline,
  executeTradingPipelineWithState,
} from "./trading.agent";

// Export worker functions
export {
  executeStrategyAnalysisCycle,
  executeSingleStrategy,
  getPendingTrades,
  getExecutionHistory,
} from "../workers/strategy-executor";

// Re-export types for convenience
export type { StrategyExecutionResult } from "../workers/strategy-executor";