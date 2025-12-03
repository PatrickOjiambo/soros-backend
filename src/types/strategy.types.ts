/**
 * Strategy Types and Enums
 */

export enum StrategyStatus {
  INACTIVE = "INACTIVE",
  ACTIVE = "ACTIVE",
}

export enum IndicatorCategory {
  TREND = "Trend",
  MOMENTUM = "Momentum",
  VOLATILITY = "Volatility",
  VOLUME = "Volume",
}

export enum Timeframe {
  M1 = "1m",
  M5 = "5m",
  M15 = "15m",
  M30 = "30m",
  H1 = "1h",
  H4 = "4h",
  D1 = "1d",
  W1 = "1w",
}

/**
 * Indicator Interface
 */
export interface IIndicator {
  _id: string;
  name: string;
  abbreviation: string;
  category: IndicatorCategory;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Strategy Interface
 */
export interface IStrategy {
  _id: string;
  userId: string;
  name: string;
  description?: string;
  indicators: string[]; // Array of indicator IDs
  timeframe: Timeframe;
  amount: number;
  status: StrategyStatus;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Request/Response DTOs
 */
export interface CreateStrategyDTO {
  name: string;
  description?: string;
  indicators: string[];
  timeframe: Timeframe;
  amount: number;
}

export interface UpdateStrategyDTO {
  name?: string;
  description?: string;
  indicators?: string[];
  timeframe?: Timeframe;
  amount?: number;
  status?: StrategyStatus;
}

export interface StrategyResponseDTO {
  _id: string;
  userId: string;
  name: string;
  description?: string;
  indicators: IIndicator[];
  timeframe: Timeframe;
  amount: number;
  status: StrategyStatus;
  createdAt: Date;
  updatedAt: Date;
}
