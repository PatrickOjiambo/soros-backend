/**
 * Treasury API Routes
 * 
 * Endpoints for managing strategy funding:
 * - Deposit notifications from blockchain
 * - Withdrawal requests
 * - Balance queries
 * - Transaction history
 */

import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import mongoose from "mongoose";
import {
    deposit,
    withdraw,
    getBalance,
    getUserTreasuries,
    getTransactionHistory,
    getTransactionSummary,
    initializeTreasury,
} from "../services/treasury.service";
import logger from "../lib/logger";
import { authenticate, AuthRequest, treasuryLimiter } from "../middlewares";

const router: Router = Router();

// Apply treasury-specific rate limiter to all routes
router.use(treasuryLimiter);

/**
 * Validation Schemas
 */
const DepositSchema = z.object({
    strategyId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid strategy ID"),
    amount: z.number().positive("Amount must be positive"),
    txHash: z
        .string()
        .regex(/^0x[a-fA-F0-9]{64}$/, "Invalid transaction hash"),
    contractAddress: z
        .string()
        .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid contract address"),
});

const WithdrawSchema = z.object({
    strategyId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid strategy ID"),
    amount: z.number().positive("Amount must be positive"),
});

const InitializeTreasurySchema = z.object({
    strategyId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid strategy ID"),
    contractAddress: z
        .string()
        .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid contract address"),
});

const TransactionQuerySchema = z.object({
    limit: z.coerce.number().int().positive().max(100).optional().default(50),
    skip: z.coerce.number().int().min(0).optional().default(0),
    type: z
        .enum(["DEPOSIT", "WITHDRAW", "TRADE_OPEN", "TRADE_CLOSE", "PROFIT", "LOSS", "REFUND", "ADJUSTMENT"])
        .optional(),
    status: z.enum(["PENDING", "COMPLETED", "FAILED", "REVERSED"]).optional(),
});



/**
 * POST /api/treasury/deposit
 * 
 * Notify backend of a successful deposit to the contract
 * Called by frontend after user deposits WETH
 */
router.post("/deposit", authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        // Validate request body
        const data = DepositSchema.parse(req.body);
        const userId = req.user!.userId;


        logger.info(
            {
                strategyId: data.strategyId,
                amount: data.amount,
                txHash: data.txHash,
                userId: userId.toString(),
            },
            "Processing deposit request",
        );

        // Process deposit
        const result = await deposit(
            data.strategyId,
            userId,
            data.amount,
            data.txHash,
            data.contractAddress,
        );

        res.status(200).json({
            success: true,
            message: result.message,
            data: {
                treasury: {
                    id: result.treasury._id,
                    strategyId: result.treasury.strategyId,
                    availableBalance: result.treasury.availableBalance,
                    lockedBalance: result.treasury.lockedBalance,
                    totalDeposited: result.treasury.totalDeposited,
                    totalWithdrawn: result.treasury.totalWithdrawn,
                    netProfitLoss: result.treasury.netProfitLoss,
                },
                transaction: {
                    id: result.transaction._id,
                    type: result.transaction.type,
                    amount: result.transaction.amount,
                    balanceBefore: result.transaction.balanceBefore,
                    balanceAfter: result.transaction.balanceAfter,
                    txHash: result.transaction.txHash,
                    status: result.transaction.status,
                    createdAt: result.transaction.createdAt,
                },
            },
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                success: false,
                message: "Validation error",
                errors: error.issues,
            });
        }

        logger.error({ error }, "Deposit endpoint error");
        next(error);
    }
});

/**
 * POST /api/treasury/withdraw
 * 
 * Request withdrawal from a strategy
 * Initiates withdrawal process
 */
router.post("/withdraw", authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        // Validate request body
        const data = WithdrawSchema.parse(req.body);
        const userId = req.user!.userId;

        logger.info(
            {
                strategyId: data.strategyId,
                amount: data.amount,
                userId: userId.toString(),
            },
            "Processing withdrawal request",
        );

        // Process withdrawal
        const result = await withdraw(
            data.strategyId,
            userId,
            data.amount,
        );

        res.status(200).json({
            success: true,
            message: result.message,
            data: {
                treasury: {
                    id: result.treasury._id,
                    strategyId: result.treasury.strategyId,
                    availableBalance: result.treasury.availableBalance,
                    lockedBalance: result.treasury.lockedBalance,
                    totalDeposited: result.treasury.totalDeposited,
                    totalWithdrawn: result.treasury.totalWithdrawn,
                    netProfitLoss: result.treasury.netProfitLoss,
                },
                transaction: {
                    id: result.transaction._id,
                    type: result.transaction.type,
                    amount: result.transaction.amount,
                    balanceBefore: result.transaction.balanceBefore,
                    balanceAfter: result.transaction.balanceAfter,
                    status: result.transaction.status,
                    createdAt: result.transaction.createdAt,
                },
            },
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                success: false,
                message: "Validation error",
                errors: error.issues,
            });
        }

        logger.error({ error }, "Withdrawal endpoint error");
        next(error);
    }
});

/**
 * GET /api/treasury/balance/:strategyId
 * 
 * Get current balance for a strategy
 */
router.get("/balance/:strategyId", authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { strategyId } = req.params;
       const userId = req.user!.userId;

        // Validate strategyId
        if (!mongoose.Types.ObjectId.isValid(strategyId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid strategy ID",
            });
        }

        const treasury = await getBalance(strategyId, userId);

        res.status(200).json({
            success: true,
            data: {
                id: treasury._id,
                strategyId: treasury.strategyId,
                availableBalance: treasury.availableBalance,
                lockedBalance: treasury.lockedBalance,
                totalDeposited: treasury.totalDeposited,
                totalWithdrawn: treasury.totalWithdrawn,
                totalProfits: treasury.totalProfits,
                totalLosses: treasury.totalLosses,
                netProfitLoss: treasury.netProfitLoss,
                contractAddress: treasury.contractAddress,
                lastDepositTxHash: treasury.lastDepositTxHash,
                lastWithdrawTxHash: treasury.lastWithdrawTxHash,
                createdAt: treasury.createdAt,
                updatedAt: treasury.updatedAt,
            },
        });
    } catch (error) {
        logger.error({ error, strategyId: req.params.strategyId }, "Get balance endpoint error");
        next(error);
    }
});

/**
 * GET /api/treasury/balances
 * 
 * Get all treasuries for authenticated user
 */
router.get("/balances", authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
       const userId = req.user!.userId;

        const treasuries = await getUserTreasuries(userId);

        res.status(200).json({
            success: true,
            data: treasuries.map((treasury) => ({
                id: treasury._id,
                strategyId: treasury.strategyId,
                availableBalance: treasury.availableBalance,
                lockedBalance: treasury.lockedBalance,
                totalDeposited: treasury.totalDeposited,
                totalWithdrawn: treasury.totalWithdrawn,
                totalProfits: treasury.totalProfits,
                totalLosses: treasury.totalLosses,
                netProfitLoss: treasury.netProfitLoss,
                contractAddress: treasury.contractAddress,
                createdAt: treasury.createdAt,
                updatedAt: treasury.updatedAt,
            })),
            count: treasuries.length,
        });
    } catch (error) {
        logger.error({ error }, "Get user treasuries endpoint error");
        next(error);
    }
});

/**
 * GET /api/treasury/transactions/:strategyId
 * 
 * Get transaction history for a strategy
 */
router.get(
    "/transactions/:strategyId",
    authenticate,
    async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const { strategyId } = req.params;
           const userId = req.user!.userId;

            // Validate strategyId
            if (!mongoose.Types.ObjectId.isValid(strategyId)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid strategy ID",
                });
            }

            // Validate query parameters
            const queryParams = TransactionQuerySchema.parse(req.query);

            const { transactions, total } = await getTransactionHistory(
                strategyId,
                userId,
                queryParams,
            );

            res.status(200).json({
                success: true,
                data: transactions.map((tx) => ({
                    id: tx._id,
                    type: tx.type,
                    amount: tx.amount,
                    balanceBefore: tx.balanceBefore,
                    balanceAfter: tx.balanceAfter,
                    description: tx.description,
                    txHash: tx.txHash,
                    tradeId: tx.tradeId,
                    status: tx.status,
                    metadata: tx.metadata,
                    createdAt: tx.createdAt,
                })),
                pagination: {
                    total,
                    limit: queryParams.limit,
                    skip: queryParams.skip,
                    hasMore: queryParams.skip + transactions.length < total,
                },
            });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({
                    success: false,
                    message: "Validation error",
                    errors: error.issues,
                });
            }

            logger.error({ error, strategyId: req.params.strategyId }, "Get transactions endpoint error");
            next(error);
        }
    },
);

/**
 * GET /api/treasury/summary/:strategyId
 * 
 * Get transaction summary for a strategy
 */
router.get("/summary/:strategyId", authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { strategyId } = req.params;
        const userId = req.user!.userId;

        // Validate strategyId
        if (!mongoose.Types.ObjectId.isValid(strategyId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid strategy ID",
            });
        }

        const summary = await getTransactionSummary(strategyId, userId);

        res.status(200).json({
            success: true,
            data: summary,
        });
    } catch (error) {
        logger.error({ error, strategyId: req.params.strategyId }, "Get summary endpoint error");
        next(error);
    }
});

/**
 * POST /api/treasury/initialize
 * 
 * Initialize treasury for a strategy
 * Should be called when strategy is first created or before first deposit
 */
router.post("/initialize", authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        // Validate request body
        const data = InitializeTreasurySchema.parse(req.body);
        const userId = req.user!.userId;
        logger.info(
            {
                strategyId: data.strategyId,
                userId: userId.toString(),
            },
            "Initializing treasury",
        );

        const treasury = await initializeTreasury(
            data.strategyId,
            userId,
            data.contractAddress,
        );

        res.status(201).json({
            success: true,
            message: "Treasury initialized successfully",
            data: {
                id: treasury._id,
                strategyId: treasury.strategyId,
                availableBalance: treasury.availableBalance,
                lockedBalance: treasury.lockedBalance,
                contractAddress: treasury.contractAddress,
                createdAt: treasury.createdAt,
            },
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                success: false,
                message: "Validation error",
                errors: error.issues,
            });
        }

        logger.error({ error }, "Initialize treasury endpoint error");
        next(error);
    }
});

export default router;
