// import { simpleMovingAverageTool, rsiTool, vwapTool } from "./index";

// /**
//  * Simple test to verify indicator tools are working
//  */
// async function testIndicatorTools() {
//   console.log("Testing Technical Indicator Tools\n");
//   console.log("=".repeat(50));

//   try {
//     // Test SMA
//     console.log("\n1. Testing Simple Moving Average (SMA)...");
//     const smaResult = await simpleMovingAverageTool.fn({
//       period: 20,
//       interval: "15m",
//     });
//     console.log(`Signal: ${smaResult.signal}`);
//     console.log(`Confidence: ${smaResult.confidence}`);
//     console.log(`Description: ${smaResult.description}`);

//     // Test RSI
//     console.log("\n2. Testing Relative Strength Index (RSI)...");
//     const rsiResult = await rsiTool.safeExecute({
//       period: 14,
//       interval: "15m",
//     });
//     console.log(`Signal: ${rsiResult.signal}`);
//     console.log(`Confidence: ${rsiResult.confidence}`);
//     console.log(`RSI Value: ${rsiResult.rsiValue.toFixed(2)}`);
//     console.log(`Market Condition: ${rsiResult.marketCondition}`);
//     console.log(`Description: ${rsiResult.description}`);

//     // Test VWAP
//     console.log("\n3. Testing Volume Weighted Average Price (VWAP)...");
//     const vwapResult = await vwapTool.fn({
//       interval: "15m",
//     });
//     console.log(`Signal: ${vwapResult.signal}`);
//     console.log(`Confidence: ${vwapResult.confidence}`);
//     console.log(`VWAP: ${vwapResult.vwapValue.toFixed(2)}`);
//     console.log(`Current Price: ${vwapResult.currentPrice.toFixed(2)}`);
//     console.log(`Price Position: ${vwapResult.pricePosition}`);
//     console.log(`Institutional Bias: ${vwapResult.institutionalBias}`);
//     console.log(`Description: ${vwapResult.description}`);

//     console.log("\n" + "=".repeat(50));
//     console.log("All tests completed successfully! ✅");
//   } catch (error) {
//     console.error("\n❌ Test failed:", error);
//     throw error;
//   }
// }

// // Run tests if this file is executed directly
// if (require.main === module) {
//   testIndicatorTools()
//     .then(() => process.exit(0))
//     .catch(() => process.exit(1));
// }

// export { testIndicatorTools };
