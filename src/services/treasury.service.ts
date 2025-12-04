/**
 * Treasury Service
 * 
 * Handles all treasury operations including deposits, withdrawals, 
 * balance adjustments, and transaction history.
 * 
 * Key Features:
 * - Atomic operations with MongoDB transactions
 * - Complete audit trail
 * - Balance validation and protection
 * - Thread-safe concurrent operations
 */

import mongoose from "mongoose";
import { Treasury, Transaction, Strategy, ITreasury, ITransaction } from "../db/schema";
import logger from "../lib/logger";

/**
 * Transaction Types for clarity
 */
export type TransactionType = 
  | "DEPOSIT" 
  | "WITHDRAW" 
  | "TRADE_OPEN" 
  | "TRADE_CLOSE" 
  | "PROFIT" 
  | "LOSS" 
  | "REFUND" 
  | "ADJUSTMENT";

export type TransactionStatus = "PENDING" | "COMPLETED" | "FAILED" | "REVERSED";

/**
 * Treasury Operation Result
 */
export interface TreasuryOperationResult {
  success: boolean;
  treasury: ITreasury;
  transaction: ITransaction;
  message: string;
}

/**
 * Balance Adjustment Options
 */
export interface BalanceAdjustmentOptions {
  amount: number;
  type: TransactionType;
  description: string;
  tradeId?: mongoose.Types.ObjectId;
  txHash?: string;
  metadata?: Record<string, any>;
}

/**
 * Initialize Treasury for a Strategy
 * Creates a new treasury record when a strategy is first funded
 */
export async function initializeTreasury(
  strategyId: mongoose.Types.ObjectId | string,
  userId: mongoose.Types.ObjectId | string,
  contractAddress: string,
): Promise<ITreasury> {
  const strategyObjectId = typeof strategyId === "string" ? new mongoose.Types.ObjectId(strategyId) : strategyId;
  const userObjectId = typeof userId === "string" ? new mongoose.Types.ObjectId(userId) : userId;

  // Check if treasury already exists
  const existing = await Treasury.findOne({ strategyId: strategyObjectId });
  if (existing) {
    logger.info({ strategyId: strategyObjectId.toString() }, "Treasury already exists");
    return existing;
  }

  // Verify strategy exists and belongs to user
  const strategy = await Strategy.findOne({
    _id: strategyObjectId,
    userId: userObjectId,
  });

  if (!strategy) {
    throw new Error("Strategy not found or does not belong to user");
  }

  // Create new treasury
  const treasury = await Treasury.create({
    strategyId: strategyObjectId,
    userId: userObjectId,
    totalDeposited: 0,
    totalWithdrawn: 0,
    availableBalance: 0,
    lockedBalance: 0,
    totalProfits: 0,
    totalLosses: 0,
    netProfitLoss: 0,
    contractAddress,
  });

  logger.info(
    { 
      treasuryId: treasury._id.toString(), 
      strategyId: strategyObjectId.toString(),
      userId: userObjectId.toString(),
    },
    "Treasury initialized",
  );

  return treasury;
}

/**
 * Deposit funds into a strategy's treasury
 * Called when user deposits WETH to the contract
 */
export async function deposit(
  strategyId: mongoose.Types.ObjectId | string,
  userId: mongoose.Types.ObjectId | string,
  amount: number,
  txHash: string,
  contractAddress: string,
): Promise<TreasuryOperationResult> {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const strategyObjectId = typeof strategyId === "string" ? new mongoose.Types.ObjectId(strategyId) : strategyId;
    const userObjectId = typeof userId === "string" ? new mongoose.Types.ObjectId(userId) : userId;

    // Validate amount
    if (amount <= 0) {
      throw new Error("Deposit amount must be positive");
    }

    // Get or create treasury
    let treasury = await Treasury.findOne({ strategyId: strategyObjectId }).session(session);
    
    if (!treasury) {
      // Initialize treasury if it doesn't exist
      const createdTreasuries = await Treasury.create(
        [
          {
            strategyId: strategyObjectId,
            userId: userObjectId,
            totalDeposited: 0,
            totalWithdrawn: 0,
            availableBalance: 0,
            lockedBalance: 0,
            totalProfits: 0,
            totalLosses: 0,
            netProfitLoss: 0,
            contractAddress,
          },
        ],
        { session },
      );
      treasury = createdTreasuries[0];
    }

    // Capture balance before
    const balanceBefore = treasury.availableBalance;

    // Update treasury
    treasury.totalDeposited += amount;
    treasury.availableBalance += amount;
    treasury.lastDepositTxHash = txHash;
    await treasury.save({ session });

    // Create transaction record
    const transaction = await Transaction.create(
      [
        {
          userId: userObjectId,
          strategyId: strategyObjectId,
          treasuryId: treasury._id,
          type: "DEPOSIT",
          amount,
          balanceBefore,
          balanceAfter: treasury.availableBalance,
          txHash,
          description: `Deposit of ${amount} WETH from blockchain`,
          status: "COMPLETED",
          metadata: {
            contractAddress,
          },
        },
      ],
      { session },
    ).then((docs) => docs[0]);

    await session.commitTransaction();

    logger.info(
      {
        treasuryId: treasury._id.toString(),
        strategyId: strategyObjectId.toString(),
        amount,
        txHash,
        newBalance: treasury.availableBalance,
      },
      "Deposit completed successfully",
    );

    return {
      success: true,
      treasury,
      transaction,
      message: `Successfully deposited ${amount} WETH`,
    };
  } catch (error) {
    await session.abortTransaction();
    logger.error({ error, strategyId, amount, txHash }, "Deposit failed");
    throw error;
  } finally {
    session.endSession();
  }
}

/**
 * Withdraw funds from a strategy's treasury
 * Returns funds to user's wallet
 */
export async function withdraw(
  strategyId: mongoose.Types.ObjectId | string,
  userId: mongoose.Types.ObjectId | string,
  amount: number,
  txHash?: string,
): Promise<TreasuryOperationResult> {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const strategyObjectId = typeof strategyId === "string" ? new mongoose.Types.ObjectId(strategyId) : strategyId;
    const userObjectId = typeof userId === "string" ? new mongoose.Types.ObjectId(userId) : userId;

    // Validate amount
    if (amount <= 0) {
      throw new Error("Withdrawal amount must be positive");
    }

    // Get treasury
    const treasury = await Treasury.findOne({
      strategyId: strategyObjectId,
      userId: userObjectId,
    }).session(session);

    if (!treasury) {
      throw new Error("Treasury not found");
    }

    // Check available balance
    if (treasury.availableBalance < amount) {
      throw new Error(
        `Insufficient balance. Available: ${treasury.availableBalance} WETH, Requested: ${amount} WETH`,
      );
    }

    // Capture balance before
    const balanceBefore = treasury.availableBalance;

    // Update treasury
    treasury.totalWithdrawn += amount;
    treasury.availableBalance -= amount;
    if (txHash) {
      treasury.lastWithdrawTxHash = txHash;
    }
    await treasury.save({ session });

    // Create transaction record
    const transaction = await Transaction.create(
      [
        {
          userId: userObjectId,
          strategyId: strategyObjectId,
          treasuryId: treasury._id,
          type: "WITHDRAW",
          amount: -amount, // Negative to indicate outflow
          balanceBefore,
          balanceAfter: treasury.availableBalance,
          txHash,
          description: `Withdrawal of ${amount} WETH to user wallet`,
          status: txHash ? "COMPLETED" : "PENDING",
        },
      ],
      { session },
    ).then((docs) => docs[0]);

    await session.commitTransaction();

    logger.info(
      {
        treasuryId: treasury._id.toString(),
        strategyId: strategyObjectId.toString(),
        amount,
        txHash,
        newBalance: treasury.availableBalance,
      },
      "Withdrawal completed successfully",
    );

    return {
      success: true,
      treasury,
      transaction,
      message: `Successfully withdrew ${amount} WETH`,
    };
  } catch (error) {
    await session.abortTransaction();
    logger.error({ error, strategyId, amount }, "Withdrawal failed");
    throw error;
  } finally {
    session.endSession();
  }
}

/**
 * Adjust balance for various operations
 * Generic function for trade execution, profit/loss recording, etc.
 */
export async function adjustBalance(
  strategyId: mongoose.Types.ObjectId | string,
  userId: mongoose.Types.ObjectId | string,
  options: BalanceAdjustmentOptions,
): Promise<TreasuryOperationResult> {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const strategyObjectId = typeof strategyId === "string" ? new mongoose.Types.ObjectId(strategyId) : strategyId;
    const userObjectId = typeof userId === "string" ? new mongoose.Types.ObjectId(userId) : userId;

    const { amount, type, description, tradeId, txHash, metadata } = options;

    // Validate amount
    if (amount === 0) {
      throw new Error("Adjustment amount cannot be zero");
    }

    // Get treasury
    const treasury = await Treasury.findOne({
      strategyId: strategyObjectId,
      userId: userObjectId,
    }).session(session);

    if (!treasury) {
      throw new Error("Treasury not found");
    }

    // Capture balance before
    const balanceBefore = treasury.availableBalance;

    // Apply adjustment based on type
    switch (type) {
      case "TRADE_OPEN":
        // Lock funds when opening a trade
        if (treasury.availableBalance < Math.abs(amount)) {
          throw new Error("Insufficient available balance to open trade");
        }
        treasury.availableBalance -= Math.abs(amount);
        treasury.lockedBalance += Math.abs(amount);
        break;

      case "TRADE_CLOSE":
        // Unlock funds when closing a trade
        treasury.lockedBalance -= Math.abs(amount);
        treasury.availableBalance += Math.abs(amount);
        break;

      case "PROFIT":
        // Record profit
        treasury.totalProfits += Math.abs(amount);
        treasury.availableBalance += Math.abs(amount);
        treasury.netProfitLoss = treasury.totalProfits - treasury.totalLosses;
        break;

      case "LOSS":
        // Record loss
        treasury.totalLosses += Math.abs(amount);
        treasury.availableBalance -= Math.abs(amount);
        treasury.netProfitLoss = treasury.totalProfits - treasury.totalLosses;
        break;

      case "REFUND":
        // Refund (positive adjustment)
        treasury.availableBalance += Math.abs(amount);
        break;

      case "ADJUSTMENT":
        // Manual adjustment (can be positive or negative)
        treasury.availableBalance += amount;
        if (treasury.availableBalance < 0) {
          throw new Error("Adjustment would result in negative balance");
        }
        break;

      default:
        throw new Error(`Unsupported transaction type: ${type}`);
    }

    await treasury.save({ session });

    // Create transaction record
    const transaction = await Transaction.create(
      [
        {
          userId: userObjectId,
          strategyId: strategyObjectId,
          treasuryId: treasury._id,
          type,
          amount,
          balanceBefore,
          balanceAfter: treasury.availableBalance,
          tradeId,
          txHash,
          description,
          metadata,
          status: "COMPLETED",
        },
      ],
      { session },
    ).then((docs) => docs[0]);

    await session.commitTransaction();

    logger.info(
      {
        treasuryId: treasury._id.toString(),
        strategyId: strategyObjectId.toString(),
        type,
        amount,
        newBalance: treasury.availableBalance,
      },
      "Balance adjustment completed",
    );

    return {
      success: true,
      treasury,
      transaction,
      message: `Balance adjusted: ${type}`,
    };
  } catch (error) {
    await session.abortTransaction();
    logger.error({ error, strategyId, options }, "Balance adjustment failed");
    throw error;
  } finally {
    session.endSession();
  }
}

/**
 * Get treasury balance for a strategy
 */
export async function getBalance(
  strategyId: mongoose.Types.ObjectId | string,
  userId?: mongoose.Types.ObjectId | string,
): Promise<ITreasury> {
  const strategyObjectId = typeof strategyId === "string" ? new mongoose.Types.ObjectId(strategyId) : strategyId;

  const query: any = { strategyId: strategyObjectId };
  if (userId) {
    const userObjectId = typeof userId === "string" ? new mongoose.Types.ObjectId(userId) : userId;
    query.userId = userObjectId;
  }

  const treasury = await Treasury.findOne(query).populate("strategyId", "name status");

  if (!treasury) {
    throw new Error("Treasury not found");
  }

  return treasury;
}

/**
 * Get all treasuries for a user
 */
export async function getUserTreasuries(
  userId: mongoose.Types.ObjectId | string,
): Promise<ITreasury[]> {
  const userObjectId = typeof userId === "string" ? new mongoose.Types.ObjectId(userId) : userId;

  const treasuries = await Treasury.find({ userId: userObjectId })
    .populate("strategyId", "name status timeframe")
    .sort({ availableBalance: -1 });

  return treasuries;
}

/**
 * Get transaction history
 */
export async function getTransactionHistory(
  strategyId: mongoose.Types.ObjectId | string,
  userId?: mongoose.Types.ObjectId | string,
  options?: {
    limit?: number;
    skip?: number;
    type?: TransactionType;
    status?: TransactionStatus;
  },
): Promise<{ transactions: ITransaction[]; total: number }> {
  const strategyObjectId = typeof strategyId === "string" ? new mongoose.Types.ObjectId(strategyId) : strategyId;

  const query: any = { strategyId: strategyObjectId };
  
  if (userId) {
    const userObjectId = typeof userId === "string" ? new mongoose.Types.ObjectId(userId) : userId;
    query.userId = userObjectId;
  }

  if (options?.type) {
    query.type = options.type;
  }

  if (options?.status) {
    query.status = options.status;
  }

  const limit = options?.limit || 50;
  const skip = options?.skip || 0;

  const [transactions, total] = await Promise.all([
    Transaction.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .populate("tradeId", "signal entry exit status"),
    Transaction.countDocuments(query),
  ]);

  return { transactions, total };
}

/**
 * Get transaction summary for a strategy
 */
export async function getTransactionSummary(
  strategyId: mongoose.Types.ObjectId | string,
  userId?: mongoose.Types.ObjectId | string,
): Promise<{
  totalDeposits: number;
  totalWithdrawals: number;
  totalProfits: number;
  totalLosses: number;
  transactionCount: number;
}> {
  const strategyObjectId = typeof strategyId === "string" ? new mongoose.Types.ObjectId(strategyId) : strategyId;

  const matchQuery: any = { 
    strategyId: strategyObjectId,
    status: "COMPLETED",
  };
  
  if (userId) {
    const userObjectId = typeof userId === "string" ? new mongoose.Types.ObjectId(userId) : userId;
    matchQuery.userId = userObjectId;
  }

  const summary = await Transaction.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: "$type",
        total: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
  ]);

  const result = {
    totalDeposits: 0,
    totalWithdrawals: 0,
    totalProfits: 0,
    totalLosses: 0,
    transactionCount: 0,
  };

  summary.forEach((item) => {
    result.transactionCount += item.count;
    
    switch (item._id) {
      case "DEPOSIT":
        result.totalDeposits = item.total;
        break;
      case "WITHDRAW":
        result.totalWithdrawals = Math.abs(item.total);
        break;
      case "PROFIT":
        result.totalProfits = item.total;
        break;
      case "LOSS":
        result.totalLosses = Math.abs(item.total);
        break;
    }
  });

  return result;
}

/**
 * Validate sufficient balance for a trade
 */
export async function validateSufficientBalance(
  strategyId: mongoose.Types.ObjectId | string,
  requiredAmount: number,
): Promise<boolean> {
  const strategyObjectId = typeof strategyId === "string" ? new mongoose.Types.ObjectId(strategyId) : strategyId;

  const treasury = await Treasury.findOne({ strategyId: strategyObjectId });

  if (!treasury) {
    return false;
  }

  return treasury.availableBalance >= requiredAmount;
}
