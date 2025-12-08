import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]),
  PORT: z.coerce.number().default(5000),
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters for security"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  EMAIL_FROM: z.email(),
  EMAIL_SERVER_HOST: z.string().min(1),
  EMAIL_SERVER_PORT: z.coerce.number(),
  EMAIL_SERVER_USER: z.string().min(1),
  EMAIL_SERVER_PASSWORD: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1, "OPENAI_API_KEY is required"),
  GOOGLE_API_KEY: z.string().min(1, "GEMINI_API_KEY is required"),
});

try {
  envSchema.parse(process.env);
}
catch (error) {
  if (error instanceof z.ZodError) {
    console.error("Missing environment variables:", error.issues.flatMap(issue => issue.path));
  }
  else {
    console.error(error);
  }
  process.exit(1);
}

// eslint-disable-next-line node/no-process-env
export const env = envSchema.parse(process.env);
