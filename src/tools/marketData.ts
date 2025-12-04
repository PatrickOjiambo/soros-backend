import axios from "axios";
import type { Candle } from "./types/common.types";
import logger from "../lib/logger";

/**
 * Market data provider for fetching WETHUSDT data
 * This is a singleton that provides market data to all indicator tools
 */
class MarketDataProvider {
  private static instance: MarketDataProvider;
  private cache: Map<string, { data: Candle[]; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 60000; // 1 minute cache
  private readonly BINANCE_API = "https://api.binance.com/api/v3";

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): MarketDataProvider {
    if (!MarketDataProvider.instance) {
      MarketDataProvider.instance = new MarketDataProvider();
    }
    return MarketDataProvider.instance;
  }

  /**
   * Fetch WETHUSDT market data from Binance
   * @param interval - Timeframe interval (e.g., "1m", "5m", "15m", "1h", "4h", "1d")
   * @param limit - Number of candles to fetch (max 1000)
   * @returns Array of candles with OHLCV data
   */
  async getMarketData(interval: string = "15m", limit: number = 100): Promise<Candle[]> {
    const cacheKey = `WETHUSDT-${interval}-${limit}`;
    const cached = this.cache.get(cacheKey);

    // Return cached data if it's still valid
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      logger.debug({ interval, limit }, "Returning cached market data");
      return cached.data;
    }

    try {
      logger.info({ interval, limit }, "Fetching market data from Binance");

      const response = await axios.get(`${this.BINANCE_API}/klines`, {
        params: {
          symbol: "WETHUSDT",
          interval,
          limit,
        },
        timeout: 10000,
      });

      const candles: Candle[] = response.data.map((kline: any[]) => ({
        timestamp: kline[0],
        open: parseFloat(kline[1]),
        high: parseFloat(kline[2]),
        low: parseFloat(kline[3]),
        close: parseFloat(kline[4]),
        volume: parseFloat(kline[5]),
      }));

      // Cache the data
      this.cache.set(cacheKey, {
        data: candles,
        timestamp: Date.now(),
      });

      logger.info({ candleCount: candles.length }, "Market data fetched successfully");
      return candles;
    } catch (error) {
      logger.error({ error, interval, limit }, "Failed to fetch market data");
      throw new Error(`Failed to fetch market data: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Get OHLC arrays for indicator calculations
   * @param interval - Timeframe interval
   * @param limit - Number of candles to fetch
   * @returns Object with separate arrays for open, high, low, close, volume
   */
  async getOHLCArrays(interval: string = "15m", limit: number = 100) {
    const candles = await this.getMarketData(interval, limit);

    return {
      open: candles.map(c => c.open),
      high: candles.map(c => c.high),
      low: candles.map(c => c.low),
      close: candles.map(c => c.close),
      volume: candles.map(c => c.volume),
      timestamps: candles.map(c => c.timestamp),
    };
  }

  /**
   * Clear the cache (useful for testing)
   */
  clearCache() {
    this.cache.clear();
    logger.debug("Market data cache cleared");
  }
}

/**
 * Export singleton instance
 */
export const marketDataProvider = MarketDataProvider.getInstance();

/**
 * Helper function to get market data (used by all indicator tools)
 * @param interval - Timeframe interval
 * @param limit - Number of candles
 */
export async function getMarketData(interval: string = "15m", limit: number = 100): Promise<Candle[]> {
  return marketDataProvider.getMarketData(interval, limit);
}

/**
 * Helper function to get OHLC arrays (used by indicator calculations)
 * @param interval - Timeframe interval
 * @param limit - Number of candles
 */
export async function getOHLCArrays(interval: string = "15m", limit: number = 100) {
  return marketDataProvider.getOHLCArrays(interval, limit);
}
