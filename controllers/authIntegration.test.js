import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import app from "../server.js";
import userModel from "../models/userModel.js";

let mongoServer;

jest.setTimeout(60000);

describe("Auth Integration Tests", () => {
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
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
});
