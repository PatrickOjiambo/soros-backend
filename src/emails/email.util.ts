import { sendEmail } from "./emailSender";
import ExampleEmail from "./templates/example";
import VerifyEmail from "./templates/verify-email";
import ResetPasswordEmail from "./templates/reset-password";
import TopUpTreasury from "./templates/top-up-tokens";
import TradeAnalysisEmail from "./templates/trade-analysis";
import "dotenv/config";
import logger from "../lib/logger";

export class EmailService {
  async testEmail() {
    await sendEmail({
      to: "pashrick237@gmail.com", //Change as you guys test
      subject: "Test Email setup",
      react: ExampleEmail(),
    });
  }
  async verificationEmail(url: string, to: string) {
    try {
      if (typeof url !== "string" || !url.trim()) {
        throw new Error("Invalid arguments for verification email");
      }
      const valid = this.validateEmailAddress(to);
      if (!valid) {
        throw new Error("Invalid email address");
      }
      const verificationResult = await sendEmail({
        to,
        subject: "Verify your email address",
        react: VerifyEmail({ url }),
      });
      if (!verificationResult.success) {
        throw (
          verificationResult.error ??
          new Error("Failed to send verification email")
        );
      }
    } catch (error) {
      logger.error(
        `Error sending verification email to ${to}: ${(error as Error).message}`,
      );
      throw error;
    }
  }
  async resetPasswordEmail(url: string, to: string) {
    try {
      if (typeof url !== "string" || !url.trim()) {
        throw new Error("Invalid arguments for reset password email");
      }
      const valid = this.validateEmailAddress(to);
      if (!valid) {
        throw new Error("Invalid email address");
      }
      const resetResult = await sendEmail({
        to,
        subject: "Reset your password",
        react: ResetPasswordEmail({ url }),
      });
      if (!resetResult.success) {
        throw (
          resetResult.error ?? new Error("Failed to send reset password email")
        );
      }
    } catch (error) {
      logger.error(
        `Error sending reset password email to ${to}: ${(error as Error).message}`,
      );
      throw error;
    }
  }
  async tradeAnalysisEmail(
    to: string,
    analysisData: {
      strategyName: string;
      decision: "EXECUTE" | "HOLD" | "REJECT";
      signal: "BUY" | "SELL" | "HOLD";
      confidence: string;
      reasoning: string;
      marketCondition: string;
      trendAnalysis: string;
      momentumAnalysis: string;
      volatilityAnalysis: string;
      volumeAnalysis: string;
      keyInsights: string[];
      warnings: string[];
      validationChecks: {
        strategyAlignment: boolean;
        riskAcceptable: boolean;
        marketConditionsFavorable: boolean;
        sufficientConfidence: boolean;
      };
      timestamp: string;
    }
  ) {
    try {
      const valid = this.validateEmailAddress(to);
      if (!valid) {
        throw new Error("Invalid email address");
      }
      const analysisResult = await sendEmail({
        to,
        subject: `Trade Analysis: ${analysisData.strategyName} - ${analysisData.decision}`,
        react: TradeAnalysisEmail(analysisData),
      });
      if (!analysisResult.success) {
        throw (
          analysisResult.error ?? new Error("Failed to send trade analysis email")
        );
      }
    } catch (error) {
      logger.error(
        `Error sending trade analysis email to ${to}: ${(error as Error).message}`,
      );
      throw error;
    }
  }
  validateEmailAddress(email: string): boolean {
    if (typeof email !== "string" || !email) return false;
    if (email.trim() === "") return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

export const emailService = new EmailService();
