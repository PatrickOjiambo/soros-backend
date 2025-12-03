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
      min: [1, "Amount must be at least 1"],
      validate: {
        validator: function (v: number) {
          return v > 0;
        },
        message: "Amount must be positive",
      },
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
strategySchema.index({ userId: 1, status: 1 });
strategySchema.index({ createdAt: -1 });

export const Strategy = mongoose.model<IStrategy>("Strategy", strategySchema);
