import express, { Response, NextFunction, Router } from "express";
import { z } from "zod";
import { AuthRequest, authenticate } from "../middlewares";
import { StrategyService } from "../lib/strategy.service";
import {
  createStrategySchema,
  updateStrategySchema,
  getIndicatorsByCategorySchema,
} from "../lib/validations";
import logger from "../lib/logger";

const router: Router = express.Router();

/**
 * Validation middleware
 */
function validateRequest<T extends z.ZodType>(schema: T) {
  return async (req: express.Request, res: Response, next: NextFunction) => {
    try {
      const data = req.method === "GET" ? req.query : req.body;
      req.body = await schema.parseAsync(data);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: "Validation error",
          errors: error.issues.map((err) => ({
            field: err.path.join("."),
            message: err.message,
          })),
        });
      }
      next(error);
    }
  };
}

/**
 * GET /api/v1/strategies/indicators
 * Get all indicators, optionally filtered by category
 */
router.get(
  "/indicators",
  validateRequest(getIndicatorsByCategorySchema),
  async (req: express.Request, res: Response, next: NextFunction) => {
    try {
      const { category } = req.query;
      const indicators = await StrategyService.getAllIndicators(category as string);

      res.status(200).json({
        success: true,
        data: {
          indicators,
          count: indicators.length,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * POST /api/v1/strategies
 * Create a new trading strategy
 */
router.post(
  "/",
  authenticate,
  validateRequest(createStrategySchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const strategy = await StrategyService.createStrategy(userId, req.body);

      res.status(201).json({
        success: true,
        message: "Strategy created successfully",
        data: { strategy },
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes("invalid indicator")) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }
      next(error);
    }
  },
);

/**
 * GET /api/v1/strategies
 * Get all strategies for the authenticated user
 */
router.get(
  "/",
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const strategies = await StrategyService.getUserStrategies(userId);

      res.status(200).json({
        success: true,
        data: {
          strategies,
          count: strategies.length,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * GET /api/v1/strategies/:id
 * Get a specific strategy by ID
 */
router.get(
  "/:id",
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;

      const strategy = await StrategyService.getStrategyById(id, userId);

      res.status(200).json({
        success: true,
        data: { strategy },
      });
    } catch (error) {
      if (error instanceof Error && error.message === "Strategy not found") {
        return res.status(404).json({
          success: false,
          message: "Strategy not found",
        });
      }
      next(error);
    }
  },
);

/**
 * PUT /api/v1/strategies/:id
 * Update a strategy
 */
router.put(
  "/:id",
  authenticate,
  validateRequest(updateStrategySchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;

      const strategy = await StrategyService.updateStrategy(id, userId, req.body);

      res.status(200).json({
        success: true,
        message: "Strategy updated successfully",
        data: { strategy },
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "Strategy not found") {
          return res.status(404).json({
            success: false,
            message: "Strategy not found",
          });
        }
        if (error.message.includes("invalid indicator")) {
          return res.status(400).json({
            success: false,
            message: error.message,
          });
        }
      }
      next(error);
    }
  },
);

/**
 * DELETE /api/v1/strategies/:id
 * Delete a strategy
 */
router.delete(
  "/:id",
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;

      await StrategyService.deleteStrategy(id, userId);

      res.status(200).json({
        success: true,
        message: "Strategy deleted successfully",
      });
    } catch (error) {
      if (error instanceof Error && error.message === "Strategy not found") {
        return res.status(404).json({
          success: false,
          message: "Strategy not found",
        });
      }
      next(error);
    }
  },
);

export default router;
