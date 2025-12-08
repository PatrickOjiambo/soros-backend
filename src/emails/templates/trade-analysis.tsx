import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
  Hr,
} from "@react-email/components";
import * as React from "react";

interface TradeAnalysisEmailProps {
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

export const TradeAnalysisEmail = ({
  strategyName = "MACD + EMA Strategy",
  decision = "REJECT",
  signal = "HOLD",
  confidence = "WEAK",
  reasoning = "Analysis suggests waiting for better conditions",
  marketCondition = "Consolidating with mixed signals",
  trendAnalysis = "Price is in a consolidation phase",
  momentumAnalysis = "MACD showing divergence",
  volatilityAnalysis = "Low volatility period",
  volumeAnalysis = "Below average volume",
  keyInsights = [],
  warnings = [],
  validationChecks = {
    strategyAlignment: false,
    riskAcceptable: true,
    marketConditionsFavorable: false,
    sufficientConfidence: false,
  },
  timestamp = new Date().toISOString(),
}: TradeAnalysisEmailProps) => {
  const getDecisionColor = () => {
    switch (decision) {
      case "EXECUTE":
        return "#10b981"; // green
      case "HOLD":
        return "#f59e0b"; // yellow
      case "REJECT":
        return "#ef4444"; // red
      default:
        return "#6b7280"; // gray
    }
  };

  const getDecisionEmoji = () => {
    switch (decision) {
      case "EXECUTE":
        return "✅";
      case "HOLD":
        return "⏸️";
      case "REJECT":
        return "🚫";
      default:
        return "ℹ️";
    }
  };

  return (
    <Html>
      <Head />
      <Preview>
        {decision} Trade Signal for {strategyName}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Heading style={h1}>
              🤖 Soros AI Trading Analysis
            </Heading>
            <Text style={subtitle}>Automated Strategy Analysis Report</Text>
          </Section>

          {/* Decision Badge */}
          <Section style={decisionSection}>
            <div
              style={{
                ...decisionBadge,
                backgroundColor: getDecisionColor(),
              }}
            >
              <Text style={decisionText}>
                {getDecisionEmoji()} {decision}
              </Text>
            </div>
            <Text style={strategyNameText}>{strategyName}</Text>
            <Text style={timestampText}>
              Analyzed at {new Date(timestamp).toLocaleString()}
            </Text>
          </Section>

          <Hr style={divider} />

          {/* Summary Section */}
          <Section style={section}>
            <Heading style={h2}>📊 Summary</Heading>
            <div style={summaryGrid}>
              <div style={summaryItem}>
                <Text style={summaryLabel}>Signal</Text>
                <Text style={summaryValue}>{signal}</Text>
              </div>
              <div style={summaryItem}>
                <Text style={summaryLabel}>Confidence</Text>
                <Text style={summaryValue}>{confidence}</Text>
              </div>
              <div style={summaryItem}>
                <Text style={summaryLabel}>Market Condition</Text>
                <Text style={summaryValue}>{marketCondition}</Text>
              </div>
            </div>
          </Section>

          <Hr style={divider} />

          {/* Reasoning */}
          <Section style={section}>
            <Heading style={h2}>💡 Decision Reasoning</Heading>
            <div style={reasoningBox}>
              <Text style={reasoningText}>{reasoning}</Text>
            </div>
          </Section>

          <Hr style={divider} />

          {/* Technical Analysis */}
          <Section style={section}>
            <Heading style={h2}>📈 Technical Analysis</Heading>

            <div style={analysisBlock}>
              <Text style={analysisTitle}>🔄 Trend Analysis</Text>
              <Text style={analysisText}>{trendAnalysis}</Text>
            </div>

            <div style={analysisBlock}>
              <Text style={analysisTitle}>⚡ Momentum Analysis</Text>
              <Text style={analysisText}>{momentumAnalysis}</Text>
            </div>

            <div style={analysisBlock}>
              <Text style={analysisTitle}>📉 Volatility Analysis</Text>
              <Text style={analysisText}>{volatilityAnalysis}</Text>
            </div>

            <div style={analysisBlock}>
              <Text style={analysisTitle}>📊 Volume Analysis</Text>
              <Text style={analysisText}>{volumeAnalysis}</Text>
            </div>
          </Section>

          <Hr style={divider} />

          {/* Key Insights */}
          {keyInsights.length > 0 && (
            <>
              <Section style={section}>
                <Heading style={h2}>💎 Key Insights</Heading>
                {keyInsights.map((insight, index) => (
                  <div key={index} style={insightItem}>
                    <Text style={insightText}>
                      {index + 1}. {insight}
                    </Text>
                  </div>
                ))}
              </Section>
              <Hr style={divider} />
            </>
          )}

          {/* Warnings */}
          {warnings.length > 0 && (
            <>
              <Section style={section}>
                <Heading style={h2}>⚠️ Warnings & Risks</Heading>
                <div style={warningBox}>
                  {warnings.map((warning, index) => (
                    <Text key={index} style={warningText}>
                      • {warning}
                    </Text>
                  ))}
                </div>
              </Section>
              <Hr style={divider} />
            </>
          )}

          {/* Validation Checks */}
          <Section style={section}>
            <Heading style={h2}>✓ Validation Checklist</Heading>
            <div style={checklistBox}>
              <div style={checkItem}>
                <Text style={checkText}>
                  {validationChecks.strategyAlignment ? "✅" : "❌"} Strategy
                  Alignment
                </Text>
              </div>
              <div style={checkItem}>
                <Text style={checkText}>
                  {validationChecks.riskAcceptable ? "✅" : "❌"} Risk
                  Acceptable
                </Text>
              </div>
              <div style={checkItem}>
                <Text style={checkText}>
                  {validationChecks.marketConditionsFavorable ? "✅" : "❌"}{" "}
                  Market Conditions Favorable
                </Text>
              </div>
              <div style={checkItem}>
                <Text style={checkText}>
                  {validationChecks.sufficientConfidence ? "✅" : "❌"}{" "}
                  Sufficient Confidence
                </Text>
              </div>
            </div>
          </Section>

          <Hr style={divider} />

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              This analysis was generated automatically by Soros AI Trading
              Platform.
            </Text>
            <Text style={footerText}>
              Trading carries risk. This is not financial advice.
            </Text>
            <Text style={footerText}>
              <Link href="https://soros.trading" style={link}>
                Visit Dashboard
              </Link>{" "}
              |{" "}
              <Link href="https://soros.trading/help" style={link}>
                Get Help
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default TradeAnalysisEmail;

// Styles
const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 0 48px",
  marginBottom: "64px",
  maxWidth: "600px",
};

const header = {
  padding: "32px 40px",
  textAlign: "center" as const,
  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
};

const h1 = {
  color: "#ffffff",
  fontSize: "32px",
  fontWeight: "bold",
  margin: "0 0 8px",
  padding: "0",
  lineHeight: "1.2",
};

const subtitle = {
  color: "#e0e7ff",
  fontSize: "16px",
  margin: "0",
  lineHeight: "1.4",
};

const h2 = {
  color: "#1f2937",
  fontSize: "24px",
  fontWeight: "600",
  margin: "0 0 16px",
  padding: "0",
};

const decisionSection = {
  padding: "32px 40px",
  textAlign: "center" as const,
};

const decisionBadge = {
  display: "inline-block",
  padding: "12px 32px",
  borderRadius: "24px",
  marginBottom: "16px",
};

const decisionText = {
  color: "#ffffff",
  fontSize: "24px",
  fontWeight: "bold",
  margin: "0",
};

const strategyNameText = {
  color: "#1f2937",
  fontSize: "20px",
  fontWeight: "600",
  margin: "8px 0",
};

const timestampText = {
  color: "#6b7280",
  fontSize: "14px",
  margin: "4px 0 0",
};

const section = {
  padding: "24px 40px",
};

const summaryGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: "16px",
};

const summaryItem = {
  textAlign: "center" as const,
  padding: "16px",
  backgroundColor: "#f9fafb",
  borderRadius: "8px",
};

const summaryLabel = {
  color: "#6b7280",
  fontSize: "12px",
  margin: "0 0 4px",
  textTransform: "uppercase" as const,
  fontWeight: "600",
};

const summaryValue = {
  color: "#1f2937",
  fontSize: "18px",
  fontWeight: "bold",
  margin: "0",
};

const reasoningBox = {
  backgroundColor: "#f3f4f6",
  padding: "20px",
  borderRadius: "8px",
  borderLeft: "4px solid #667eea",
};

const reasoningText = {
  color: "#374151",
  fontSize: "15px",
  lineHeight: "1.6",
  margin: "0",
};

const analysisBlock = {
  marginBottom: "20px",
};

const analysisTitle = {
  color: "#1f2937",
  fontSize: "16px",
  fontWeight: "600",
  margin: "0 0 8px",
};

const analysisText = {
  color: "#4b5563",
  fontSize: "14px",
  lineHeight: "1.6",
  margin: "0",
};

const insightItem = {
  backgroundColor: "#f0fdf4",
  padding: "12px 16px",
  borderRadius: "6px",
  marginBottom: "8px",
  borderLeft: "3px solid #10b981",
};

const insightText = {
  color: "#065f46",
  fontSize: "14px",
  margin: "0",
  lineHeight: "1.5",
};

const warningBox = {
  backgroundColor: "#fef2f2",
  padding: "16px",
  borderRadius: "8px",
  borderLeft: "4px solid #ef4444",
};

const warningText = {
  color: "#991b1b",
  fontSize: "14px",
  margin: "4px 0",
  lineHeight: "1.5",
};

const checklistBox = {
  backgroundColor: "#f9fafb",
  padding: "20px",
  borderRadius: "8px",
};

const checkItem = {
  marginBottom: "12px",
};

const checkText = {
  color: "#374151",
  fontSize: "15px",
  margin: "0",
};

const divider = {
  borderColor: "#e5e7eb",
  margin: "0",
};

const footer = {
  padding: "24px 40px",
  textAlign: "center" as const,
};

const footerText = {
  color: "#6b7280",
  fontSize: "13px",
  margin: "4px 0",
  lineHeight: "1.5",
};

const link = {
  color: "#667eea",
  textDecoration: "underline",
};
