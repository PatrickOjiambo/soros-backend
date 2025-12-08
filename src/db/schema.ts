import mongoose, { Document, Schema } from "mongoose";
import bcrypt from "bcryptjs";

/**
 * User Interface - Extensible design for easy field additions
 * Add new fields here and in the schema below
 */
export interface IUser extends Document {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  isEmailVerified: boolean;
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
  getFullName(): string;
}

/**
 * User Schema - Scalable design with hooks and methods
 */
const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
      validate: {
        validator: function (v: string) {
          return /^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/.test(v);
        },
        message: "Please enter a valid email address",
      },
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      select: false, // Don't return password by default in queries
    },
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
      minlength: [2, "First name must be at least 2 characters"],
      maxlength: [50, "First name cannot exceed 50 characters"],
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
      minlength: [2, "Last name must be at least 2 characters"],
      maxlength: [50, "Last name cannot exceed 50 characters"],
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
    toJSON: {
      transform: function (doc, ret) {
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
  },
);

// Additional indexes (email index already defined in field definition)
userSchema.index({ createdAt: -1 });

/**
 * Pre-save hook: Hash password before saving
 * Only hash if password is modified or new
 */
userSchema.pre("save", async function () {
  if (!this.isModified("password")) {
    return;
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

/**
 * Instance method: Compare password for login
 */
userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    return false;
  }
};

/**
 * Instance method: Get user's full name
 */
userSchema.methods.getFullName = function (): string {
  return `${this.firstName} ${this.lastName}`;
};

/**
 * Static method example: Find user by email (including password field)
 */
userSchema.statics.findByEmail = function (email: string) {
  return this.findOne({ email }).select("+password");
};

// Export the model
export const User = mongoose.model<IUser>("User", userSchema);

/**
 * Indicator Interface
 */
export interface IIndicator extends Document {
  name: string;
  abbreviation: string;
  category: "Trend" | "Momentum" | "Volatility" | "Volume";
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Indicator Schema
 */
const indicatorSchema = new Schema<IIndicator>(
  {
    name: {
      type: String,
      required: [true, "Indicator name is required"],
      trim: true,
      unique: true,
    },
    abbreviation: {
      type: String,
      required: [true, "Indicator abbreviation is required"],
      trim: true,
      uppercase: true,
    },
    category: {
      type: String,
      required: [true, "Indicator category is required"],
      enum: {
        values: ["Trend", "Momentum", "Volatility", "Volume"],
        message: "Category must be one of: Trend, Momentum, Volatility, Volume",
      },
    },
    description: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

// Index for efficient queries
indicatorSchema.index({ category: 1 });
indicatorSchema.index({ name: 1 });

export const Indicator = mongoose.model<IIndicator>("Indicator", indicatorSchema);

/**
 * Strategy Interface
 */
export interface IStrategy extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  refinedDescription?: string; // AI-refined strategy steps
  indicators: mongoose.Types.ObjectId[];
  timeframe: string;
  amount: number;
  status: "ACTIVE" | "INACTIVE";
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Strategy Schema
 */
const strategySchema = new Schema<IStrategy>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
      index: true,
    },
    name: {
      type: String,
      required: [true, "Strategy name is required"],
      trim: true,
      minlength: [3, "Strategy name must be at least 3 characters"],
      maxlength: [100, "Strategy name cannot exceed 100 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, "Description cannot exceed 1000 characters"],
    },
    refinedDescription: {
      type: String,
      trim: true,
      maxlength: [5000, "Refined description cannot exceed 5000 characters"],
    },
    indicators: [
      {
        type: Schema.Types.ObjectId,
        ref: "Indicator",
      },
    ],
    timeframe: {
      type: String,
      required: [true, "Timeframe is required"],
      enum: {
        values: ["1m", "5m", "15m", "30m", "1h", "4h", "1d", "1w"],
        message: "Invalid timeframe",
      },
    },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      // min: [1, "Amount must be at least 1"],
      // validate: {
      //   validator: function (v: number) {
      //     return v > 0;
      //   },
      //   message: "Amount must be positive",
      // },
    },
    status: {
      type: String,
      enum: {
        values: ["ACTIVE", "INACTIVE"],
        message: "Status must be either ACTIVE or INACTIVE",
      },
      default: "INACTIVE",
    },
  },
  {
    timestamps: true,
  },
);

// Indexes for efficient queries
// strategySchema.index({ userId: 1, status: 1 });
// strategySchema.index({ createdAt: -1 });

export const Strategy = mongoose.model<IStrategy>("Strategy", strategySchema);

/**
 * Trade Interface
 * 
 * Tracks trade signals generated by the AI agents
 */
export interface ITrade extends Document {
  userId: mongoose.Types.ObjectId;
  strategyId: mongoose.Types.ObjectId;
  signal: "BUY" | "SELL" | "HOLD";
  entry: number;
  exit: number;
  stopLoss: number;
  reasoning: string;
  confidence: "VERY_WEAK" | "WEAK" | "MODERATE" | "STRONG" | "VERY_STRONG";
  riskRewardRatio: number;
  amount: number;
  status: "PENDING" | "PLACED" | "FAILED" | "CANCELLED";
  
  // Analysis context
  marketCondition: string;
  toolsUsed: string[];
  
  // 1inch specific fields
  txHash?: string;
  executedAt?: Date;
  executedPrice?: number;
  
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Trade Schema
 */
const tradeSchema = new Schema<ITrade>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
      index: true,
    },
    strategyId: {
      type: Schema.Types.ObjectId,
      ref: "Strategy",
      required: [true, "Strategy ID is required"],
      index: true,
    },
    signal: {
      type: String,
      required: [true, "Signal is required"],
      enum: {
        values: ["BUY", "SELL", "HOLD"],
        message: "Signal must be BUY, SELL, or HOLD",
      },
    },
    entry: {
      type: Number,
      required: [true, "Entry price is required"],
      min: [0, "Entry price must be positive"],
    },
    exit: {
      type: Number,
      required: [true, "Exit price is required"],
      min: [0, "Exit price must be positive"],
    },
    stopLoss: {
      type: Number,
      required: [true, "Stop loss is required"],
      min: [0, "Stop loss must be positive"],
    },
    reasoning: {
      type: String,
      required: [true, "Reasoning is required"],
      trim: true,
      maxlength: [2000, "Reasoning cannot exceed 2000 characters"],
    },
    confidence: {
      type: String,
      required: [true, "Confidence is required"],
      enum: {
        values: ["VERY_WEAK", "WEAK", "MODERATE", "STRONG", "VERY_STRONG"],
        message: "Invalid confidence level",
      },
    },
    riskRewardRatio: {
      type: Number,
      required: [true, "Risk/reward ratio is required"],
      min: [0, "Risk/reward ratio must be positive"],
    },
    amount: {
      type: Number,
      required: [true, "Trade amount is required"],
      min: [0, "Amount must be positive"],
    },
    status: {
      type: String,
      required: [true, "Status is required"],
      enum: {
        values: ["PENDING", "PLACED", "FAILED", "CANCELLED"],
        message: "Invalid status",
      },
      default: "PENDING",
    },
    marketCondition: {
      type: String,
      required: [true, "Market condition is required"],
      trim: true,
    },
    toolsUsed: [
      {
        type: String,
        trim: true,
      },
    ],
    txHash: {
      type: String,
      trim: true,
    },
    executedAt: {
      type: Date,
    },
    executedPrice: {
      type: Number,
      min: [0, "Executed price must be positive"],
    },
  },
  {
    timestamps: true,
  },
);

// Indexes for efficient queries
tradeSchema.index({ userId: 1, status: 1 });
tradeSchema.index({ strategyId: 1, status: 1 });
tradeSchema.index({ createdAt: -1 });
tradeSchema.index({ status: 1, createdAt: -1 });

export const Trade = mongoose.model<ITrade>("Trade", tradeSchema);

/**
 * Treasury Interface
 * 
 * Tracks the balance allocated to each trading strategy
 * Provides a single source of truth for strategy funding
 */
export interface ITreasury extends Document {
  strategyId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  
  // Balance tracking
  totalDeposited: number; // Total WETH deposited to this strategy
  totalWithdrawn: number; // Total WETH withdrawn from this strategy
  availableBalance: number; // Current available balance (totalDeposited - totalWithdrawn + profits - losses)
  lockedBalance: number; // Balance locked in active trades
  
  // Profit/Loss tracking
  totalProfits: number; // Cumulative profits from closed trades
  totalLosses: number; // Cumulative losses from closed trades
  netProfitLoss: number; // totalProfits - totalLosses
  
  // Blockchain tracking
  contractAddress: string; // EVM contract address
  lastDepositTxHash?: string; // Last deposit transaction hash
  lastWithdrawTxHash?: string; // Last withdrawal transaction hash
  
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Treasury Schema
 */
const treasurySchema = new Schema<ITreasury>(
  {
    strategyId: {
      type: Schema.Types.ObjectId,
      ref: "Strategy",
      required: [true, "Strategy ID is required"],
      unique: true, // One treasury per strategy
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
      index: true,
    },
    totalDeposited: {
      type: Number,
      required: true,
      default: 0,
      min: [0, "Total deposited cannot be negative"],
    },
    totalWithdrawn: {
      type: Number,
      required: true,
      default: 0,
      min: [0, "Total withdrawn cannot be negative"],
    },
    availableBalance: {
      type: Number,
      required: true,
      default: 0,
      min: [0, "Available balance cannot be negative"],
    },
    lockedBalance: {
      type: Number,
      required: true,
      default: 0,
      min: [0, "Locked balance cannot be negative"],
    },
    totalProfits: {
      type: Number,
      required: true,
      default: 0,
      min: [0, "Total profits cannot be negative"],
    },
    totalLosses: {
      type: Number,
      required: true,
      default: 0,
      min: [0, "Total losses cannot be negative"],
    },
    netProfitLoss: {
      type: Number,
      required: true,
      default: 0,
    },
    contractAddress: {
      type: String,
      required: [true, "Contract address is required"],
      trim: true,
      validate: {
        validator: function (v: string) {
          return /^0x[a-fA-F0-9]{40}$/.test(v);
        },
        message: "Invalid Ethereum address format",
      },
    },
    lastDepositTxHash: {
      type: String,
      trim: true,
      validate: {
        validator: function (v: string) {
          return /^0x[a-fA-F0-9]{64}$/.test(v);
        },
        message: "Invalid transaction hash format",
      },
    },
    lastWithdrawTxHash: {
      type: String,
      trim: true,
      validate: {
        validator: function (v: string) {
          return /^0x[a-fA-F0-9]{64}$/.test(v);
        },
        message: "Invalid transaction hash format",
      },
    },
  },
  {
    timestamps: true,
  },
);

// Compound indexes for efficient queries
treasurySchema.index({ userId: 1, availableBalance: -1 });
treasurySchema.index({ strategyId: 1 }, { unique: true });

export const Treasury = mongoose.model<ITreasury>("Treasury", treasurySchema);

/**
 * Transaction Interface
 * 
 * Complete audit trail for all treasury operations
 * Immutable record of every balance change
 */
export interface ITransaction extends Document {
  userId: mongoose.Types.ObjectId;
  strategyId: mongoose.Types.ObjectId;
  treasuryId: mongoose.Types.ObjectId;
  
  type: "DEPOSIT" | "WITHDRAW" | "TRADE_OPEN" | "TRADE_CLOSE" | "PROFIT" | "LOSS" | "REFUND" | "ADJUSTMENT";
  amount: number;
  
  // Balance snapshots (for reconciliation)
  balanceBefore: number;
  balanceAfter: number;
  
  // References
  tradeId?: mongoose.Types.ObjectId; // If related to a trade
  txHash?: string; // Blockchain transaction hash
  
  // Metadata
  description: string;
  metadata?: Record<string, any>; // Flexible field for additional data
  
  status: "PENDING" | "COMPLETED" | "FAILED" | "REVERSED";
  
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Transaction Schema
 */
const transactionSchema = new Schema<ITransaction>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
      index: true,
    },
    strategyId: {
      type: Schema.Types.ObjectId,
      ref: "Strategy",
      required: [true, "Strategy ID is required"],
      index: true,
    },
    treasuryId: {
      type: Schema.Types.ObjectId,
      ref: "Treasury",
      required: [true, "Treasury ID is required"],
      index: true,
    },
    type: {
      type: String,
      required: [true, "Transaction type is required"],
      enum: {
        values: ["DEPOSIT", "WITHDRAW", "TRADE_OPEN", "TRADE_CLOSE", "PROFIT", "LOSS", "REFUND", "ADJUSTMENT"],
        message: "Invalid transaction type",
      },
      index: true,
    },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      validate: {
        validator: function (v: number) {
          return v !== 0;
        },
        message: "Amount cannot be zero",
      },
    },
    balanceBefore: {
      type: Number,
      required: [true, "Balance before is required"],
      min: [0, "Balance cannot be negative"],
    },
    balanceAfter: {
      type: Number,
      required: [true, "Balance after is required"],
      min: [0, "Balance cannot be negative"],
    },
    tradeId: {
      type: Schema.Types.ObjectId,
      ref: "Trade",
    },
    txHash: {
      type: String,
      trim: true,
      validate: {
        validator: function (v: string) {
          return /^0x[a-fA-F0-9]{64}$/.test(v);
        },
        message: "Invalid transaction hash format",
      },
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
    status: {
      type: String,
      required: [true, "Status is required"],
      enum: {
        values: ["PENDING", "COMPLETED", "FAILED", "REVERSED"],
        message: "Invalid status",
      },
      default: "COMPLETED",
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

// Compound indexes for efficient queries
transactionSchema.index({ userId: 1, createdAt: -1 });
transactionSchema.index({ strategyId: 1, type: 1, createdAt: -1 });
transactionSchema.index({ treasuryId: 1, createdAt: -1 });
transactionSchema.index({ type: 1, status: 1, createdAt: -1 });
transactionSchema.index({ txHash: 1 }, { sparse: true });

export const Transaction = mongoose.model<ITransaction>("Transaction", transactionSchema);
