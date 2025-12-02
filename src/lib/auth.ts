import jwt from "jsonwebtoken";
import { z } from "zod";
import { env } from "../env";
import { User, IUser } from "../db/schema";
import logger from "./logger";

/**
 * Validation Schemas
 */
export const signupSchema = z.object({
  email: z.email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  firstName: z
    .string()
    .min(2, "First name must be at least 2 characters")
    .max(50, "First name cannot exceed 50 characters"),
  lastName: z
    .string()
    .min(2, "Last name must be at least 2 characters")
    .max(50, "Last name cannot exceed 50 characters"),
});

export const loginSchema = z.object({
  email: z.email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

/**
 * JWT Token Payload
 */
export interface TokenPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

/**
 * Authentication Service
 */
export class AuthService {
  /**
   * Generate JWT access token
   */
  static generateToken(user: IUser): string {
    const payload: TokenPayload = {
      userId: user._id.toString(),
      email: user.email,
    };

    return jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN || "7d",
    });
  }

  /**
   * Verify JWT token
   */
  static verifyToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, env.JWT_SECRET) as TokenPayload;
    } catch (error) {
      logger.error({ error }, "Token verification failed");
      throw new Error("Invalid or expired token");
    }
  }

  /**
   * Register a new user
   */
  static async signup(data: SignupInput): Promise<{ user: IUser; token: string }> {
    try {
      // Validate input
      const validatedData = signupSchema.parse(data);

      // Check if user already exists
      const existingUser = await User.findOne({ email: validatedData.email });
      if (existingUser) {
        throw new Error("User with this email already exists");
      }

      // Create new user
      const user = new User({
        email: validatedData.email,
        password: validatedData.password,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
      });

      await user.save();

      logger.info({ userId: user._id, email: user.email }, "New user registered");

      // Generate token
      const token = this.generateToken(user);

      // Remove password from response
      const userObject = user.toObject();
      delete userObject.password;

      return { user: userObject as IUser, token };
    } catch (error) {
      logger.error({ error }, "Signup failed");
      throw error;
    }
  }

  /**
   * Login user
   */
  static async login(data: LoginInput): Promise<{ user: IUser; token: string }> {
    try {
      // Validate input
      const validatedData = loginSchema.parse(data);

      // Find user with password field
      const user = await User.findOne({ email: validatedData.email }).select("+password");

      if (!user) {
        throw new Error("Invalid email or password");
      }

      // Verify password first
      const isPasswordValid = await user.comparePassword(validatedData.password);
      if (!isPasswordValid) {
        throw new Error("Invalid email or password");
      }

      // Check if account is active after password is confirmed
      if (!user.isActive) {
        throw new Error("Account is deactivated");
      }

      // Update last login
      user.lastLogin = new Date();
      await user.save();

      logger.info({ userId: user._id, email: user.email }, "User logged in");

      // Generate token
      const token = this.generateToken(user);

      // Remove password from response
      const userObject = user.toObject();
      delete userObject.password;

      return { user: userObject as IUser, token };
    } catch (error) {
      logger.error({ error }, "Login failed");
      throw error;
    }
  }

  /**
   * Get user by ID
   */
  static async getUserById(userId: string): Promise<IUser | null> {
    try {
      const user = await User.findById(userId);
      return user;
    } catch (error) {
      logger.error({ error, userId }, "Failed to get user by ID");
      return null;
    }
  }

  /**
   * Validate user exists and is active
   */
  static async validateUser(userId: string): Promise<IUser> {
    const user = await User.findById(userId);
    
    if (!user) {
      throw new Error("User not found");
    }

    if (!user.isActive) {
      throw new Error("Account is deactivated");
    }

    return user;
  }
}
