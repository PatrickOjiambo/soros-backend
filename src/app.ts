import cors from "cors";
import express, {Express} from "express";
import helmet from "helmet";
import morgan from "morgan";

import type MessageResponse from "./interfaces/message-response";

import api from "./api/index";
import * as middlewares from "./middlewares";

const app: Express = express();

app.use(morgan("dev"));
app.use(helmet());
app.use(cors({origin: ["https://agentarena.soros.space", "http://localhost:8080"]}));
app.use(express.json());

// Apply general rate limiter to all API routes
app.use("/api", middlewares.apiLimiter);

app.get<object, MessageResponse>("/", (req, res) => {
  res.json({
    message: "🦄🌈✨👋🌎🌍🌏✨🌈🦄",
  });
});

app.use("/api/v1", api);

app.use(middlewares.notFound);
app.use(middlewares.errorHandler);

export default app;
