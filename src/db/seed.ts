import mongoose from "mongoose";
import { Indicator } from "../db/schema";
import { env } from "../env";
import logger from "../lib/logger";

const indicators = [
  // Trend Indicators
  { name: "Absolute Price Oscillator", abbreviation: "APO", category: "Trend" },
  { name: "Aroon Indicator", abbreviation: "AROON", category: "Trend" },
  { name: "Balance of Power", abbreviation: "BOP", category: "Trend" },
  { name: "Chande Forecast Oscillator", abbreviation: "CFO", category: "Trend" },
  { name: "Community Channel Index", abbreviation: "CCI", category: "Trend" },
  { name: "Double Exponential Moving Average", abbreviation: "DEMA", category: "Trend" },
  { name: "Exponential Moving Average", abbreviation: "EMA", category: "Trend" },
  { name: "Mass Index", abbreviation: "MI", category: "Trend" },
  { name: "Moving Average Convergence Divergence", abbreviation: "MACD", category: "Trend" },
  { name: "Moving Max", abbreviation: "MMAX", category: "Trend" },
  { name: "Moving Min", abbreviation: "MMIN", category: "Trend" },
  { name: "Moving Sum", abbreviation: "MSUM", category: "Trend" },
  { name: "Parabolic SAR", abbreviation: "PSAR", category: "Trend" },
  { name: "Qstick", abbreviation: "QSTICK", category: "Trend" },
  { name: "Random Index", abbreviation: "KDJ", category: "Trend" },
  { name: "Rolling Moving Average", abbreviation: "RMA", category: "Trend" },
  { name: "Simple Moving Average", abbreviation: "SMA", category: "Trend" },
  { name: "Since Change", abbreviation: "SC", category: "Trend" },
  { name: "Triple Exponential Moving Average", abbreviation: "TEMA", category: "Trend" },
  { name: "Triangular Moving Average", abbreviation: "TRIMA", category: "Trend" },
  { name: "Triple Exponential Average", abbreviation: "TRIX", category: "Trend" },
  { name: "Typical Price", abbreviation: "TP", category: "Trend" },
  { name: "Volume Weighted Moving Average", abbreviation: "VWMA", category: "Trend" },
  { name: "Vortex Indicator", abbreviation: "VI", category: "Trend" },

  // Momentum Indicators
  { name: "Awesome Oscillator", abbreviation: "AO", category: "Momentum" },
  { name: "Chaikin Oscillator", abbreviation: "CMO", category: "Momentum" },
  { name: "Ichimoku Cloud", abbreviation: "ICHIMOKU", category: "Momentum" },
  { name: "Percentage Price Oscillator", abbreviation: "PPO", category: "Momentum" },
  { name: "Percentage Volume Oscillator", abbreviation: "PVO", category: "Momentum" },
  { name: "Price Rate of Change", abbreviation: "ROC", category: "Momentum" },
  { name: "Relative Strength Index", abbreviation: "RSI", category: "Momentum" },
  { name: "Stochastic Oscillator", abbreviation: "STOCH", category: "Momentum" },
  { name: "Williams R", abbreviation: "WILLR", category: "Momentum" },

  // Volatility Indicators
  { name: "Acceleration Bands", abbreviation: "AB", category: "Volatility" },
  { name: "Average True Range", abbreviation: "ATR", category: "Volatility" },
  { name: "Bollinger Bands", abbreviation: "BB", category: "Volatility" },
  { name: "Bollinger Band Width", abbreviation: "BBW", category: "Volatility" },
  { name: "Chandelier Exit", abbreviation: "CE", category: "Volatility" },
  { name: "Donchian Channel", abbreviation: "DC", category: "Volatility" },
  { name: "Keltner Channel", abbreviation: "KC", category: "Volatility" },
  { name: "Moving Standard Deviation", abbreviation: "MSTD", category: "Volatility" },
  { name: "Projection Oscillator", abbreviation: "PO", category: "Volatility" },
  { name: "True Range", abbreviation: "TR", category: "Volatility" },
  { name: "Ulcer Index", abbreviation: "UI", category: "Volatility" },

  // Volume Indicators
  { name: "Accumulation/Distribution", abbreviation: "AD", category: "Volume" },
  { name: "Chaikin Money Flow", abbreviation: "CMF", category: "Volume" },
  { name: "Ease of Movement", abbreviation: "EMV", category: "Volume" },
  { name: "Force Index", abbreviation: "FI", category: "Volume" },
  { name: "Money Flow Index", abbreviation: "MFI", category: "Volume" },
  { name: "Negative Volume Index", abbreviation: "NVI", category: "Volume" },
  { name: "On-Balance Volume", abbreviation: "OBV", category: "Volume" },
  { name: "Volume Price Trend", abbreviation: "VPT", category: "Volume" },
  { name: "Volume Weighted Average Price", abbreviation: "VWAP", category: "Volume" },
];

async function seedIndicators() {
  try {
    // Connect to MongoDB
    await mongoose.connect(env.MONGODB_URI);
    logger.info("Connected to MongoDB");

    // Clear existing indicators
    await Indicator.deleteMany({});
    logger.info("Cleared existing indicators");

    // Insert indicators
    const result = await Indicator.insertMany(indicators);
    logger.info(`Successfully seeded ${result.length} indicators`);

    // Display counts by category
    const trendCount = result.filter(i => i.category === "Trend").length;
    const momentumCount = result.filter(i => i.category === "Momentum").length;
    const volatilityCount = result.filter(i => i.category === "Volatility").length;
    const volumeCount = result.filter(i => i.category === "Volume").length;

    logger.info({
      Trend: trendCount,
      Momentum: momentumCount,
      Volatility: volatilityCount,
      Volume: volumeCount,
    }, "Indicators by category");

    process.exit(0);
  } catch (error) {
    logger.error(error, "Error seeding indicators");
    process.exit(1);
  }
}

// Run seed function
seedIndicators();
