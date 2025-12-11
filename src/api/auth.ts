import express, { Request, Response, NextFunction, Router } from "express";
import { z } from "zod";
import { AuthService, signupSchema, loginSchema } from "../lib/auth";
import { authenticate, authLimiter } from "../middlewares";
import logger from "../lib/logger";

const router: Router = express.Router();

/**
 * POST /api/v1/auth/signup
 * Register a new user
 */
router.post("/signup", authLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validate request body
    const validatedData = signupSchema.parse(req.body);

    // Register user
    const { user, token } = await AuthService.signup(validatedData);

    logger.info({ userId: user._id }, "User signed up successfully");

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: `${user.firstName} ${user.lastName}`,
          isEmailVerified: user.isEmailVerified,
          createdAt: user.createdAt,
        },
        token,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: error.issues.map(err => ({
          field: err.path.join("."),
          message: err.message,
        })),
      });
    }

    if (error instanceof Error) {
      if (error.message === "User with this email already exists") {
        return res.status(409).json({
          success: false,
          message: error.message,
        });
      }

      logger.error({ error: error.message }, "Signup error");
      return res.status(500).json({
        success: false,
        message: "Failed to register user",
        error: error.message,
      });
    }

    next(error);
  }
});

/**
 * POST /api/v1/auth/login
 * Login user with email and password
 */
router.post("/login", authLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validate request body
    const validatedData = loginSchema.parse(req.body);

    // Login user
    const { user, token } = await AuthService.login(validatedData);

    logger.info({ userId: user._id }, "User logged in successfully");

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: `${user.firstName} ${user.lastName}`,
          isEmailVerified: user.isEmailVerified,
          lastLogin: user.lastLogin,
        },
        token,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: error.issues.map(err => ({
          field: err.path.join("."),
          message: err.message,
        })),
      });
    }

    if (error instanceof Error) {
      if (
        error.message === "Invalid email or password" 
        || error.message === "Account is deactivated"
      ) {
        return res.status(401).json({
          success: false,
          message: error.message,
        });
      }

      logger.error({ error: error.message }, "Login error");
      return res.status(500).json({
        success: false,
        message: "Failed to login",
        error: error.message,
      });
    }

    next(error);
  }
});

/**
 * GET /api/v1/auth/me
 * Get current authenticated user's profile
 * Requires authentication middleware
 */
router.get("/me", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    // User is attached to req by auth middleware
    const userId = (req as any).user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const user = await AuthService.getUserById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: `${user.firstName} ${user.lastName}`,
          isEmailVerified: user.isEmailVerified,
          isActive: user.isActive,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      },
    });
  } catch (error) {
    logger.error({ error }, "Failed to get user profile");
    next(error);
  }
});

export default router;
