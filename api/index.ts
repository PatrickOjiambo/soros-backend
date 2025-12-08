/**
 * Vercel Serverless Function Entry Point
 * 
 * This file serves as the entry point for Vercel deployment.
 * It exports the Express app as a serverless function handler.
 */

import app from "../src/app";
import { connectDB } from "../src/db";

let isConnected = false;

/**
 * Ensure database connection is established
 * Reuses connection across function invocations
 */
async function ensureDbConnection() {
  if (!isConnected) {
    await connectDB();
    isConnected = true;
  }
}

/**
 * Serverless function handler
 * 
 * Note: Cron jobs are disabled in serverless environment.
 * For scheduled tasks, use Vercel Cron Jobs or external schedulers.
 */
export default async function handler(req: any, res: any) {
  try {
    // Ensure database connection
    await ensureDbConnection();
    
    // Handle request with Express app
    return app(req, res);
  } catch (error) {
    console.error("Serverless function error:", error);
    res.status(500).json({ 
      error: "Internal Server Error",
      message: process.env.NODE_ENV === "development" ? (error as Error).message : "Something went wrong"
    });
  }
}
