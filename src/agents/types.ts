/**
 * Agent Return Types
 * 
 * Defines the output interfaces for each agent in the sequential pipeline
 */

import type { SignalStrength, TradingSignal } from "../tools/types/common.types";

/**
 * Output from Refiner Agent
 * 
 * Takes user's raw strategy and refines it into structured, 
 * LLM-understandable steps with clear execution logic
 */
export interface RefinerAgentOutput {
  refinedDescription: string;
  steps: string[];
  indicatorsNeeded: string[];
  entryConditions: string[];
  exitConditions: string[];
  riskManagement: string;
  reasoning: string;
}

/**
 * Output from Analyzer Agent
 * 
 * Executes indicator tools based on refined strategy,
 * returns context-rich analysis (not raw numbers)
 */
export interface AnalyzerAgentOutput {
  toolsExecuted: string[];
  marketCondition: string;
  trendAnalysis: string;
  momentumAnalysis: string;
  volatilityAnalysis: string;
  volumeAnalysis: string;
  keyInsights: string[];
  warnings: string[];
  timestamp: Date;
}

/**
 * Output from Validator Agent
 * 
 * Makes final trading decision based on analysis and refined strategy.
 * Determines if trade should be executed, entry/exit prices, and reasoning.
 */
export interface ValidatorAgentOutput {
  decision: "EXECUTE" | "HOLD" | "REJECT";
  signal: TradingSignal;
  confidence: SignalStrength;
  entry: number | null;
  exit: number | null;
  stopLoss: number | null;
  reasoning: string;
  riskRewardRatio: number | null;
  validationChecks: {
    strategyAlignment: boolean;
    riskAcceptable: boolean;
    marketConditionsFavorable: boolean;
    sufficientConfidence: boolean;
  };
}

/**
 * Trade Status Enum
 * 
 * Tracks the lifecycle of a trade from detection to execution
 */
export enum TradeStatus {
  PENDING = "PENDING",     // Trade signal detected, awaiting execution
  PLACED = "PLACED",       // Trade successfully placed on 1inch
  FAILED = "FAILED",       // Trade placement failed
  CANCELLED = "CANCELLED", // Trade cancelled before execution
}

/**
 * Trade Interface
 * 
 * Schema for trades that will be saved to database.
 * Aligns with 1inch API requirements for trade execution.
 */
export interface ITrade {
  _id: string;
  userId: string;
  strategyId: string;
  signal: TradingSignal;
  entry: number;
  exit: number;
  stopLoss: number;
  reasoning: string;
  confidence: SignalStrength;
  riskRewardRatio: number;
  amount: number; // Trade amount from strategy
  status: TradeStatus;
  
  // Analysis context
  marketCondition: string;
  toolsUsed: string[];
  
  // 1inch specific fields (to be populated during execution)
  txHash?: string;
  executedAt?: Date;
  executedPrice?: number;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}
