import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import app from "../src/app";
import { User } from "../src/db/schema";
import { AuthService } from "../src/lib/auth";

describe("Auth Module", () => {
  let mongoServer: MongoMemoryServer;

  // Setup: Start in-memory MongoDB before all tests
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  // Cleanup: Clear database between tests
  afterEach(async () => {
    await User.deleteMany({});
  });

  // Teardown: Stop MongoDB and close connection after all tests
  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  describe("POST /api/v1/auth/signup", () => {
    const validSignupData = {
      email: "test@example.com",
      password: "Test1234!",
      firstName: "John",
      lastName: "Doe",
    };

    it("should successfully register a new user with valid data", async () => {
      const response = await request(app)
        .post("/api/v1/auth/signup")
        .send(validSignupData)
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        message: "User registered successfully",
      });
      expect(response.body.data).toHaveProperty("user");
      expect(response.body.data).toHaveProperty("token");
      expect(response.body.data.user.email).toBe(validSignupData.email);
      expect(response.body.data.user.firstName).toBe(validSignupData.firstName);
      expect(response.body.data.user.lastName).toBe(validSignupData.lastName);
      expect(response.body.data.user).not.toHaveProperty("password");
    });

    it("should hash the password before storing", async () => {
      await request(app)
        .post("/api/v1/auth/signup")
        .send(validSignupData)
        .expect(201);

      const user = await User.findOne({ email: validSignupData.email }).select("+password");
      expect(user).toBeTruthy();
      expect(user!.password).not.toBe(validSignupData.password);
      expect(user!.password.length).toBeGreaterThan(20); // Hashed password
    });

    it("should reject signup with existing email", async () => {
      // Create first user
      await request(app)
        .post("/api/v1/auth/signup")
        .send(validSignupData)
        .expect(201);

      // Try to create duplicate
      const response = await request(app)
        .post("/api/v1/auth/signup")
        .send(validSignupData)
        .expect(409);

      expect(response.body).toMatchObject({
        success: false,
        message: "User with this email already exists",
      });
    });

    it("should reject signup with invalid email", async () => {
      const response = await request(app)
        .post("/api/v1/auth/signup")
        .send({
          ...validSignupData,
          email: "invalid-email",
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        message: "Validation error",
      });
      expect(response.body.errors).toBeInstanceOf(Array);
    });

    it("should reject signup with weak password", async () => {
      const response = await request(app)
        .post("/api/v1/auth/signup")
        .send({
          ...validSignupData,
          password: "weak",
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Validation error");
    });

    it("should reject signup with missing required fields", async () => {
      const response = await request(app)
        .post("/api/v1/auth/signup")
        .send({
          email: "test@example.com",
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Validation error");
    });

    it("should reject signup with short first name", async () => {
      const response = await request(app)
        .post("/api/v1/auth/signup")
        .send({
          ...validSignupData,
          firstName: "A",
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it("should trim whitespace from names", async () => {
      const response = await request(app)
        .post("/api/v1/auth/signup")
        .send({
          ...validSignupData,
          firstName: "  John  ",
          lastName: "  Doe  ",
        })
        .expect(201);

      expect(response.body.data.user.firstName).toBe("John");
      expect(response.body.data.user.lastName).toBe("Doe");
    });
  });

  describe("POST /api/v1/auth/login", () => {
    const userCredentials = {
      email: "login@example.com",
      password: "Login1234!",
      firstName: "Jane",
      lastName: "Smith",
    };

    beforeEach(async () => {
      // Create a user before each login test
      await request(app)
        .post("/api/v1/auth/signup")
        .send(userCredentials);
    });

    it("should successfully login with valid credentials", async () => {
      const response = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: userCredentials.email,
          password: userCredentials.password,
        })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: "Login successful",
      });
      expect(response.body.data).toHaveProperty("user");
      expect(response.body.data).toHaveProperty("token");
      expect(response.body.data.user.email).toBe(userCredentials.email);
      expect(response.body.data.user).not.toHaveProperty("password");
    });

    it("should update lastLogin timestamp on successful login", async () => {
      const user = await User.findOne({ email: userCredentials.email });
      const lastLoginBefore = user!.lastLogin;

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: userCredentials.email,
          password: userCredentials.password,
        })
        .expect(200);

      const userAfter = await User.findOne({ email: userCredentials.email });
      expect(userAfter!.lastLogin).toBeTruthy();
      expect(userAfter!.lastLogin).not.toEqual(lastLoginBefore);
    });

    it("should reject login with incorrect password", async () => {
      const response = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: userCredentials.email,
          password: "WrongPassword123!",
        })
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        message: "Invalid email or password",
      });
    });

    it("should reject login with non-existent email", async () => {
      const response = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: "nonexistent@example.com",
          password: userCredentials.password,
        })
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        message: "Invalid email or password",
      });
    });

    it("should reject login with invalid email format", async () => {
      const response = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: "invalid-email",
          password: userCredentials.password,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Validation error");
    });

    it("should reject login with missing password", async () => {
      const response = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: userCredentials.email,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it("should reject login for deactivated account", async () => {
      // Deactivate user
      await User.findOneAndUpdate(
        { email: userCredentials.email },
        { isActive: false },
      );

      const response = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: userCredentials.email,
          password: userCredentials.password,
        })
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        message: "Account is deactivated",
      });
    });
  });

  describe("GET /api/v1/auth/me", () => {
    let authToken: string;
    const userCredentials = {
      email: "profile@example.com",
      password: "Profile1234!",
      firstName: "Profile",
      lastName: "User",
    };

    beforeEach(async () => {
      // Create user and get token
      const signupResponse = await request(app)
        .post("/api/v1/auth/signup")
        .send(userCredentials);
      
      authToken = signupResponse.body.data.token;
    });

    it("should get user profile with valid token", async () => {
      const response = await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(userCredentials.email);
      expect(response.body.data.user.firstName).toBe(userCredentials.firstName);
      expect(response.body.data.user).not.toHaveProperty("password");
    });

    it("should reject request without token", async () => {
      const response = await request(app)
        .get("/api/v1/auth/me")
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        message: "No token provided. Please include a Bearer token in the Authorization header.",
      });
    });

    it("should reject request with invalid token", async () => {
      const response = await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", "Bearer invalid-token")
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it("should reject request with malformed Authorization header", async () => {
      const response = await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", authToken) // Missing "Bearer " prefix
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe("AuthService", () => {
    describe("generateToken", () => {
      it("should generate a valid JWT token", async () => {
        const user = new User({
          email: "token@example.com",
          password: "Password123!",
          firstName: "Token",
          lastName: "Test",
        });
        await user.save();

        const token = AuthService.generateToken(user);
        expect(token).toBeTruthy();
        expect(typeof token).toBe("string");

        // Verify token
        const payload = AuthService.verifyToken(token);
        expect(payload.userId).toBe(user._id.toString());
        expect(payload.email).toBe(user.email);
      });
    });

    describe("verifyToken", () => {
      it("should throw error for invalid token", () => {
        expect(() => {
          AuthService.verifyToken("invalid-token");
        }).toThrow();
      });
    });
  });
});
