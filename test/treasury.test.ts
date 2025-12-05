/**
 * Treasury Management Tests
 * 
 * Comprehensive test suite for treasury operations
 */

import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import {
  deposit,
  withdraw,
  adjustBalance,
  getBalance,
  getUserTreasuries,
  getTransactionHistory,
  getTransactionSummary,
  initializeTreasury,
  validateSufficientBalance,
} from "../src/services/treasury.service";
import { User, Strategy, Treasury, Transaction } from "../src/db/schema";

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await User.deleteMany({});
  await Strategy.deleteMany({});
  await Treasury.deleteMany({});
  await Transaction.deleteMany({});
});

describe("Treasury Service", () => {
  let userId: mongoose.Types.ObjectId;
  let strategyId: mongoose.Types.ObjectId;
  const contractAddress = "0x1234567890123456789012345678901234567890";

  beforeEach(async () => {
    // Create test user
    const user = await User.create({
      email: "test@example.com",
      password: "password123",
      firstName: "Test",
      lastName: "User",
    });
    userId = user._id as mongoose.Types.ObjectId;

    // Create test strategy
    const strategy = await Strategy.create({
      userId,
      name: "Test Strategy",
      description: "Test strategy for treasury",
      timeframe: "15m",
      amount: 100,
      status: "ACTIVE",
    });
    strategyId = strategy._id as mongoose.Types.ObjectId;
  });

  describe("initializeTreasury", () => {
    it("should initialize a new treasury", async () => {
      const treasury = await initializeTreasury(
        strategyId,
        userId,
        contractAddress,
      );

      expect(treasury).toBeDefined();
      expect(treasury.strategyId.toString()).toBe(strategyId.toString());
      expect(treasury.userId.toString()).toBe(userId.toString());
      expect(treasury.availableBalance).toBe(0);
      expect(treasury.totalDeposited).toBe(0);
      expect(treasury.contractAddress).toBe(contractAddress);
    });

    it("should return existing treasury if already initialized", async () => {
      const treasury1 = await initializeTreasury(
        strategyId,
        userId,
        contractAddress,
      );
      const treasury2 = await initializeTreasury(
        strategyId,
        userId,
        contractAddress,
      );

      expect(treasury1._id.toString()).toBe(treasury2._id.toString());
    });

    it("should throw error for non-existent strategy", async () => {
      const fakeStrategyId = new mongoose.Types.ObjectId();

      await expect(
        initializeTreasury(fakeStrategyId, userId, contractAddress),
      ).rejects.toThrow("Strategy not found or does not belong to user");
    });
  });

  describe("deposit", () => {
    it("should process a deposit successfully", async () => {
      const amount = 100;
      const txHash = "0x" + "a".repeat(64);

      const result = await deposit(
        strategyId,
        userId,
        amount,
        txHash,
        contractAddress,
      );

      expect(result.success).toBe(true);
      expect(result.treasury.availableBalance).toBe(amount);
      expect(result.treasury.totalDeposited).toBe(amount);
      expect(result.transaction.type).toBe("DEPOSIT");
      expect(result.transaction.amount).toBe(amount);
      expect(result.transaction.txHash).toBe(txHash);
    });

    it("should handle multiple deposits correctly", async () => {
      const txHash1 = "0x" + "a".repeat(64);
      const txHash2 = "0x" + "b".repeat(64);

      await deposit(strategyId, userId, 50, txHash1, contractAddress);
      const result = await deposit(strategyId, userId, 75, txHash2, contractAddress);

      expect(result.treasury.availableBalance).toBe(125);
      expect(result.treasury.totalDeposited).toBe(125);
    });

    it("should reject negative deposit amount", async () => {
      const txHash = "0x" + "a".repeat(64);

      await expect(
        deposit(strategyId, userId, -50, txHash, contractAddress),
      ).rejects.toThrow("Deposit amount must be positive");
    });

    it("should reject zero deposit amount", async () => {
      const txHash = "0x" + "a".repeat(64);

      await expect(
        deposit(strategyId, userId, 0, txHash, contractAddress),
      ).rejects.toThrow("Deposit amount must be positive");
    });

    it("should record transaction with correct balance snapshots", async () => {
      const txHash = "0x" + "a".repeat(64);

      const result = await deposit(strategyId, userId, 100, txHash, contractAddress);

      expect(result.transaction.balanceBefore).toBe(0);
      expect(result.transaction.balanceAfter).toBe(100);
    });
  });

  describe("withdraw", () => {
    beforeEach(async () => {
      // Deposit initial funds
      const txHash = "0x" + "a".repeat(64);
      await deposit(strategyId, userId, 200, txHash, contractAddress);
    });

    it("should process a withdrawal successfully", async () => {
      const result = await withdraw(strategyId, userId, 50);

      expect(result.success).toBe(true);
      expect(result.treasury.availableBalance).toBe(150);
      expect(result.treasury.totalWithdrawn).toBe(50);
      expect(result.transaction.type).toBe("WITHDRAW");
      expect(result.transaction.amount).toBe(-50);
    });

    it("should reject withdrawal exceeding available balance", async () => {
      await expect(
        withdraw(strategyId, userId, 250),
      ).rejects.toThrow("Insufficient balance");
    });

    it("should reject negative withdrawal amount", async () => {
      await expect(
        withdraw(strategyId, userId, -50),
      ).rejects.toThrow("Withdrawal amount must be positive");
    });

    it("should handle withdrawal with txHash", async () => {
      const txHash = "0x" + "b".repeat(64);
      const result = await withdraw(strategyId, userId, 50, txHash);

      expect(result.transaction.txHash).toBe(txHash);
      expect(result.transaction.status).toBe("COMPLETED");
    });

    it("should mark withdrawal as pending without txHash", async () => {
      const result = await withdraw(strategyId, userId, 50);

      expect(result.transaction.status).toBe("PENDING");
    });
  });

  describe("adjustBalance", () => {
    beforeEach(async () => {
      // Deposit initial funds
      const txHash = "0x" + "a".repeat(64);
      await deposit(strategyId, userId, 200, txHash, contractAddress);
    });

    it("should lock balance when opening a trade", async () => {
      const result = await adjustBalance(strategyId, userId, {
        amount: 50,
        type: "TRADE_OPEN",
        description: "Opening BUY trade",
      });

      expect(result.treasury.availableBalance).toBe(150);
      expect(result.treasury.lockedBalance).toBe(50);
    });

    it("should unlock balance when closing a trade", async () => {
      // First lock funds
      await adjustBalance(strategyId, userId, {
        amount: 50,
        type: "TRADE_OPEN",
        description: "Opening BUY trade",
      });

      // Then unlock
      const result = await adjustBalance(strategyId, userId, {
        amount: 50,
        type: "TRADE_CLOSE",
        description: "Closing BUY trade",
      });

      expect(result.treasury.availableBalance).toBe(200);
      expect(result.treasury.lockedBalance).toBe(0);
    });

    it("should record profit correctly", async () => {
      const result = await adjustBalance(strategyId, userId, {
        amount: 25,
        type: "PROFIT",
        description: "Profit from closed trade",
      });

      expect(result.treasury.totalProfits).toBe(25);
      expect(result.treasury.availableBalance).toBe(225);
      expect(result.treasury.netProfitLoss).toBe(25);
    });

    it("should record loss correctly", async () => {
      const result = await adjustBalance(strategyId, userId, {
        amount: 15,
        type: "LOSS",
        description: "Loss from closed trade",
      });

      expect(result.treasury.totalLosses).toBe(15);
      expect(result.treasury.availableBalance).toBe(185);
      expect(result.treasury.netProfitLoss).toBe(-15);
    });

    it("should calculate net P/L correctly with multiple trades", async () => {
      await adjustBalance(strategyId, userId, {
        amount: 30,
        type: "PROFIT",
        description: "Profit 1",
      });

      await adjustBalance(strategyId, userId, {
        amount: 10,
        type: "LOSS",
        description: "Loss 1",
      });

      const result = await adjustBalance(strategyId, userId, {
        amount: 20,
        type: "PROFIT",
        description: "Profit 2",
      });

      expect(result.treasury.totalProfits).toBe(50);
      expect(result.treasury.totalLosses).toBe(10);
      expect(result.treasury.netProfitLoss).toBe(40);
    });

    it("should reject trade opening with insufficient balance", async () => {
      await expect(
        adjustBalance(strategyId, userId, {
          amount: 250,
          type: "TRADE_OPEN",
          description: "Opening large trade",
        }),
      ).rejects.toThrow("Insufficient available balance");
    });

    it("should handle refund correctly", async () => {
      const result = await adjustBalance(strategyId, userId, {
        amount: 10,
        type: "REFUND",
        description: "Refund for failed trade",
      });

      expect(result.treasury.availableBalance).toBe(210);
    });
  });

  describe("getBalance", () => {
    it("should retrieve treasury balance", async () => {
      const txHash = "0x" + "a".repeat(64);
      await deposit(strategyId, userId, 100, txHash, contractAddress);

      const treasury = await getBalance(strategyId, userId);

      expect(treasury.availableBalance).toBe(100);
      expect(treasury.totalDeposited).toBe(100);
    });

    it("should throw error for non-existent treasury", async () => {
      const fakeStrategyId = new mongoose.Types.ObjectId();

      await expect(
        getBalance(fakeStrategyId, userId),
      ).rejects.toThrow("Treasury not found");
    });
  });

  describe("getUserTreasuries", () => {
    it("should retrieve all treasuries for a user", async () => {
      // Create another strategy
      const strategy2 = await Strategy.create({
        userId,
        name: "Strategy 2",
        timeframe: "1h",
        amount: 50,
        status: "ACTIVE",
      });

      // Deposit to both strategies
      const txHash1 = "0x" + "a".repeat(64);
      const txHash2 = "0x" + "b".repeat(64);

      await deposit(strategyId, userId, 100, txHash1, contractAddress);
      await deposit(strategy2._id, userId, 50, txHash2, contractAddress);

      const treasuries = await getUserTreasuries(userId);

      expect(treasuries).toHaveLength(2);
      expect(treasuries[0].availableBalance).toBeGreaterThanOrEqual(50);
    });

    it("should return empty array for user with no treasuries", async () => {
      const newUser = await User.create({
        email: "new@example.com",
        password: "password123",
        firstName: "New",
        lastName: "User",
      });

      const treasuries = await getUserTreasuries(newUser._id);

      expect(treasuries).toHaveLength(0);
    });
  });

  describe("getTransactionHistory", () => {
    beforeEach(async () => {
      const txHash = "0x" + "a".repeat(64);
      await deposit(strategyId, userId, 200, txHash, contractAddress);
      await withdraw(strategyId, userId, 50);
      await adjustBalance(strategyId, userId, {
        amount: 30,
        type: "PROFIT",
        description: "Profit",
      });
    });

    it("should retrieve transaction history", async () => {
      const { transactions, total } = await getTransactionHistory(
        strategyId,
        userId,
      );

      expect(transactions.length).toBeGreaterThan(0);
      expect(total).toBeGreaterThan(0);
    });

    it("should filter by transaction type", async () => {
      const { transactions } = await getTransactionHistory(
        strategyId,
        userId,
        { type: "DEPOSIT" },
      );

      expect(transactions.every((tx) => tx.type === "DEPOSIT")).toBe(true);
    });

    it("should respect limit and skip parameters", async () => {
      const { transactions } = await getTransactionHistory(
        strategyId,
        userId,
        { limit: 1, skip: 1 },
      );

      expect(transactions).toHaveLength(1);
    });
  });

  describe("getTransactionSummary", () => {
    beforeEach(async () => {
      const txHash = "0x" + "a".repeat(64);
      await deposit(strategyId, userId, 200, txHash, contractAddress);
      await withdraw(strategyId, userId, 50);
      await adjustBalance(strategyId, userId, {
        amount: 30,
        type: "PROFIT",
        description: "Profit",
      });
      await adjustBalance(strategyId, userId, {
        amount: 10,
        type: "LOSS",
        description: "Loss",
      });
    });

    it("should calculate transaction summary correctly", async () => {
      const summary = await getTransactionSummary(strategyId, userId);

      expect(summary.totalDeposits).toBe(200);
      expect(summary.totalWithdrawals).toBe(50);
      expect(summary.totalProfits).toBe(30);
      expect(summary.totalLosses).toBe(10);
      expect(summary.transactionCount).toBeGreaterThan(0);
    });
  });

  describe("validateSufficientBalance", () => {
    beforeEach(async () => {
      const txHash = "0x" + "a".repeat(64);
      await deposit(strategyId, userId, 100, txHash, contractAddress);
    });

    it("should return true for sufficient balance", async () => {
      const result = await validateSufficientBalance(strategyId, 50);
      expect(result).toBe(true);
    });

    it("should return false for insufficient balance", async () => {
      const result = await validateSufficientBalance(strategyId, 150);
      expect(result).toBe(false);
    });

    it("should return false for non-existent treasury", async () => {
      const fakeStrategyId = new mongoose.Types.ObjectId();
      const result = await validateSufficientBalance(fakeStrategyId, 50);
      expect(result).toBe(false);
    });
  });

  describe("Concurrent Operations", () => {
    it("should handle concurrent deposits atomically", async () => {
      const deposits = [
        deposit(strategyId, userId, 50, "0x" + "a".repeat(64), contractAddress),
        deposit(strategyId, userId, 75, "0x" + "b".repeat(64), contractAddress),
        deposit(strategyId, userId, 25, "0x" + "c".repeat(64), contractAddress),
      ];

      await Promise.all(deposits);

      const treasury = await getBalance(strategyId, userId);
      expect(treasury.totalDeposited).toBe(150);
      expect(treasury.availableBalance).toBe(150);
    });

    it("should handle concurrent withdrawals atomically", async () => {
      // First deposit funds
      const txHash = "0x" + "a".repeat(64);
      await deposit(strategyId, userId, 200, txHash, contractAddress);

      // Then attempt concurrent withdrawals
      const withdrawals = [
        withdraw(strategyId, userId, 30),
        withdraw(strategyId, userId, 40),
        withdraw(strategyId, userId, 50),
      ];

      await Promise.all(withdrawals);

      const treasury = await getBalance(strategyId, userId);
      expect(treasury.totalWithdrawn).toBe(120);
      expect(treasury.availableBalance).toBe(80);
    });
  });

  describe("Edge Cases", () => {
    it("should handle very small amounts", async () => {
      const txHash = "0x" + "a".repeat(64);
      const result = await deposit(strategyId, userId, 0.001, txHash, contractAddress);

      expect(result.treasury.availableBalance).toBe(0.001);
    });

    it("should handle large amounts", async () => {
      const txHash = "0x" + "a".repeat(64);
      const largeAmount = 1000000;
      const result = await deposit(
        strategyId,
        userId,
        largeAmount,
        txHash,
        contractAddress,
      );

      expect(result.treasury.availableBalance).toBe(largeAmount);
    });

    it("should maintain balance integrity after multiple operations", async () => {
      const txHash = "0x" + "a".repeat(64);
      await deposit(strategyId, userId, 1000, txHash, contractAddress);
      
      // Multiple operations
      await adjustBalance(strategyId, userId, {
        amount: 100,
        type: "TRADE_OPEN",
        description: "Open trade",
      });
      await adjustBalance(strategyId, userId, {
        amount: 50,
        type: "PROFIT",
        description: "Profit",
      });
      await adjustBalance(strategyId, userId, {
        amount: 100,
        type: "TRADE_CLOSE",
        description: "Close trade",
      });
      await withdraw(strategyId, userId, 200);

      const treasury = await getBalance(strategyId, userId);
      const expectedBalance = 1000 + 50 - 200;
      
      expect(treasury.availableBalance).toBe(expectedBalance);
      expect(treasury.lockedBalance).toBe(0);
    });
  });
});
