/**
 * Treasury Helper Utilities
 * 
 * Helper functions for treasury operations
 */

import mongoose from "mongoose";
import { Treasury } from "../db/schema";

/**
 * Format amount to 8 decimal places (standard for crypto)
 */
export function formatAmount(amount: number): number {
  return Math.round(amount * 100000000) / 100000000;
}

/**
 * Validate Ethereum address format
 */
export function isValidEthereumAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Validate transaction hash format
 */
export function isValidTxHash(txHash: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(txHash);
}

/**
 * Calculate percentage change
 */
export function calculatePercentageChange(
  current: number,
  previous: number,
): number {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
}

/**
 * Format treasury data for API response
 */
export function formatTreasuryResponse(treasury: any) {
  return {
    id: treasury._id,
    strategyId: treasury.strategyId,
    availableBalance: formatAmount(treasury.availableBalance),
    lockedBalance: formatAmount(treasury.lockedBalance),
    totalDeposited: formatAmount(treasury.totalDeposited),
    totalWithdrawn: formatAmount(treasury.totalWithdrawn),
    totalProfits: formatAmount(treasury.totalProfits),
    totalLosses: formatAmount(treasury.totalLosses),
    netProfitLoss: formatAmount(treasury.netProfitLoss),
    profitLossPercentage: formatAmount(
      calculatePercentageChange(
        treasury.totalProfits,
        treasury.totalDeposited || 1,
      ),
    ),
    contractAddress: treasury.contractAddress,
    lastDepositTxHash: treasury.lastDepositTxHash,
    lastWithdrawTxHash: treasury.lastWithdrawTxHash,
    createdAt: treasury.createdAt,
    updatedAt: treasury.updatedAt,
  };
}

/**
 * Format transaction data for API response
 */
export function formatTransactionResponse(transaction: any) {
  return {
    id: transaction._id,
    type: transaction.type,
    amount: formatAmount(transaction.amount),
    balanceBefore: formatAmount(transaction.balanceBefore),
    balanceAfter: formatAmount(transaction.balanceAfter),
    description: transaction.description,
    txHash: transaction.txHash,
    tradeId: transaction.tradeId,
    status: transaction.status,
    metadata: transaction.metadata,
    createdAt: transaction.createdAt,
  };
}

/**
 * Check if strategy has sufficient balance for trade
 */
export async function checkTradeBalance(
  strategyId: mongoose.Types.ObjectId | string,
  requiredAmount: number,
): Promise<{
  hasBalance: boolean;
  availableBalance: number;
  requiredAmount: number;
  deficit: number;
}> {
  const strategyObjectId =
    typeof strategyId === "string"
      ? new mongoose.Types.ObjectId(strategyId)
      : strategyId;

  const treasury = await Treasury.findOne({ strategyId: strategyObjectId });

  if (!treasury) {
    return {
      hasBalance: false,
      availableBalance: 0,
      requiredAmount,
      deficit: requiredAmount,
    };
  }

  const hasBalance = treasury.availableBalance >= requiredAmount;
  const deficit = hasBalance ? 0 : requiredAmount - treasury.availableBalance;

  return {
    hasBalance,
    availableBalance: treasury.availableBalance,
    requiredAmount,
    deficit,
  };
}

/**
 * Get treasury health metrics
 */
export async function getTreasuryHealth(
  strategyId: mongoose.Types.ObjectId | string,
): Promise<{
  status: "HEALTHY" | "WARNING" | "CRITICAL" | "EMPTY";
  availableBalance: number;
  lockedBalance: number;
  utilizationRate: number; // Percentage of balance that is locked
  profitMargin: number; // Net P/L as percentage of total deposited
  message: string;
}> {
  const strategyObjectId =
    typeof strategyId === "string"
      ? new mongoose.Types.ObjectId(strategyId)
      : strategyId;

  const treasury = await Treasury.findOne({ strategyId: strategyObjectId });

  if (!treasury) {
    return {
      status: "EMPTY",
      availableBalance: 0,
      lockedBalance: 0,
      utilizationRate: 0,
      profitMargin: 0,
      message: "Treasury not initialized",
    };
  }

  const totalBalance = treasury.availableBalance + treasury.lockedBalance;
  const utilizationRate =
    totalBalance > 0 ? (treasury.lockedBalance / totalBalance) * 100 : 0;
  const profitMargin =
    treasury.totalDeposited > 0
      ? (treasury.netProfitLoss / treasury.totalDeposited) * 100
      : 0;

  let status: "HEALTHY" | "WARNING" | "CRITICAL" | "EMPTY";
  let message: string;

  if (totalBalance === 0) {
    status = "EMPTY";
    message = "Treasury has no funds";
  } else if (treasury.availableBalance < 10) {
    status = "CRITICAL";
    message = "Available balance critically low";
  } else if (utilizationRate > 80) {
    status = "WARNING";
    message = "High utilization rate - consider adding funds";
  } else {
    status = "HEALTHY";
    message = "Treasury is healthy";
  }

  return {
    status,
    availableBalance: treasury.availableBalance,
    lockedBalance: treasury.lockedBalance,
    utilizationRate: formatAmount(utilizationRate),
    profitMargin: formatAmount(profitMargin),
    message,
  };
}

/**
 * Calculate trade size based on available balance and risk parameters
 */
export function calculateTradeSize(
  availableBalance: number,
  riskPercentage: number = 2, // Default 2% risk per trade
  maxTradeSize?: number,
): number {
  const calculatedSize = (availableBalance * riskPercentage) / 100;
  
  if (maxTradeSize && calculatedSize > maxTradeSize) {
    return maxTradeSize;
  }

  return formatAmount(calculatedSize);
}

/**
 * Validate treasury operation parameters
 */
export function validateTreasuryOperation(params: {
  amount?: number;
  strategyId?: string;
  userId?: string;
  txHash?: string;
  contractAddress?: string;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (params.amount !== undefined) {
    if (typeof params.amount !== "number") {
      errors.push("Amount must be a number");
    } else if (params.amount <= 0) {
      errors.push("Amount must be positive");
    } else if (!isFinite(params.amount)) {
      errors.push("Amount must be a finite number");
    }
  }

  if (
    params.strategyId &&
    !mongoose.Types.ObjectId.isValid(params.strategyId)
  ) {
    errors.push("Invalid strategy ID format");
  }

  if (params.userId && !mongoose.Types.ObjectId.isValid(params.userId)) {
    errors.push("Invalid user ID format");
  }

  if (params.txHash && !isValidTxHash(params.txHash)) {
    errors.push("Invalid transaction hash format");
  }

  if (params.contractAddress && !isValidEthereumAddress(params.contractAddress)) {
    errors.push("Invalid contract address format");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
