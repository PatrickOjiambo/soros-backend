import { z } from "zod";

/**
 * Strategy Validation Schemas
 */

export const createStrategySchema = z.object({
  name: z
    .string()
    .min(3, "Strategy name must be at least 3 characters")
    .max(100, "Strategy name cannot exceed 100 characters")
    .trim(),
  description: z
    .string()
    .max(1000, "Description cannot exceed 1000 characters")
    .trim()
    .optional(),
  indicators: z
    .array(z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid indicator ID"))
    .min(1, "At least one indicator is required")
    .max(20, "Cannot select more than 20 indicators"),
  timeframe: z.enum(["1m", "5m", "15m", "30m", "1h", "4h", "1d", "1w"], {
    message: "Invalid timeframe",
  }),
  amount: z
    .number()
    .default(0),
    // .positive("Amount must be positive")
    // .min(1, "Amount must be at least 1"),
});

export const updateStrategySchema = z.object({
  name: z
    .string()
    .min(3, "Strategy name must be at least 3 characters")
    .max(100, "Strategy name cannot exceed 100 characters")
    .trim()
    .optional(),
  description: z
    .string()
    .max(1000, "Description cannot exceed 1000 characters")
    .trim()
    .optional(),
  indicators: z
    .array(z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid indicator ID"))
    .min(1, "At least one indicator is required")
    .max(20, "Cannot select more than 20 indicators")
    .optional(),
  timeframe: z
    .enum(["1m", "5m", "15m", "30m", "1h", "4h", "1d", "1w"], {
      message: "Invalid timeframe",
    })
    .optional(),
  amount: z
    .number()
    .positive("Amount must be positive")
    .min(1, "Amount must be at least 1")
    .optional(),
  status: z.enum(["ACTIVE", "INACTIVE"], {
    message: "Status must be either ACTIVE or INACTIVE",
  }).optional(),
});

export const getIndicatorsByCategorySchema = z.object({
  category: z.enum(["Trend", "Momentum", "Volatility", "Volume"]).optional(),
});

export type CreateStrategyInput = z.infer<typeof createStrategySchema>;
export type UpdateStrategyInput = z.infer<typeof updateStrategySchema>;
export type GetIndicatorsByCategoryInput = z.infer<typeof getIndicatorsByCategorySchema>;
