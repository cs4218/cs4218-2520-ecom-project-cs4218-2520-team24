import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
let app;
import userModel from "../models/userModel.js";

let mongoServer;

jest.setTimeout(60000);

describe("Auth Integration Tests", () => {
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    process.env.MONGO_URL = uri;
    process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";
    process.env.BRAINTREE_MERCHANT_ID = process.env.BRAINTREE_MERCHANT_ID || "test";
    process.env.BRAINTREE_PUBLIC_KEY = process.env.BRAINTREE_PUBLIC_KEY || "test";
    process.env.BRAINTREE_PRIVATE_KEY = process.env.BRAINTREE_PRIVATE_KEY || "test";
    const serverModule = await import("../server.js");
    app = serverModule.default;
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    await mongoose.connect(uri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await userModel.deleteMany({});
  });

  it("should perform full forgot password flow: register -> reset -> login", async () => {
    const userData = {
      name: "John Doe",
      email: "john@example.com",
      password: "password123",
      phone: "1234567890",
      address: "123 Main St",
      answer: "Football",
    };

    // 1. Register
    const regRes = await request(app)
      .post("/api/v1/auth/register")
      .send(userData);
    expect(regRes.status).toBe(201);
    expect(regRes.body.success).toBe(true);

    // 2. Forgot Password (Reset)
    const resetData = {
      email: userData.email,
      answer: userData.answer,
      newPassword: "newpassword456",
    };
    const resetRes = await request(app)
      .post("/api/v1/auth/forgot-password")
      .send(resetData);
    expect(resetRes.status).toBe(200);
    expect(resetRes.body.success).toBe(true);
    expect(resetRes.body.message).toBe("Password reset successfully");

    // 3. Login with New Password
    const loginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: userData.email,
        password: resetData.newPassword,
      });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.success).toBe(true);
    expect(loginRes.body.message).toBe("Login successful");
    expect(loginRes.body.user.name).toBe(userData.name);

    // 4. Verify Old Password Fails
    const oldLoginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: userData.email,
        password: userData.password,
      });
    expect(oldLoginRes.body.success).toBe(false);
    expect(oldLoginRes.body.message).toBe("Invalid password");
  });
  // Choo Jia Rong
  it("should register and then login returning a JWT", async () => {
    const userData = {
      name: "Login User",
      email: "login@example.com",
      password: "password123",
      phone: "1234567890",
      address: "123 Main St",
      answer: "Football",
    };

    const regRes = await request(app)
      .post("/api/v1/auth/register")
      .send(userData);
    expect(regRes.status).toBe(201);
    expect(regRes.body.success).toBe(true);

    const loginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: userData.email,
        password: userData.password,
      });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.success).toBe(true);
    expect(loginRes.body.token).toBeTruthy();
    expect(loginRes.body.user.email).toBe(userData.email);
  });
  // Choo Jia Rong
  it("should reject duplicate registration by email", async () => {
    const userData = {
      name: "Dup User",
      email: "dup@example.com",
      password: "password123",
      phone: "1234567890",
      address: "123 Main St",
      answer: "Football",
    };

    await request(app).post("/api/v1/auth/register").send(userData);

    const dupRes = await request(app)
      .post("/api/v1/auth/register")
      .send(userData);

    expect(dupRes.status).toBe(200);
    expect(dupRes.body.success).toBe(false);
    expect(dupRes.body.message).toBe("Email already registered, please log in");
  });

  it("should fail forgot password if answer is incorrect", async () => {
    const userData = {
      name: "Jane Doe",
      email: "jane@example.com",
      password: "password123",
      phone: "0987654321",
      address: "456 Side St",
      answer: "Basketball",
    };
    await request(app).post("/api/v1/auth/register").send(userData);

    const resetRes = await request(app)
      .post("/api/v1/auth/forgot-password")
      .send({
        email: userData.email,
        answer: "WrongAnswer",
        newPassword: "newpassword",
      });
    expect(resetRes.status).toBe(404);
    expect(resetRes.body.success).toBe(false);
    expect(resetRes.body.message).toBe("Wrong email or answer");
  });
  // Choo Jia Rong
  it("should update profile with a valid auth token", async () => {
    const userData = {
      name: "Profile User",
      email: "profile@example.com",
      password: "password123",
      phone: "1234567890",
      address: "123 Main St",
      answer: "Football",
    };

    await request(app).post("/api/v1/auth/register").send(userData);

    const loginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: userData.email, password: userData.password });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.token).toBeTruthy();

    const updateRes = await request(app)
      .put("/api/v1/auth/profile")
      .set("Authorization", loginRes.body.token)
      .send({
        name: "Updated Name",
        phone: "9999999999",
        address: "456 Updated Ave",
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.success).toBe(true);
    expect(updateRes.body.updatedUser.name).toBe("Updated Name");
    expect(updateRes.body.updatedUser.phone).toBe("9999999999");
    expect(updateRes.body.updatedUser.address).toBe("456 Updated Ave");
  });
  // Choo Jia Rong
  it("should reject profile update when password is too short", async () => {
    const userData = {
      name: "Weak Password User",
      email: "weakpass@example.com",
      password: "password123",
      phone: "1234567890",
      address: "123 Main St",
      answer: "Football",
    };

    await request(app).post("/api/v1/auth/register").send(userData);

    const loginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: userData.email, password: userData.password });

    const updateRes = await request(app)
      .put("/api/v1/auth/profile")
      .set("Authorization", loginRes.body.token)
      .send({ password: "123" });

    expect(updateRes.body.error).toBe(
      "Password must be at least 6 characters long"
    );
  });
});
