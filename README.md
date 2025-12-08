# Soros AI Trading Platform - Backend

Welcome to the backend for Soros, an intelligent, automated trading platform. Soros empowers users to define their trading strategies in natural language, which an AI agent then analyzes, refines, and executes using a suite of technical indicator tools.

## Table of Contents

1.  [Platform Overview](#platform-overview)
2.  [Core Features](#core-features)
3.  [Technology Stack](#technology-stack)
4.  [Getting Started](#getting-started)
5.  [Automated Trading Cycle](#automated-trading-cycle)
6.  [API Documentation](#api-documentation)

---

## Platform Overview

Soros is designed to bridge the gap between complex trading strategies and automated execution. The workflow is simple:

1.  **Sign Up & Log In**: Users create a secure account on the platform.
2.  **Create a Strategy**: Users describe their trading strategy (e.g., "Buy WETH when the 15m RSI is below 30 and the price crosses above the 50-period EMA").
3.  **Fund the Strategy**: Users deposit WETH into a secure escrow contract, allocating funds to a specific strategy.
4.  **AI Takes Over**: A sophisticated, multi-agent system analyzes the strategy, determines the right technical indicators to use, and continuously monitors the market.
5.  **Automated Execution**: When the strategy's conditions are met, the system logs a potential trade in the database with a `PENDING` status, ready for execution.

The platform currently focuses exclusively on the **WETH/USDT** trading pair.

## Core Features

-   **Robust Authentication**: Secure user registration and login using JWT.
-   **Strategy Management**: Full CRUD functionality for users to manage their trading strategies.
-   **Treasury Management**: Per-strategy fund management, allowing users to deposit and withdraw funds, with clear tracking of available vs. locked balances.
-   **Comprehensive Indicator Suite**: 25+ technical indicators (Trend, Momentum, Volume, Volatility) available as tools for the AI.
-   **Sequential AI Agent System**:
    -   **Refiner Agent**: Clarifies and structures the user's raw strategy.
    -   **Analyzer Agent**: Selects and calls the appropriate indicator tools.
    -   **Validator Agent**: Analyzes the tool outputs to make a final trade decision (Buy, Sell, or Hold) and logs it.
-   **Automated Trade Logging**: Valid `BUY` signals are automatically saved to the database as `Trade` documents.
-   **Automated Cron Jobs**: Trading cycle runs every 3 minutes to analyze all active strategies.

## Technology Stack

-   **Backend**: Node.js, Express.js v5
-   **Language**: TypeScript
-   **Database**: MongoDB with Mongoose
-   **Validation**: Zod v4
-   **Authentication**: JWT (`jsonwebtoken`)
-   **AI Agents**: `@iqai/adk` with OpenAI's `gpt-4o` model
-   **Technical Indicators**: `indicatorts` v2.2.2
-   **Logging**: Pino
-   **Cron Jobs**: `node-cron`

---

## Getting Started

### Prerequisites

-   Node.js (v18 or higher)
-   pnpm (or npm/yarn)
-   MongoDB instance (local or cloud-based like MongoDB Atlas)
-   OpenAI API key (for AI agents)

### Installation

1.  Clone the repository:
    ```bash
    git clone <your-repository-url>
    cd soros-backend
    ```

2.  Install dependencies:
    ```bash
    pnpm install
    ```

### Environment Variables

Create a `.env` file in the root of the project:

```env
# Server
NODE_ENV=development
PORT=5000

# Database
MONGODB_URI=mongodb://localhost:27017/soros

# Authentication
JWT_SECRET=your_very_secure_and_long_secret_key_here
JWT_EXPIRES_IN=7d

# AI Agent
OPENAI_API_KEY=sk-your-openai-api-key-here

# Optional: Market Data
BINANCE_API_KEY=your_binance_api_key
BINANCE_API_SECRET=your_binance_api_secret
```

### Running the Application

1.  **Seed the Database**: Populate the database with technical indicators.
    ```bash
    pnpm seed
    ```

2.  **Start the Development Server**:
    ```bash
    pnpm dev
    ```
    The API will be available at `http://localhost:5000`.

3.  **Run Tests**:
    ```bash
    pnpm test
    ```

---

## Automated Trading Cycle

The platform automatically analyzes all active strategies **every 3 minutes** using a cron job.

### What Happens Every 3 Minutes:

1.  **Fetch Active Strategies**: Retrieves all strategies with `status: "ACTIVE"`.
2.  **Run Agent Pipeline**: For each strategy:
    -   **Refiner Agent**: Breaks down the strategy into clear steps (if not already refined).
    -   **Analyzer Agent**: Executes relevant technical indicators and analyzes market data.
    -   **Validator Agent**: Makes a trading decision (BUY, SELL, or HOLD).
3.  **Save Trades**: If the decision is `EXECUTE` with a `BUY` signal, creates a `Trade` document with `status: "PENDING"`.
4.  **Log Results**: Records execution results for monitoring and debugging.

### Cron Job Details

-   **Schedule**: Every 3 minutes (`*/3 * * * *`)
-   **File**: `src/workers/cron.ts`
-   **Function**: `startStrategyAnalysisCron()`
-   **Graceful Shutdown**: Cron jobs are stopped properly when the server shuts down.

### Monitoring the Cron Job

Check logs to see cron job execution:

```bash
tail -f logs/app.log | grep "scheduled strategy analysis"
```

You'll see output like:

```
🔄 Starting scheduled strategy analysis cycle
✅ Scheduled analysis cycle completed - Strategies: 5, Successful: 4, Failed: 1, Trades Created: 2
```

---

## API Documentation

The base URL for all endpoints is `/api/v1`.

### Authentication API

#### 1. User Signup

-   **Endpoint**: `POST /api/v1/auth/signup`
-   **Protected**: No
-   **Request Body**:
    ```json
    {
      "email": "user@example.com",
      "password": "SecurePassword123!",
      "firstName": "John",
      "lastName": "Doe"
    }
    ```
-   **Response (201)**:
    ```json
    {
      "success": true,
      "message": "User registered successfully",
      "data": {
        "user": {
          "id": "60d5ecb4b39e3b1e3c8f8b1a",
          "email": "user@example.com",
          "firstName": "John",
          "lastName": "Doe",
          "fullName": "John Doe",
          "isEmailVerified": false,
          "createdAt": "2025-12-08T10:00:00.000Z"
        },
        "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
      }
    }
    ```

#### 2. User Login

-   **Endpoint**: `POST /api/v1/auth/login`
-   **Protected**: No
-   **Request Body**:
    ```json
    {
      "email": "user@example.com",
      "password": "SecurePassword123!"
    }
    ```
-   **Response (200)**:
    ```json
    {
      "success": true,
      "message": "Login successful",
      "data": {
        "user": { "...": "..." },
        "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
      }
    }
    ```

#### 3. Get User Profile

-   **Endpoint**: `GET /api/v1/auth/me`
-   **Protected**: Yes (`Authorization: Bearer <token>`)
-   **Response (200)**:
    ```json
    {
      "success": true,
      "data": {
        "user": {
          "id": "60d5ecb4b39e3b1e3c8f8b1a",
          "email": "user@example.com",
          "firstName": "John",
          "lastName": "Doe",
          "fullName": "John Doe",
          "isEmailVerified": false,
          "isActive": true,
          "createdAt": "2025-12-08T10:00:00.000Z"
        }
      }
    }
    ```

---

### Strategies API

#### 1. Get All Indicators

-   **Endpoint**: `GET /api/v1/strategies/indicators`
-   **Protected**: No
-   **Query Parameters**:
    -   `category` (optional): Filter by `Trend`, `Momentum`, `Volatility`, `Volume`
-   **Response (200)**:
    ```json
    {
      "success": true,
      "data": {
        "indicators": [
          {
            "_id": "60d5f0a7b39e3b1e3c8f8b1c",
            "name": "Relative Strength Index",
            "abbreviation": "RSI",
            "category": "Momentum",
            "description": "Measures momentum..."
          }
        ],
        "count": 25
      }
    }
    ```

#### 2. Create a Strategy

-   **Endpoint**: `POST /api/v1/strategies`
-   **Protected**: Yes
-   **Request Body**:
    ```json
    {
      "name": "RSI + EMA Strategy",
      "description": "Buy when RSI < 30 and price above 50 EMA",
      "indicators": ["60d5f0a7b39e3b1e3c8f8b1c", "60d5f0a7b39e3b1e3c8f8b1d"],
      "timeframe": "15m",
      "amount": 0
    }
    ```
-   **Response (201)**:
    ```json
    {
      "success": true,
      "message": "Strategy created successfully",
      "data": {
        "strategy": {
          "_id": "60d5f1b3b39e3b1e3c8f8b20",
          "name": "RSI + EMA Strategy",
          "status": "INACTIVE",
          "timeframe": "15m"
        }
      }
    }
    ```

#### 3. Get User's Strategies

-   **Endpoint**: `GET /api/v1/strategies`
-   **Protected**: Yes
-   **Response (200)**:
    ```json
    {
      "success": true,
      "data": {
        "strategies": [
          {
            "_id": "60d5f1b3b39e3b1e3c8f8b20",
            "name": "RSI + EMA Strategy",
            "status": "ACTIVE",
            "timeframe": "15m"
          }
        ],
        "count": 1
      }
    }
    ```

#### 4. Get Strategy by ID

-   **Endpoint**: `GET /api/v1/strategies/:id`
-   **Protected**: Yes
-   **Response (200)**:
    ```json
    {
      "success": true,
      "data": {
        "strategy": {
          "_id": "60d5f1b3b39e3b1e3c8f8b20",
          "name": "RSI + EMA Strategy",
          "description": "...",
          "indicators": [...],
          "status": "ACTIVE"
        }
      }
    }
    ```

#### 5. Update a Strategy

-   **Endpoint**: `PUT /api/v1/strategies/:id`
-   **Protected**: Yes
-   **Request Body** (all optional):
    ```json
    {
      "name": "Updated Strategy Name",
      "description": "Updated description",
      "status": "ACTIVE"
    }
    ```
-   **Response (200)**:
    ```json
    {
      "success": true,
      "message": "Strategy updated successfully",
      "data": { "strategy": {...} }
    }
    ```

#### 6. Delete a Strategy

-   **Endpoint**: `DELETE /api/v1/strategies/:id`
-   **Protected**: Yes
-   **Response (200)**:
    ```json
    {
      "success": true,
      "message": "Strategy deleted successfully"
    }
    ```

---

### Treasury API

#### 1. Initialize Treasury

-   **Endpoint**: `POST /api/v1/treasury/initialize`
-   **Protected**: Yes
-   **Request Body**:
    ```json
    {
      "strategyId": "60d5f1b3b39e3b1e3c8f8b20",
      "contractAddress": "0x1234567890123456789012345678901234567890"
    }
    ```
-   **Response (201)**:
    ```json
    {
      "success": true,
      "message": "Treasury initialized successfully",
      "data": {
        "id": "60d6f1b3b39e3b1e3c8f8c30",
        "strategyId": "60d5f1b3b39e3b1e3c8f8b20",
        "availableBalance": 0,
        "lockedBalance": 0
      }
    }
    ```

#### 2. Notify Deposit

-   **Endpoint**: `POST /api/v1/treasury/deposit`
-   **Protected**: Yes
-   **Request Body**:
    ```json
    {
      "strategyId": "60d5f1b3b39e3b1e3c8f8b20",
      "amount": 1.5,
      "txHash": "0xabc...123",
      "contractAddress": "0x123...abc"
    }
    ```
-   **Response (200)**:
    ```json
    {
      "success": true,
      "message": "Successfully deposited 1.5 WETH",
      "data": {
        "treasury": {
          "id": "...",
          "availableBalance": 1.5,
          "totalDeposited": 1.5
        },
        "transaction": {
          "type": "DEPOSIT",
          "amount": 1.5,
          "status": "COMPLETED"
        }
      }
    }
    ```

#### 3. Request Withdrawal

-   **Endpoint**: `POST /api/v1/treasury/withdraw`
-   **Protected**: Yes
-   **Request Body**:
    ```json
    {
      "strategyId": "60d5f1b3b39e3b1e3c8f8b20",
      "amount": 0.5
    }
    ```
-   **Response (200)**:
    ```json
    {
      "success": true,
      "message": "Successfully withdrew 0.5 WETH",
      "data": {
        "treasury": {
          "availableBalance": 1.0,
          "totalWithdrawn": 0.5
        },
        "transaction": {
          "type": "WITHDRAW",
          "amount": -0.5,
          "status": "PENDING"
        }
      }
    }
    ```

#### 4. Get Strategy Balance

-   **Endpoint**: `GET /api/v1/treasury/balance/:strategyId`
-   **Protected**: Yes
-   **Response (200)**:
    ```json
    {
      "success": true,
      "data": {
        "id": "60d6f1b3b39e3b1e3c8f8c30",
        "strategyId": "60d5f1b3b39e3b1e3c8f8b20",
        "availableBalance": 1.0,
        "lockedBalance": 0,
        "totalDeposited": 1.5,
        "totalWithdrawn": 0.5,
        "totalProfits": 0,
        "totalLosses": 0,
        "netProfitLoss": 0
      }
    }
    ```

#### 5. Get All User Balances

-   **Endpoint**: `GET /api/v1/treasury/balances`
-   **Protected**: Yes
-   **Response (200)**:
    ```json
    {
      "success": true,
      "data": [
        {
          "id": "60d6f1b3b39e3b1e3c8f8c30",
          "strategyId": "60d5f1b3b39e3b1e3c8f8b20",
          "availableBalance": 1.0,
          "netProfitLoss": 0
        }
      ],
      "count": 1
    }
    ```

#### 6. Get Transaction History

-   **Endpoint**: `GET /api/v1/treasury/transactions/:strategyId`
-   **Protected**: Yes
-   **Query Parameters**:
    -   `limit` (optional, default: 50, max: 100)
    -   `skip` (optional, default: 0)
    -   `type` (optional): `DEPOSIT`, `WITHDRAW`, `TRADE_OPEN`, etc.
    -   `status` (optional): `PENDING`, `COMPLETED`, `FAILED`, `REVERSED`
-   **Response (200)**:
    ```json
    {
      "success": true,
      "data": [
        {
          "id": "...",
          "type": "DEPOSIT",
          "amount": 1.5,
          "status": "COMPLETED",
          "createdAt": "2025-12-08T12:00:00.000Z"
        }
      ],
      "pagination": {
        "total": 1,
        "limit": 50,
        "skip": 0,
        "hasMore": false
      }
    }
    ```

#### 7. Get Transaction Summary

-   **Endpoint**: `GET /api/v1/treasury/summary/:strategyId`
-   **Protected**: Yes
-   **Response (200)**:
    ```json
    {
      "success": true,
      "data": {
        "totalDeposits": 200.0,
        "totalWithdrawals": 50.0,
        "totalProfits": 30.0,
        "totalLosses": 10.0,
        "transactionCount": 15
      }
    }
    ```

---

## Project Structure

```
soros-backend/
├── src/
│   ├── agents/           # AI agent system
│   │   ├── refiner.agent.ts
│   │   ├── analyzer.agent.ts
│   │   ├── validator.agent.ts
│   │   ├── trading.agent.ts
│   │   └── types.ts
│   ├── api/              # REST API routes
│   │   ├── auth.ts
│   │   ├── strategies.ts
│   │   ├── treasury.ts
│   │   └── index.ts
│   ├── db/               # Database models
│   │   └── schema.ts
│   ├── lib/              # Utilities
│   │   ├── auth.ts
│   │   ├── logger.ts
│   │   └── treasury.utils.ts
│   ├── services/         # Business logic
│   │   └── treasury.service.ts
│   ├── tools/            # Indicator tools (25+)
│   │   └── index.ts
│   ├── workers/          # Background jobs
│   │   ├── cron.ts
│   │   └── strategy-executor.ts
│   ├── app.ts
│   └── index.ts
├── test/                 # Test files
├── TREASURY_README.md    # Treasury docs
├── AGENT_SYSTEM_README.md
└── README.md
```

---

## Additional Documentation

-   **Treasury Management**: See [TREASURY_README.md](./TREASURY_README.md)
-   **AI Agent System**: See [AGENT_SYSTEM_README.md](./AGENT_SYSTEM_README.md)
-   **Quick Start for Agents**: See [QUICKSTART_AGENTS.md](./QUICKSTART_AGENTS.md)

---

## Testing

Run all tests:
```bash
pnpm test
```

Run specific test suite:
```bash
pnpm test test/treasury.test.ts
pnpm test test/auth.test.ts
```

---

## Support & Troubleshooting

### Common Issues

1. **Cron job not running**: Check logs for errors, ensure MongoDB is connected.
2. **Treasury operations failing**: Verify strategy exists and user owns it.
3. **AI agents timing out**: Check OpenAI API key and rate limits.

### Logs

View logs:
```bash
tail -f logs/app.log
```

Search for errors:
```bash
grep "ERROR" logs/app.log
```

---

## License

MIT
