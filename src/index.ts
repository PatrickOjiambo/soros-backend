import app from "./app";
import { env } from "./env";
import { connectDB, closeDBConnection } from "./db";
import { startStrategyAnalysisCron, stopAllCronJobs } from "./workers/cron";

const port = env.PORT;

const startServer = async () => {
  try {
    await connectDB();
    console.log("Database connected successfully.");

    // Start cron jobs
    // startStrategyAnalysisCron();

    const server = app.listen(port, () => {

      /* eslint-disable no-console */
      console.log(`Listening: http://localhost:${port}`);
      /* eslint-enable no-console */
    });
    server.on("error", (err) => {
      if ("code" in err && err.code === "EADDRINUSE") {
        console.error(`Port ${env.PORT} is already in use. Please choose another port or stop the process using it.`);
      } else {
        console.error("Server error:", err);
      }
      process.exit(1);
    });

    const gracefulShutdown = async (signal: string) => {
      console.log(`\nReceived ${signal}. Closing connections gracefully...`);
      
      // Stop cron jobs
      stopAllCronJobs();
      
      server.close(async () => {
        console.log("HTTP server closed.");
        await closeDBConnection();
        console.log("Database connection closed.");
        process.exit(0);
      });
    };

    process.on("SIGINT", () => gracefulShutdown("SIGINT"));
    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
};

startServer();
