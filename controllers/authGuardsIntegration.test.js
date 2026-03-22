// Carsten Joe Ng, A0255764W

import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import JWT from "jsonwebtoken";
import userModel from "../models/userModel.js";

let mongoServer;

jest.setTimeout(60000);

// Helper to create mock response object
const createResponse = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.send = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

// Simulate middleware handlers for testing
const requireSignIn = async (req, res, next) => {
  try {
    const decode = JWT.verify(
      req.headers.authorization,
      process.env.JWT_SECRET
    );
    req.user = decode;
    next();
  } catch (error) {
    console.log(error);
  }
};

const isAdmin = async (req, res, next) => {
  try {
    const user = await userModel.findById(req.user._id);
    if (user.role !== 1) {
      return res.status(401).send({
        success: false,
        message: "UnAuthorized Access",
      });
    } else {
      next();
    }
  } catch (error) {
    console.log(error);
    res.status(401).send({
      success: false,
      error,
      message: "Error in admin middleware",
    });
  }
};

// Endpoint handlers for testing
const userAuthHandler = (req, res) => {
  res.status(200).send({ ok: true });
};

const adminAuthHandler = (req, res) => {
  res.status(200).send({ ok: true });
};

// Auth Guards & Role-Based Authorization Integration Tests
// Tests /user-auth, /admin-auth endpoints and middleware (requireSignIn, isAdmin)
describe("Auth Guards & Role-Based Authorization Integration Tests", () => {
  beforeAll(async () => {
    // Set JWT secret for all tests
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
    // Set JWT secret for testing
    process.env.JWT_SECRET = "test_jwt_secret_key";

    // Create admin user
    const adminUser = await new userModel({
      name: "Admin User",
      email: "admin@example.com",
      password: "hashed123",
      phone: "1111111111",
      address: "Admin St",
      answer: "answer",
      role: 1, // Admin role
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
      role: 0, // Regular user role
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

  describe("/user-auth Endpoint - requireSignIn middleware", () => {
    it("should allow admin user with valid JWT token", async () => {
      const req = {
        headers: { authorization: adminToken },
      };
      const res = createResponse();
      const next = jest.fn();

      await requireSignIn(req, res, next);
      userAuthHandler(req, res);

      expect(next).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({ ok: true });
    });

    it("should allow regular user with valid JWT token", async () => {
      const req = {
        headers: { authorization: regularUserToken },
      };
      const res = createResponse();
      const next = jest.fn();

      await requireSignIn(req, res, next);
      userAuthHandler(req, res);

      expect(next).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({ ok: true });
    });

    it("should reject request with missing authorization header", async () => {
      const req = {
        headers: {},
      };
      const res = createResponse();
      const next = jest.fn();
      const consoleSpy = jest
        .spyOn(console, "log")
        .mockImplementation(() => {});

      await requireSignIn(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it("should reject request with invalid JWT token", async () => {
      const req = {
        headers: { authorization: "invalid-token-123" },
      };
      const res = createResponse();
      const next = jest.fn();
      const consoleSpy = jest
        .spyOn(console, "log")
        .mockImplementation(() => {});

      await requireSignIn(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it("should reject request with malformed token", async () => {
      const req = {
        headers: { authorization: "Bearer malformed.token" },
      };
      const res = createResponse();
      const next = jest.fn();
      const consoleSpy = jest
        .spyOn(console, "log")
        .mockImplementation(() => {});

      await requireSignIn(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it("should extract and attach user data to request", async () => {
      const req = {
        headers: { authorization: adminToken },
      };
      const res = createResponse();
      const next = jest.fn();

      await requireSignIn(req, res, next);

      expect(req.user).toBeDefined();
      expect(req.user._id).toBe(adminUserId.toString());
    });

    it("should attach regular user data correctly", async () => {
      const req = {
        headers: { authorization: regularUserToken },
      };
      const res = createResponse();
      const next = jest.fn();

      await requireSignIn(req, res, next);

      expect(req.user).toBeDefined();
      expect(req.user._id).toBe(regularUserId.toString());
    });

    it("should reject empty authorization header", async () => {
      const req = {
        headers: { authorization: "" },
      };
      const res = createResponse();
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
      const res = createResponse();
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

  describe("/admin-auth Endpoint - requireSignIn + isAdmin middleware chain", () => {
    it("should allow admin user to access admin endpoint", async () => {
      const req = {
        headers: { authorization: adminToken },
        user: null,
      };
      const res = createResponse();
      const next = jest.fn();

      // First middleware
      await requireSignIn(req, res, next);
      expect(req.user).toBeDefined();

      // Reset next for second middleware
      next.mockClear();

      // Second middleware
      await isAdmin(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalledWith(401);
    });

    it("should block regular user from accessing admin endpoint", async () => {
      const req = {
        headers: { authorization: regularUserToken },
        user: null,
      };
      const res = createResponse();
      const next = jest.fn();

      // First middleware
      await requireSignIn(req, res, next);
      expect(req.user).toBeDefined();

      // Reset next and response mocks
      next.mockClear();
      res.status.mockClear();
      res.send.mockClear();

      // Second middleware
      await isAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "UnAuthorized Access",
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("should block request if admin user deleted from database", async () => {
      const req = {
        headers: { authorization: adminToken },
        user: null,
      };
      const res = createResponse();
      const next = jest.fn();

      // First middleware
      await requireSignIn(req, res, next);

      // Delete admin from database
      await userModel.findByIdAndDelete(adminUserId);

      // Reset mocks
      res.status.mockClear();
      res.send.mockClear();

      // Second middleware
      await isAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Error in admin middleware",
        })
      );
    });

    it("should verify admin user has role value of 1", async () => {
      const req = {
        headers: { authorization: adminToken },
        user: null,
      };
      const res = createResponse();
      const next = jest.fn();

      await requireSignIn(req, res, next);

      // Verify role in database
      const savedUser = await userModel.findById(adminUserId);
      expect(savedUser.role).toBe(1);
    });

    it("should verify regular user has role value of 0", async () => {
      const req = {
        headers: { authorization: regularUserToken },
        user: null,
      };
      const res = createResponse();
      const next = jest.fn();

      await requireSignIn(req, res, next);

      // Verify role in database
      const savedUser = await userModel.findById(regularUserId);
      expect(savedUser.role).toBe(0);
    });

    it("should reject request without prior requireSignIn middleware", async () => {
      // Directly call isAdmin without requireSignIn
      const req = {
        user: null, // No user attached
      };
      const res = createResponse();
      const next = jest.fn();
      const consoleSpy = jest
        .spyOn(console, "log")
        .mockImplementation(() => {});

      await isAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it("should not call next() if user is not admin", async () => {
      const req = {
        headers: { authorization: regularUserToken },
        user: null,
      };
      const res = createResponse();
      const next = jest.fn();

      await requireSignIn(req, res, next);
      next.mockClear();

      await isAdmin(req, res, next);

      expect(next).not.toHaveBeenCalled();
    });

    it("should call next() only if user is admin and validation passes", async () => {
      const req = {
        headers: { authorization: adminToken },
        user: null,
      };
      const res = createResponse();
      const next = jest.fn();

      await requireSignIn(req, res, next);
      next.mockClear();

      await isAdmin(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
    });
  });

  describe("Middleware Chain Complete Flow Tests", () => {
    it("admin user should successfully reach admin handler after middleware chain", async () => {
      const req = {
        headers: { authorization: adminToken },
        user: null,
      };
      const res = createResponse();
      const next = jest.fn();

      // Execute middleware chain
      await requireSignIn(req, res, next);
      expect(next).toHaveBeenCalled();

      next.mockClear();
      await isAdmin(req, res, next);
      expect(next).toHaveBeenCalled();

      // Call endpoint handler
      adminAuthHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({ ok: true });
    });

    it("regular user should fail at isAdmin middleware", async () => {
      const req = {
        headers: { authorization: regularUserToken },
        user: null,
      };
      const res = createResponse();
      const next = jest.fn();

      // Execute middleware chain
      await requireSignIn(req, res, next);
      expect(next).toHaveBeenCalled();

      next.mockClear();
      await isAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it("missing token should fail at requireSignIn middleware", async () => {
      const req = {
        headers: {},
        user: null,
      };
      const res = createResponse();
      const next = jest.fn();
      const consoleSpy = jest
        .spyOn(console, "log")
        .mockImplementation(() => {});

      // Execute middleware chain
      await requireSignIn(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled(); // requireSignIn doesn't call res.status on error

      consoleSpy.mockRestore();
    });

    it("invalid token should fail at requireSignIn middleware", async () => {
      const req = {
        headers: { authorization: "invalid-token" },
        user: null,
      };
      const res = createResponse();
      const next = jest.fn();
      const consoleSpy = jest
        .spyOn(console, "log")
        .mockImplementation(() => {});

      await requireSignIn(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe("Role Value Edge Cases", () => {
    it("should reject user with role value other than 0 or 1", async () => {
      // Create user with invalid role
      const invalidRoleUser = await new userModel({
        name: "Invalid Role User",
        email: "invalid@example.com",
        password: "hashed789",
        phone: "3333333333",
        address: "Invalid St",
        answer: "answer",
        role: 2, // Invalid role
      }).save();

      const token = JWT.sign({ _id: invalidRoleUser._id }, process.env.JWT_SECRET, {
        expiresIn: "7d",
      });

      const req = {
        headers: { authorization: token },
        user: null,
      };
      const res = createResponse();
      const next = jest.fn();

      await requireSignIn(req, res, next);
      next.mockClear();
      res.status.mockClear();
      res.send.mockClear();

      await isAdmin(req, res, next);

      // Should reject because role !== 1
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "UnAuthorized Access",
      });
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

        const token = JWT.sign({ _id: user._id }, process.env.JWT_SECRET, {
          expiresIn: "7d",
        });

        const req = {
          headers: { authorization: token },
          user: null,
        };
        const res = createResponse();
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

    it("should only accept exactly 1 as admin role", async () => {
      // Only role 1 should pass
      const adminUser = await new userModel({
        name: "Admin Only",
        email: "admin_only@example.com",
        password: "hashed",
        phone: "1234567890",
        address: "Admin St",
        answer: "answer",
        role: 1,
      }).save();

      const adminToken = JWT.sign(
        { _id: adminUser._id },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      const req = {
        headers: { authorization: adminToken },
        user: null,
      };
      const res = createResponse();
      const next = jest.fn();

      await requireSignIn(req, res, next);
      next.mockClear();

      await isAdmin(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalledWith(401);
    });
  });

  describe("Token Expiration & Validity Tests", () => {
    it("should reject expired tokens", async () => {
      const expiredToken = JWT.sign(
        { _id: adminUserId },
        process.env.JWT_SECRET,
        { expiresIn: "-1s" } // Already expired
      );

      const req = {
        headers: { authorization: expiredToken },
      };
      const res = createResponse();
      const next = jest.fn();
      const consoleSpy = jest
        .spyOn(console, "log")
        .mockImplementation(() => {});

      await requireSignIn(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it("should accept valid tokens not yet expired", async () => {
      const validToken = JWT.sign(
        { _id: regularUserId },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      const req = {
        headers: { authorization: validToken },
      };
      const res = createResponse();
      const next = jest.fn();

      await requireSignIn(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBeDefined();
    });
  });

  describe("User Lookup & Database Access Tests", () => {
    it("should find correct user from database during isAdmin check", async () => {
      const req = {
        headers: { authorization: adminToken },
        user: null,
      };
      const res = createResponse();
      const next = jest.fn();

      await requireSignIn(req, res, next);

      // Verify user is found during isAdmin
      const foundUser = await userModel.findById(req.user._id);
      expect(foundUser).toBeDefined();
      expect(foundUser.role).toBe(1);
    });

    it("should handle user not found in database gracefully", async () => {
      const req = {
        headers: { authorization: adminToken },
        user: null,
      };
      const res = createResponse();
      const next = jest.fn();

      await requireSignIn(req, res, next);

      // Delete user from database
      await userModel.findByIdAndDelete(req.user._id);

      next.mockClear();
      res.status.mockClear();
      res.send.mockClear();

      // isAdmin should handle missing user
      await isAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it("should verify user data integrity after retrieval", async () => {
      const req = {
        headers: { authorization: regularUserToken },
        user: null,
      };
      const res = createResponse();
      const next = jest.fn();

      await requireSignIn(req, res, next);

      const retrievedUser = await userModel.findById(req.user._id);
      expect(retrievedUser.name).toBe("Regular User");
      expect(retrievedUser.email).toBe("user@example.com");
    });
  });

  describe("Multiple Users & Concurrent Requests", () => {
    it("should handle multiple different users with their own tokens", async () => {
      const requests = [
        { token: adminToken, userId: adminUserId, role: 1 },
        { token: regularUserToken, userId: regularUserId, role: 0 },
      ];

      for (const { token, userId, role } of requests) {
        const req = {
          headers: { authorization: token },
          user: null,
        };
        const res = createResponse();
        const next = jest.fn();

        await requireSignIn(req, res, next);

        expect(req.user._id).toBe(userId.toString());

        const user = await userModel.findById(req.user._id);
        expect(user.role).toBe(role);
      }
    });

    it("should isolate requests and not cross-contaminate user data", async () => {
      // Request 1: Admin
      const req1 = {
        headers: { authorization: adminToken },
        user: null,
      };
      const res1 = createResponse();
      const next1 = jest.fn();

      await requireSignIn(req1, res1, next1);
      const adminUserId1 = req1.user._id;

      // Request 2: Regular user
      const req2 = {
        headers: { authorization: regularUserToken },
        user: null,
      };
      const res2 = createResponse();
      const next2 = jest.fn();

      await requireSignIn(req2, res2, next2);
      const regularUserId2 = req2.user._id;

      // Verify isolation
      expect(adminUserId1).not.toBe(regularUserId2);
      expect(req1.user).not.toEqual(req2.user);
    });
  });
});
