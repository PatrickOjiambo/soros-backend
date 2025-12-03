import mongoose from "mongoose";
import { Strategy, Indicator, IStrategy } from "../db/schema";
import { CreateStrategyInput, UpdateStrategyInput } from "./validations";
import logger from "./logger";

export class StrategyService {
  /**
   * Create a new strategy
   */
  static async createStrategy(userId: string, data: CreateStrategyInput) {
    try {
      // Verify all indicators exist
      const indicators = await Indicator.find({ _id: { $in: data.indicators } });
      if (indicators.length !== data.indicators.length) {
        throw new Error("One or more invalid indicator IDs");
      }

      const strategy = new Strategy({
        userId,
        ...data,
        status: "INACTIVE", // Strategies start as inactive
      });

      await strategy.save();
      
      // Populate indicators before returning
      await strategy.populate("indicators");
      
      logger.info({ strategyId: strategy._id, userId }, "Strategy created");
      return strategy;
    } catch (error) {
      logger.error(error, "Error creating strategy");
      throw error;
    }
  }

  /**
   * Get all strategies for a user
   */
  static async getUserStrategies(userId: string) {
    try {
      const strategies = await Strategy.find({ userId })
        .populate("indicators")
        .sort({ createdAt: -1 });
      
      return strategies;
    } catch (error) {
      logger.error(error, "Error fetching user strategies");
      throw error;
    }
  }

  /**
   * Get a single strategy by ID
   */
  static async getStrategyById(strategyId: string, userId: string) {
    try {
      const strategy = await Strategy.findOne({ _id: strategyId, userId })
        .populate("indicators");
      
      if (!strategy) {
        throw new Error("Strategy not found");
      }

      return strategy;
    } catch (error) {
      logger.error(error, "Error fetching strategy");
      throw error;
    }
  }

  /**
   * Update a strategy
   */
  static async updateStrategy(
    strategyId: string,
    userId: string,
    data: UpdateStrategyInput,
  ) {
    try {
      // If indicators are being updated, verify they exist
      if (data.indicators) {
        const indicators = await Indicator.find({ _id: { $in: data.indicators } });
        if (indicators.length !== data.indicators.length) {
          throw new Error("One or more invalid indicator IDs");
        }
      }

      const strategy = await Strategy.findOneAndUpdate(
        { _id: strategyId, userId },
        { $set: data },
        { new: true, runValidators: true },
      ).populate("indicators");

      if (!strategy) {
        throw new Error("Strategy not found");
      }

      logger.info({ strategyId, userId }, "Strategy updated");
      return strategy;
    } catch (error) {
      logger.error(error, "Error updating strategy");
      throw error;
    }
  }

  /**
   * Delete a strategy
   */
  static async deleteStrategy(strategyId: string, userId: string) {
    try {
      const strategy = await Strategy.findOneAndDelete({ _id: strategyId, userId });

      if (!strategy) {
        throw new Error("Strategy not found");
      }

      logger.info({ strategyId, userId }, "Strategy deleted");
      return strategy;
    } catch (error) {
      logger.error(error, "Error deleting strategy");
      throw error;
    }
  }

  /**
   * Get all indicators
   */
  static async getAllIndicators(category?: string) {
    try {
      const query = category ? { category } : {};
      const indicators = await Indicator.find(query).sort({ category: 1, name: 1 });
      
      return indicators;
    } catch (error) {
      logger.error(error, "Error fetching indicators");
      throw error;
    }
  }
}
