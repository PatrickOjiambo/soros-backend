import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import app from "../src/app";
import { User, Strategy, Indicator } from "../src/db/schema";

describe("Strategy Module", () => {
    let mongoServer: MongoMemoryServer;
    let authToken: string;
    let userId: string;
    let indicatorIds: string[] = [];

    // Setup: Start in-memory MongoDB before all tests
    beforeAll(async () => {
        mongoServer = await MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();
        await mongoose.connect(mongoUri);

        // Create test indicators
        const testIndicators = [
            { name: "Simple Moving Average", abbreviation: "SMA", category: "Trend" },
            { name: "Relative Strength Index", abbreviation: "RSI", category: "Momentum" },
            { name: "Bollinger Bands", abbreviation: "BB", category: "Volatility" },
            { name: "On-Balance Volume", abbreviation: "OBV", category: "Volume" },
            { name: "Exponential Moving Average", abbreviation: "EMA", category: "Trend" },
        ];

        const indicators = await Indicator.insertMany(testIndicators);
        indicatorIds = indicators.map(ind => ind._id.toString());

        // Create a test user and get auth token
        const signupResponse = await request(app)
            .post("/api/v1/auth/signup")
            .send({
                email: "strategy@example.com",
                password: "Strategy1234!",
                firstName: "Strategy",
                lastName: "Tester",
            });

        authToken = signupResponse.body.data.token;
        userId = signupResponse.body.data.user.id;
    });

    // Cleanup: Clear database between tests
    afterEach(async () => {
        await Strategy.deleteMany({});
    });

    // Teardown: Stop MongoDB and close connection after all tests
    afterAll(async () => {
        await User.deleteMany({});
        await Indicator.deleteMany({});
        await mongoose.disconnect();
        await mongoServer.stop();
    });

    describe("GET /api/v1/strategies/indicators", () => {
        it("should get all indicators without authentication", async () => {
            const response = await request(app)
                .get("/api/v1/strategies/indicators")
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.indicators).toBeInstanceOf(Array);
            expect(response.body.data.count).toBe(5);
            expect(response.body.data.indicators[0]).toHaveProperty("name");
            expect(response.body.data.indicators[0]).toHaveProperty("abbreviation");
            expect(response.body.data.indicators[0]).toHaveProperty("category");
        });

        it("should filter indicators by category", async () => {
            const response = await request(app)
                .get("/api/v1/strategies/indicators?category=Trend")
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.indicators).toBeInstanceOf(Array);
            expect(response.body.data.count).toBe(2);
            response.body.data.indicators.forEach((indicator: any) => {
                expect(indicator.category).toBe("Trend");
            });
        });

        it("should reject invalid category", async () => {
            const response = await request(app)
                .get("/api/v1/strategies/indicators?category=NonExistent")
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe("Validation error");
        });
    });

    describe("POST /api/v1/strategies", () => {
        const validStrategyData = {
            name: "My Trading Strategy",
            description: "A powerful scalping strategy using SMA and RSI",
            indicators: [], // Will be populated in tests
            timeframe: "15m",
            amount: 1000,
        };

        beforeEach(() => {
            validStrategyData.indicators = [indicatorIds[0], indicatorIds[1]];
        });

        it("should create a new strategy with valid data", async () => {
            const response = await request(app)
                .post("/api/v1/strategies")
                .set("Authorization", `Bearer ${authToken}`)
                .send(validStrategyData)
                .expect(201);

            expect(response.body).toMatchObject({
                success: true,
                message: "Strategy created successfully",
            });
            expect(response.body.data.strategy).toHaveProperty("_id");
            expect(response.body.data.strategy.name).toBe(validStrategyData.name);
            expect(response.body.data.strategy.status).toBe("INACTIVE");
            expect(response.body.data.strategy.indicators).toBeInstanceOf(Array);
            expect(response.body.data.strategy.indicators.length).toBe(2);
        });

        it("should reject strategy creation without authentication", async () => {
            const response = await request(app)
                .post("/api/v1/strategies")
                .send(validStrategyData)
                .expect(401);

            expect(response.body.success).toBe(false);
        });

        it("should reject strategy with short name", async () => {
            const response = await request(app)
                .post("/api/v1/strategies")
                .set("Authorization", `Bearer ${authToken}`)
                .send({
                    ...validStrategyData,
                    name: "AB",
                })
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe("Validation error");
        });

        it("should reject strategy with invalid timeframe", async () => {
            const response = await request(app)
                .post("/api/v1/strategies")
                .set("Authorization", `Bearer ${authToken}`)
                .send({
                    ...validStrategyData,
                    timeframe: "2h",
                })
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe("Validation error");
        });

        it("should reject strategy with negative amount", async () => {
            const response = await request(app)
                .post("/api/v1/strategies")
                .set("Authorization", `Bearer ${authToken}`)
                .send({
                    ...validStrategyData,
                    amount: -100,
                })
                .expect(400);

            expect(response.body.success).toBe(false);
        });

        it("should reject strategy with zero amount", async () => {
            const response = await request(app)
                .post("/api/v1/strategies")
                .set("Authorization", `Bearer ${authToken}`)
                .send({
                    ...validStrategyData,
                    amount: 0,
                })
                .expect(400);

            expect(response.body.success).toBe(false);
        });

        it("should reject strategy without indicators", async () => {
            const response = await request(app)
                .post("/api/v1/strategies")
                .set("Authorization", `Bearer ${authToken}`)
                .send({
                    ...validStrategyData,
                    indicators: [],
                })
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe("Validation error");
        });

        it("should reject strategy with invalid indicator IDs", async () => {
            const response = await request(app)
                .post("/api/v1/strategies")
                .set("Authorization", `Bearer ${authToken}`)
                .send({
                    ...validStrategyData,
                    indicators: ["507f1f77bcf86cd799439011"], // Valid format but doesn't exist
                })
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain("invalid indicator");
        });

        it("should reject strategy with malformed indicator ID", async () => {
            const response = await request(app)
                .post("/api/v1/strategies")
                .set("Authorization", `Bearer ${authToken}`)
                .send({
                    ...validStrategyData,
                    indicators: ["invalid-id"],
                })
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe("Validation error");
        });

        it("should accept strategy without optional description", async () => {
            const { description, ...dataWithoutDescription } = validStrategyData;

            const response = await request(app)
                .post("/api/v1/strategies")
                .set("Authorization", `Bearer ${authToken}`)
                .send(dataWithoutDescription)
                .expect(201);

            expect(response.body.success).toBe(true);
            expect(response.body.data.strategy.description).toBeUndefined();
        });
    });

    describe("GET /api/v1/strategies", () => {
        beforeEach(async () => {
            // Create multiple strategies for testing
            //@ts-ignore
            await Strategy.create([
                {
                    userId,
                    name: "Strategy 1",
                    indicators: [indicatorIds[0]],
                    timeframe: "1h",
                    amount: 500,
                    status: "INACTIVE",
                },
                {
                    userId,
                    name: "Strategy 2",
                    indicators: [indicatorIds[1], indicatorIds[2]],
                    timeframe: "4h",
                    amount: 1500,
                    status: "ACTIVE",
                },
                {
                    userId,
                    name: "Strategy 3",
                    indicators: [indicatorIds[3]],
                    timeframe: "1d",
                    amount: 2000,
                    status: "INACTIVE",
                },
            ]);
        });

        it("should get all strategies for authenticated user", async () => {
            const response = await request(app)
                .get("/api/v1/strategies")
                .set("Authorization", `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.strategies).toBeInstanceOf(Array);
            expect(response.body.data.count).toBe(3);
            expect(response.body.data.strategies[0]).toHaveProperty("name");
            expect(response.body.data.strategies[0]).toHaveProperty("indicators");
            expect(response.body.data.strategies[0].indicators).toBeInstanceOf(Array);
        });

        it("should reject request without authentication", async () => {
            const response = await request(app)
                .get("/api/v1/strategies")
                .expect(401);

            expect(response.body.success).toBe(false);
        });

        it("should return empty array for user with no strategies", async () => {
            // Create a new user
            const newUserResponse = await request(app)
                .post("/api/v1/auth/signup")
                .send({
                    email: "newuser@example.com",
                    password: "NewUser1234!",
                    firstName: "New",
                    lastName: "User",
                });

            const newUserToken = newUserResponse.body.data.token;

            const response = await request(app)
                .get("/api/v1/strategies")
                .set("Authorization", `Bearer ${newUserToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.count).toBe(0);
            expect(response.body.data.strategies).toEqual([]);
        });

        it("should return strategies sorted by creation date (newest first)", async () => {
            const response = await request(app)
                .get("/api/v1/strategies")
                .set("Authorization", `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            const strategies = response.body.data.strategies;

            // Verify descending order
            for (let i = 0; i < strategies.length - 1; i++) {
                const currentDate = new Date(strategies[i].createdAt);
                const nextDate = new Date(strategies[i + 1].createdAt);
                expect(currentDate >= nextDate).toBe(true);
            }
        });
    });

    describe("GET /api/v1/strategies/:id", () => {
        let strategyId: string;

        beforeEach(async () => {
            const strategy = await Strategy.create({
                userId,
                name: "Test Strategy",
                description: "A test strategy",
                indicators: [indicatorIds[0], indicatorIds[1]],
                timeframe: "1h",
                amount: 1000,
                status: "INACTIVE",
            });
            strategyId = strategy._id.toString();
        });

        it("should get a specific strategy by ID", async () => {
            const response = await request(app)
                .get(`/api/v1/strategies/${strategyId}`)
                .set("Authorization", `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.strategy._id).toBe(strategyId);
            expect(response.body.data.strategy.name).toBe("Test Strategy");
            expect(response.body.data.strategy.indicators).toBeInstanceOf(Array);
            expect(response.body.data.strategy.indicators.length).toBe(2);
        });

        it("should reject request without authentication", async () => {
            const response = await request(app)
                .get(`/api/v1/strategies/${strategyId}`)
                .expect(401);

            expect(response.body.success).toBe(false);
        });

        it("should return 404 for non-existent strategy", async () => {
            const fakeId = "507f1f77bcf86cd799439011";
            const response = await request(app)
                .get(`/api/v1/strategies/${fakeId}`)
                .set("Authorization", `Bearer ${authToken}`)
                .expect(404);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe("Strategy not found");
        });

        it("should not allow user to access another user's strategy", async () => {
            // Create another user
            const otherUserResponse = await request(app)
                .post("/api/v1/auth/signup")
                .send({
                    email: "other@example.com",
                    password: "Other1234!",
                    firstName: "Other",
                    lastName: "User",
                });

            const otherUserToken = otherUserResponse.body.data.token;

            const response = await request(app)
                .get(`/api/v1/strategies/${strategyId}`)
                .set("Authorization", `Bearer ${otherUserToken}`)
                .expect(404);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe("Strategy not found");
        });
    });

    describe("PUT /api/v1/strategies/:id", () => {
        let strategyId: string;

        beforeEach(async () => {
            const strategy = await Strategy.create({
                userId,
                name: "Original Strategy",
                description: "Original description",
                indicators: [indicatorIds[0]],
                timeframe: "1h",
                amount: 1000,
                status: "INACTIVE",
            });
            strategyId = strategy._id.toString();
        });

        it("should update strategy name", async () => {
            const response = await request(app)
                .put(`/api/v1/strategies/${strategyId}`)
                .set("Authorization", `Bearer ${authToken}`)
                .send({ name: "Updated Strategy" })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.strategy.name).toBe("Updated Strategy");
        });

        it("should update strategy description", async () => {
            const response = await request(app)
                .put(`/api/v1/strategies/${strategyId}`)
                .set("Authorization", `Bearer ${authToken}`)
                .send({ description: "Updated description" })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.strategy.description).toBe("Updated description");
        });

        it("should update strategy indicators", async () => {
            const response = await request(app)
                .put(`/api/v1/strategies/${strategyId}`)
                .set("Authorization", `Bearer ${authToken}`)
                .send({ indicators: [indicatorIds[1], indicatorIds[2]] })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.strategy.indicators.length).toBe(2);
        });

        it("should update strategy timeframe", async () => {
            const response = await request(app)
                .put(`/api/v1/strategies/${strategyId}`)
                .set("Authorization", `Bearer ${authToken}`)
                .send({ timeframe: "4h" })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.strategy.timeframe).toBe("4h");
        });

        it("should update strategy amount", async () => {
            const response = await request(app)
                .put(`/api/v1/strategies/${strategyId}`)
                .set("Authorization", `Bearer ${authToken}`)
                .send({ amount: 2000 })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.strategy.amount).toBe(2000);
        });

        it("should update strategy status", async () => {
            const response = await request(app)
                .put(`/api/v1/strategies/${strategyId}`)
                .set("Authorization", `Bearer ${authToken}`)
                .send({ status: "ACTIVE" })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.strategy.status).toBe("ACTIVE");
        });

        it("should update multiple fields at once", async () => {
            const response = await request(app)
                .put(`/api/v1/strategies/${strategyId}`)
                .set("Authorization", `Bearer ${authToken}`)
                .send({
                    name: "Fully Updated",
                    timeframe: "1d",
                    amount: 5000,
                    status: "ACTIVE",
                })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.strategy.name).toBe("Fully Updated");
            expect(response.body.data.strategy.timeframe).toBe("1d");
            expect(response.body.data.strategy.amount).toBe(5000);
            expect(response.body.data.strategy.status).toBe("ACTIVE");
        });

        it("should reject update without authentication", async () => {
            const response = await request(app)
                .put(`/api/v1/strategies/${strategyId}`)
                .send({ name: "Updated" })
                .expect(401);

            expect(response.body.success).toBe(false);
        });

        it("should reject update with invalid indicator IDs", async () => {
            const response = await request(app)
                .put(`/api/v1/strategies/${strategyId}`)
                .set("Authorization", `Bearer ${authToken}`)
                .send({ indicators: ["507f1f77bcf86cd799439011"] })
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain("invalid indicator");
        });

        it("should reject update with invalid status", async () => {
            const response = await request(app)
                .put(`/api/v1/strategies/${strategyId}`)
                .set("Authorization", `Bearer ${authToken}`)
                .send({ status: "INVALID" })
                .expect(400);

            expect(response.body.success).toBe(false);
        });

        it("should return 404 for non-existent strategy", async () => {
            const fakeId = "507f1f77bcf86cd799439011";
            const response = await request(app)
                .put(`/api/v1/strategies/${fakeId}`)
                .set("Authorization", `Bearer ${authToken}`)
                .send({ name: "Updated" })
                .expect(404);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe("Strategy not found");
        });

        it("should not allow user to update another user's strategy", async () => {
            // Create another user
            const otherUserResponse = await request(app)
                .post("/api/v1/auth/signup")
                .send({
                    email: "another@example.com",
                    password: "Another1234!",
                    firstName: "Another",
                    lastName: "User",
                });

            const otherUserToken = otherUserResponse.body.data.token;

            const response = await request(app)
                .put(`/api/v1/strategies/${strategyId}`)
                .set("Authorization", `Bearer ${otherUserToken}`)
                .send({ name: "Hacked" })
                .expect(404);

            expect(response.body.success).toBe(false);
        });
    });

    describe("DELETE /api/v1/strategies/:id", () => {
        let strategyId: string;

        beforeEach(async () => {
            const strategy = await Strategy.create({
                userId,
                name: "Strategy to Delete",
                indicators: [indicatorIds[0]],
                timeframe: "1h",
                amount: 1000,
                status: "INACTIVE",
            });
            strategyId = strategy._id.toString();
        });

        it("should delete a strategy", async () => {
            const response = await request(app)
                .delete(`/api/v1/strategies/${strategyId}`)
                .set("Authorization", `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe("Strategy deleted successfully");

            // Verify strategy is deleted
            const strategy = await Strategy.findById(strategyId);
            expect(strategy).toBeNull();
        });

        it("should reject delete without authentication", async () => {
            const response = await request(app)
                .delete(`/api/v1/strategies/${strategyId}`)
                .expect(401);

            expect(response.body.success).toBe(false);

            // Verify strategy still exists
            const strategy = await Strategy.findById(strategyId);
            expect(strategy).toBeTruthy();
        });

        it("should return 404 for non-existent strategy", async () => {
            const fakeId = "507f1f77bcf86cd799439011";
            const response = await request(app)
                .delete(`/api/v1/strategies/${fakeId}`)
                .set("Authorization", `Bearer ${authToken}`)
                .expect(404);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe("Strategy not found");
        });

        it("should not allow user to delete another user's strategy", async () => {
            // Create another user
            const otherUserResponse = await request(app)
                .post("/api/v1/auth/signup")
                .send({
                    email: "deleter@example.com",
                    password: "Deleter1234!",
                    firstName: "Deleter",
                    lastName: "User",
                });

            const otherUserToken = otherUserResponse.body.data.token;

            const response = await request(app)
                .delete(`/api/v1/strategies/${strategyId}`)
                .set("Authorization", `Bearer ${otherUserToken}`)
                .expect(404);

            expect(response.body.success).toBe(false);

            // Verify strategy still exists
            const strategy = await Strategy.findById(strategyId);
            expect(strategy).toBeTruthy();
        });

        it("should successfully delete after re-creating a strategy", async () => {
            // Delete the strategy
            await request(app)
                .delete(`/api/v1/strategies/${strategyId}`)
                .set("Authorization", `Bearer ${authToken}`)
                .expect(200);

            // Create a new strategy
            const createResponse = await request(app)
                .post("/api/v1/strategies")
                .set("Authorization", `Bearer ${authToken}`)
                .send({
                    name: "New Strategy",
                    indicators: [indicatorIds[0]],
                    timeframe: "1h",
                    amount: 500,
                })
                .expect(201);

            const newStrategyId = createResponse.body.data.strategy._id;

            // Delete the new strategy
            const deleteResponse = await request(app)
                .delete(`/api/v1/strategies/${newStrategyId}`)
                .set("Authorization", `Bearer ${authToken}`)
                .expect(200);

            expect(deleteResponse.body.success).toBe(true);
        });
    });
});
