// Carsten Joe Ng, A0255764W
// Auth Guards & Role-Based Authorization Integration Tests
// Tests middleware functions directly without simulating
// Verifies admin access and user guard protection with real middleware

import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import JWT from "jsonwebtoken";
import userModel from "../models/userModel.js";
import { requireSignIn, isAdmin } from "../middlewares/authMiddleware.js";

let mongoServer;

jest.setTimeout(60000);

// Helper to create mock response object
const createMockResponse = () => {
  return {
    status: jest.fn(function () {
      return this;
    }),
    send: jest.fn(function () {
      return this;
    }),
    json: jest.fn(function () {
      return this;
    }),
  };
};

// Auth Guards & Role-Based Authorization Integration Tests
// Tests middleware functions directly verifying admin access and user guard
describe("Auth Guards & Role-Based Authorization Integration Tests", () => {
  beforeAll(async () => {
    process.env.JWT_SECRET = "test_jwt_secret_key";

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

  afterEach(async () => {
    await userModel.deleteMany({});
  });

  let adminUserId;
  let regularUserId;
  let adminToken;
  let regularUserToken;

  beforeEach(async () => {
    process.env.JWT_SECRET = "test_jwt_secret_key";

    // Create admin user
    const adminUser = await new userModel({
      name: "Admin User",
      email: "admin@example.com",
      password: "hashed123",
      phone: "1111111111",
      address: "Admin St",
      answer: "answer",
      role: 1,
    }).save();
    adminUserId = adminUser._id;

    // Create regular user
    const regularUser = await new userModel({
      name: "Regular User",
      email: "user@example.com",
      password: "hashed456",
      phone: "2222222222",
      address: "User St",
      answer: "answer",
      role: 0,
    }).save();
    regularUserId = regularUser._id;

    // Generate JWT tokens
    adminToken = JWT.sign({ _id: adminUserId }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });
    regularUserToken = JWT.sign({ _id: regularUserId }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });
  });

  describe("requireSignIn Middleware Tests", () => {
    it("should allow admin user with valid JWT token and call next()", async () => {
      const req = {
        headers: { authorization: adminToken },
      };
      const res = createMockResponse();
      const next = jest.fn();

      await requireSignIn(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBeDefined();
      expect(req.user._id).toBe(adminUserId.toString());
    });

    it("should allow regular user with valid JWT token and call next()", async () => {
      const req = {
        headers: { authorization: regularUserToken },
      };
      const res = createMockResponse();
      const next = jest.fn();

      await requireSignIn(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBeDefined();
      expect(req.user._id).toBe(regularUserId.toString());
    });

    it("should reject missing authorization header", async () => {
      const req = {
        headers: {},
      };
      const res = createMockResponse();
      const next = jest.fn();
      const consoleSpy = jest
        .spyOn(console, "log")
        .mockImplementation(() => {});

      await requireSignIn(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it("should reject invalid JWT token", async () => {
      const req = {
        headers: { authorization: "invalid-token-123" },
      };
      const res = createMockResponse();
      const next = jest.fn();
      const consoleSpy = jest
        .spyOn(console, "log")
        .mockImplementation(() => {});

      await requireSignIn(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it("should reject malformed token", async () => {
      const req = {
        headers: { authorization: "Bearer malformed.token" },
      };
      const res = createMockResponse();
      const next = jest.fn();
      const consoleSpy = jest
        .spyOn(console, "log")
        .mockImplementation(() => {});

      await requireSignIn(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it("should reject empty authorization header", async () => {
      const req = {
        headers: { authorization: "" },
      };
      const res = createMockResponse();
      const next = jest.fn();
      const consoleSpy = jest
        .spyOn(console, "log")
        .mockImplementation(() => {});

      await requireSignIn(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it("should reject token with wrong secret key", async () => {
      const wrongToken = JWT.sign(
        { _id: adminUserId },
        "wrong-secret-key",
        { expiresIn: "7d" }
      );

      const req = {
        headers: { authorization: wrongToken },
      };
      const res = createMockResponse();
      const next = jest.fn();
      const consoleSpy = jest
        .spyOn(console, "log")
        .mockImplementation(() => {});

      await requireSignIn(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it("should reject expired tokens", async () => {
      const expiredToken = JWT.sign(
        { _id: adminUserId },
        process.env.JWT_SECRET,
        { expiresIn: "-1s" }
      );

      const req = {
        headers: { authorization: expiredToken },
      };
      const res = createMockResponse();
      const next = jest.fn();
      const consoleSpy = jest
        .spyOn(console, "log")
        .mockImplementation(() => {});

      await requireSignIn(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe("isAdmin Middleware Tests - Admin Access Control", () => {
    it("should allow admin user (role=1) to proceed", async () => {
      const req = {
        headers: { authorization: adminToken },
        user: null,
      };
      const res = createMockResponse();
      const next = jest.fn();

      // Authenticate first
      await requireSignIn(req, res, next);
      expect(req.user).toBeDefined();

      // Reset mocks for isAdmin
      next.mockClear();
      res.status.mockClear();

      // Check admin access
      await isAdmin(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalledWith(401);
    });

    it("should reject regular user (role=0) with 401 status", async () => {
      const req = {
        headers: { authorization: regularUserToken },
        user: null,
      };
      const res = createMockResponse();
      const next = jest.fn();

      // Authenticate first
      await requireSignIn(req, res, next);
      expect(req.user).toBeDefined();

      // Reset mocks for isAdmin
      next.mockClear();
      res.status.mockClear();
      res.send.mockClear();

      // Check admin access - should fail
      await isAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "UnAuthorized Access",
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("should verify admin user has role value of 1 in database", async () => {
      const savedUser = await userModel.findById(adminUserId);
      expect(savedUser.role).toBe(1);
    });

    it("should verify regular user has role value of 0 in database", async () => {
      const savedUser = await userModel.findById(regularUserId);
      expect(savedUser.role).toBe(0);
    });

    it("should reject request if user deleted from database", async () => {
      const req = {
        headers: { authorization: adminToken },
        user: null,
      };
      const res = createMockResponse();
      const next = jest.fn();

      // Authenticate
      await requireSignIn(req, res, next);

      // Delete user from database
      await userModel.findByIdAndDelete(req.user._id);

      // Reset mocks
      next.mockClear();
      res.status.mockClear();
      res.send.mockClear();

      // Check admin access - should fail
      await isAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Error in admin middleware",
        })
      );
    });

    it("should not call next() if user is not admin", async () => {
      const req = {
        headers: { authorization: regularUserToken },
        user: null,
      };
      const res = createMockResponse();
      const next = jest.fn();

      await requireSignIn(req, res, next);
      next.mockClear();

      await isAdmin(req, res, next);

      expect(next).not.toHaveBeenCalled();
    });

    it("should reject if isAdmin called without user attached", async () => {
      const req = {
        user: null,
      };
      const res = createMockResponse();
      const next = jest.fn();
      const consoleSpy = jest
        .spyOn(console, "log")
        .mockImplementation(() => {});

      await isAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe("User Role Edge Cases", () => {
    it("should reject user with role value 2 (invalid)", async () => {
      const invalidRoleUser = await new userModel({
        name: "Invalid Role User",
        email: "invalid@example.com",
        password: "hashed",
        phone: "3333333333",
        address: "Invalid St",
        answer: "answer",
        role: 2,
      }).save();

      const token = JWT.sign(
        { _id: invalidRoleUser._id },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      const req = {
        headers: { authorization: token },
        user: null,
      };
      const res = createMockResponse();
      const next = jest.fn();

      await requireSignIn(req, res, next);
      next.mockClear();
      res.status.mockClear();
      res.send.mockClear();

      await isAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "UnAuthorized Access",
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("should treat any role !== 1 as non-admin", async () => {
      const testRoles = [0, 2, 3, 99, -1];

      for (const roleValue of testRoles) {
        await userModel.deleteMany({});

        const user = await new userModel({
          name: `Test User ${roleValue}`,
          email: `user${roleValue}@example.com`,
          password: "hashed",
          phone: "1234567890",
          address: "Test St",
          answer: "answer",
          role: roleValue,
        }).save();

        const token = JWT.sign(
          { _id: user._id },
          process.env.JWT_SECRET,
          { expiresIn: "7d" }
        );

        const req = {
          headers: { authorization: token },
          user: null,
        };
        const res = createMockResponse();
        const next = jest.fn();

        await requireSignIn(req, res, next);
        next.mockClear();
        res.status.mockClear();
        res.send.mockClear();

        await isAdmin(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
      }
    });

    it("should only accept exactly role=1 as admin", async () => {
      const adminUser = await new userModel({
        name: "Admin Only",
        email: "admin_only@example.com",
        password: "hashed",
        phone: "1234567890",
        address: "Admin St",
        answer: "answer",
        role: 1,
      }).save();

      const adminOnlyToken = JWT.sign(
        { _id: adminUser._id },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      const req = {
        headers: { authorization: adminOnlyToken },
        user: null,
      };
      const res = createMockResponse();
      const next = jest.fn();

      await requireSignIn(req, res, next);
      next.mockClear();

      await isAdmin(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalledWith(401);
    });
  });

  describe("Middleware Chain Flow Tests", () => {
    it("admin user should pass entire middleware chain", async () => {
      const req = {
        headers: { authorization: adminToken },
        user: null,
      };
      const res = createMockResponse();
      const next = jest.fn();

      // First middleware
      await requireSignIn(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
      expect(req.user).toBeDefined();

      // Reset for second middleware
      next.mockClear();

      // Second middleware
      await isAdmin(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalledWith(401);
    });

    it("regular user should pass requireSignIn but fail at isAdmin", async () => {
      const req = {
        headers: { authorization: regularUserToken },
        user: null,
      };
      const res = createMockResponse();
      const next = jest.fn();

      // First middleware - should pass
      await requireSignIn(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
      expect(req.user).toBeDefined();

      // Reset for second middleware
      next.mockClear();
      res.status.mockClear();
      res.send.mockClear();

      // Second middleware - should fail
      await isAdmin(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "UnAuthorized Access",
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("user without token should fail at requireSignIn", async () => {
      const req = {
        headers: {},
      };
      const res = createMockResponse();
      const next = jest.fn();
      const consoleSpy = jest
        .spyOn(console, "log")
        .mockImplementation(() => {});

      await requireSignIn(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it("user with invalid token should fail at requireSignIn", async () => {
      const req = {
        headers: { authorization: "invalid-token" },
      };
      const res = createMockResponse();
      const next = jest.fn();
      const consoleSpy = jest
        .spyOn(console, "log")
        .mockImplementation(() => {});

      await requireSignIn(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe("Database Integrity Tests", () => {
    it("should find correct user from database during admin check", async () => {
      const req = {
        headers: { authorization: adminToken },
        user: null,
      };
      const res = createMockResponse();
      const next = jest.fn();

      await requireSignIn(req, res, next);

      const foundUser = await userModel.findById(req.user._id);
      expect(foundUser).toBeDefined();
      expect(foundUser.role).toBe(1);
      expect(foundUser.name).toBe("Admin User");
    });

    it("should find correct user from database for regular user", async () => {
      const req = {
        headers: { authorization: regularUserToken },
        user: null,
      };
      const res = createMockResponse();
      const next = jest.fn();

      await requireSignIn(req, res, next);

      const foundUser = await userModel.findById(req.user._id);
      expect(foundUser).toBeDefined();
      expect(foundUser.role).toBe(0);
      expect(foundUser.email).toBe("user@example.com");
    });

    it("should handle user not found in database", async () => {
      const req = {
        headers: { authorization: adminToken },
        user: null,
      };
      const res = createMockResponse();
      const next = jest.fn();

      await requireSignIn(req, res, next);

      // Delete user after authentication
      await userModel.findByIdAndDelete(req.user._id);

      next.mockClear();
      res.status.mockClear();
      res.send.mockClear();

      await isAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Error in admin middleware",
        })
      );
    });
  });

  describe("Concurrent Requests Isolation", () => {
    it("should handle multiple users with different tokens simultaneously", async () => {
      const adminReq = {
        headers: { authorization: adminToken },
        user: null,
      };
      const adminRes = createMockResponse();
      const adminNext = jest.fn();

      const userReq = {
        headers: { authorization: regularUserToken },
        user: null,
      };
      const userRes = createMockResponse();
      const userNext = jest.fn();

      // Authenticate both
      await requireSignIn(adminReq, adminRes, adminNext);
      await requireSignIn(userReq, userRes, userNext);

      // Verify correct users attached
      expect(adminReq.user._id).toBe(adminUserId.toString());
      expect(userReq.user._id).toBe(regularUserId.toString());
      expect(adminReq.user._id).not.toBe(userReq.user._id);
    });

    it("should isolate admin and user authorization contexts", async () => {
      const adminReq = {
        headers: { authorization: adminToken },
        user: null,
      };
      const adminRes = createMockResponse();
      const adminNext = jest.fn();

      const userReq = {
        headers: { authorization: regularUserToken },
        user: null,
      };
      const userRes = createMockResponse();
      const userNext = jest.fn();

      // Authenticate both
      await requireSignIn(adminReq, adminRes, adminNext);
      await requireSignIn(userReq, userRes, userNext);

      // Clear mocks and check admin access
      adminNext.mockClear();
      userNext.mockClear();
      adminRes.status.mockClear();
      userRes.status.mockClear();

      // Check authorization
      await isAdmin(adminReq, adminRes, adminNext);
      await isAdmin(userReq, userRes, userNext);

      // Admin should pass
      expect(adminNext).toHaveBeenCalled();
      expect(adminRes.status).not.toHaveBeenCalledWith(401);

      // User should fail
      expect(userNext).not.toHaveBeenCalled();
      expect(userRes.status).toHaveBeenCalledWith(401);
    });
  });
});
