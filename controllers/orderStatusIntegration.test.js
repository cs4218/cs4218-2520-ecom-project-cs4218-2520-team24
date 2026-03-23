// Carsten Joe Ng, A0255764W

import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { orderStatusController } from "./authController.js";
import orderModel from "../models/orderModel.js";
import userModel from "../models/userModel.js";
import productModel from "../models/productModel.js";
import categoryModel from "../models/categoryModel.js";

let mongoServer;

jest.setTimeout(60000);

// Helper to create mock response object
const createResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe("Order Status Transition & Persistence Integration Tests", () => {
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

  afterEach(async () => {
    await orderModel.deleteMany({});
    await userModel.deleteMany({});
    await productModel.deleteMany({});
    await categoryModel.deleteMany({});
  });

  let buyerId;
  let productId;
  let categoryId;

  beforeEach(async () => {
    const testUser = await new userModel({
      name: "Test User",
      email: "test@example.com",
      password: "hashed123",
      phone: "1234567890",
      address: "123 Main St",
      answer: "answer",
    }).save();
    buyerId = testUser._id;

    const testCategory = await new categoryModel({
      name: "Test Category",
      slug: "test-category",
    }).save();
    categoryId = testCategory._id;

    const testProduct = await new productModel({
      name: "Test Product",
      slug: "test-product",
      description: "A test product",
      price: 100,
      category: categoryId,
      quantity: 10,
      shipping: true,
    }).save();
    productId = testProduct._id;
  });

  describe("Valid Status Transitions - Complete Enum Matrix", () => {
    const statuses = ["Not Processing", "Processing", "Shipped", "Delivered", "Cancelled"];

    // Define all valid transitions (20 total: 5 statuses × 4 target statuses each)
    const transitionMatrix = [
      // From "Not Processing"
      { from: "Not Processing", to: "Processing", desc: "not processing → processing" },
      { from: "Not Processing", to: "Shipped", desc: "not processing → shipped" },
      { from: "Not Processing", to: "Delivered", desc: "not processing → delivered" },
      { from: "Not Processing", to: "Cancelled", desc: "not processing → cancelled" },

      // From "Processing"
      { from: "Processing", to: "Not Processing", desc: "processing → not processing (revert)" },
      { from: "Processing", to: "Shipped", desc: "processing → shipped" },
      { from: "Processing", to: "Delivered", desc: "processing → delivered" },
      { from: "Processing", to: "Cancelled", desc: "processing → cancelled" },

      // From "Shipped"
      { from: "Shipped", to: "Not Processing", desc: "shipped → not processing (revert)" },
      { from: "Shipped", to: "Processing", desc: "shipped → processing (revert)" },
      { from: "Shipped", to: "Delivered", desc: "shipped → delivered" },
      { from: "Shipped", to: "Cancelled", desc: "shipped → cancelled" },

      // From "Delivered"
      { from: "Delivered", to: "Not Processing", desc: "delivered → not processing (revert)" },
      { from: "Delivered", to: "Processing", desc: "delivered → processing (revert)" },
      { from: "Delivered", to: "Shipped", desc: "delivered → shipped (revert)" },
      { from: "Delivered", to: "Cancelled", desc: "delivered → cancelled" },

      // From "Cancelled"
      { from: "Cancelled", to: "Not Processing", desc: "cancelled → not processing (revert)" },
      { from: "Cancelled", to: "Processing", desc: "cancelled → processing (revert)" },
      { from: "Cancelled", to: "Shipped", desc: "cancelled → shipped (revert)" },
      { from: "Cancelled", to: "Delivered", desc: "cancelled → delivered (revert)" },
    ];

    transitionMatrix.forEach(({ from, to, desc }) => {
      it(`should transition from "${from}" to "${to}" (${desc})`, async () => {
        const order = await new orderModel({
          products: [productId],
          buyer: buyerId,
          payment: { success: true },
          status: from,
        }).save();

        expect(order.status).toBe(from);

        const req = { params: { orderId: order._id.toString() }, body: { status: to } };
        const res = createResponse();

        await orderStatusController(req, res);

        expect(res.json).toHaveBeenCalled();
        const returnedOrder = res.json.mock.calls[0][0];
        expect(returnedOrder.status).toBe(to);

        const updated = await orderModel.findById(order._id);
        expect(updated.status).toBe(to);
      });
    });

    it("should support all 5 valid enum statuses", async () => {
      for (const status of statuses) {
        const order = await new orderModel({
          products: [productId],
          buyer: buyerId,
          payment: { success: true },
          status,
        }).save();

        expect(order.status).toBe(status);
        await orderModel.findByIdAndDelete(order._id);
      }
    });
  });

  describe("Invalid Status Transitions - Prevented by Enum Validation", () => {
    it("should handle validation errors gracefully", async () => {
      const order = await new orderModel({
        products: [productId],
        buyer: buyerId,
        payment: { success: true },
        status: "Not Processing",
      }).save();

      const req = { params: { orderId: order._id.toString() }, body: { status: "Invalid Status" } };
      const res = createResponse();

      await orderStatusController(req, res);

      // With runValidators: true, invalid enum values should trigger error
      // We expect either res.status to be called with 500 or the order status to remain unchanged
      const dbOrder = await orderModel.findById(order._id);
      expect(dbOrder.status).toBe("Not Processing"); // Status should not change
    });
  });

  describe("Database Persistence", () => {
    it("should persist status change across multiple queries", async () => {
      const order = await new orderModel({
        products: [productId],
        buyer: buyerId,
        payment: { success: true },
        status: "Not Processing",
      }).save();

      // Transition status via controller
      const req = { params: { orderId: order._id.toString() }, body: { status: "Processing" } };
      const res = createResponse();

      await orderStatusController(req, res);

      expect(res.json).toHaveBeenCalled();

      // Query fresh from DB
      const freshOrder = await orderModel.findById(order._id);
      expect(freshOrder.status).toBe("Processing");

      // Another fresh query
      const anotherQuery = await orderModel.findById(order._id);
      expect(anotherQuery.status).toBe("Processing");
    });

    it("should update timestamps when status changes", async () => {
      const order = await new orderModel({
        products: [productId],
        buyer: buyerId,
        payment: { success: true },
        status: "Not Processing",
      }).save();

      const originalUpdatedAt = order.updatedAt;
      
      // Wait a bit to ensure timestamp differs
      await new Promise(resolve => setTimeout(resolve, 10));

      const req = { params: { orderId: order._id.toString() }, body: { status: "Processing" } };
      const res = createResponse();
      await orderStatusController(req, res);

      const updated = await orderModel.findById(order._id);
      expect(updated.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });

    it("should preserve all other order fields when updating status", async () => {
      const payment = { transactionId: "trx123", amount: 500 };
      const order = await new orderModel({
        products: [productId],
        buyer: buyerId,
        payment,
        status: "Not Processing",
      }).save();

      const req = { params: { orderId: order._id.toString() }, body: { status: "Processing" } };
      const res = createResponse();
      await orderStatusController(req, res);

      const updated = await orderModel.findById(order._id);
      expect(updated.buyer.toString()).toBe(buyerId.toString());
      expect(updated.payment).toEqual(payment);
      expect(updated.products.length).toBe(1);
      expect(updated.products[0].toString()).toBe(productId.toString());
    });

    it("should correctly reflect concurrent status updates (last write wins)", async () => {
      const order = await new orderModel({
        products: [productId],
        buyer: buyerId,
        payment: { success: true },
        status: "Not Processing",
      }).save();

      // Simulate concurrent updates
      const req1 = { params: { orderId: order._id.toString() }, body: { status: "Processing" } };
      const res1 = createResponse();
      await orderStatusController(req1, res1);

      const req2 = { params: { orderId: order._id.toString() }, body: { status: "Shipped" } };
      const res2 = createResponse();
      await orderStatusController(req2, res2);

      const final = await orderModel.findById(order._id);
      expect(final.status).toBe("Shipped");
    });
  });

  describe("Edge Cases", () => {
    it("should handle non-existent order ID gracefully", async () => {
      const fakeId = new mongoose.Types.ObjectId();

      const req = { params: { orderId: fakeId.toString() }, body: { status: "Processing" } };
      const res = createResponse();
      await orderStatusController(req, res);

      expect(res.json).toHaveBeenCalledWith(null);
    });

    it("should handle invalid order ID format", async () => {
      const req = { params: { orderId: "invalidId" }, body: { status: "Processing" } };
      const res = createResponse();
      await orderStatusController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe("Status Transition Bulk Operations", () => {
    it("should handle multiple orders with different statuses", async () => {
      const orders = await orderModel.insertMany([
        { products: [productId], buyer: buyerId, payment: {}, status: "Not Processing" },
        { products: [productId], buyer: buyerId, payment: {}, status: "Processing" },
        { products: [productId], buyer: buyerId, payment: {}, status: "Shipped" },
      ]);

      // Update each to next status
      const req1 = { params: { orderId: orders[0]._id.toString() }, body: { status: "Processing" } };
      const res1 = createResponse();
      await orderStatusController(req1, res1);

      const req2 = { params: { orderId: orders[1]._id.toString() }, body: { status: "Shipped" } };
      const res2 = createResponse();
      await orderStatusController(req2, res2);

      const req3 = { params: { orderId: orders[2]._id.toString() }, body: { status: "Delivered" } };
      const res3 = createResponse();
      await orderStatusController(req3, res3);

      expect(res1.json).toHaveBeenCalled();
      expect(res2.json).toHaveBeenCalled();
      expect(res3.json).toHaveBeenCalled();

      const updated = await orderModel.find();
      expect(updated[0].status).toBe("Processing");
      expect(updated[1].status).toBe("Shipped");
      expect(updated[2].status).toBe("Delivered");
    });
  });

  describe("All Valid Status Enum Values", () => {
    const validStatuses = ["Not Processing", "Processing", "Shipped", "Delivered", "Cancelled"];

    validStatuses.forEach((status) => {
      it(`should allow status: "${status}"`, async () => {
        const order = await new orderModel({
          products: [productId],
          buyer: buyerId,
          payment: { success: true },
          status: "Not Processing",
        }).save();

        const req = { params: { orderId: order._id.toString() }, body: { status } };
        const res = createResponse();
        await orderStatusController(req, res);

        expect(res.json).toHaveBeenCalled();
        const returnedOrder = res.json.mock.calls[0][0];
        expect(returnedOrder.status).toBe(status);

        const updated = await orderModel.findById(order._id);
        expect(updated.status).toBe(status);
      });
    });
  });

  describe("Full Order Lifecycle", () => {
    it("should successfully transition through complete order lifecycle", async () => {
      const order = await new orderModel({
        products: [productId],
        buyer: buyerId,
        payment: { success: true },
        status: "Not Processing",
      }).save();

      expect(order.status).toBe("Not Processing");

      // Step 1: Processing
      let req = { params: { orderId: order._id.toString() }, body: { status: "Processing" } };
      let res = createResponse();
      await orderStatusController(req, res);
      expect(res.json.mock.calls[0][0].status).toBe("Processing");

      // Step 2: Shipped
      req = { params: { orderId: order._id.toString() }, body: { status: "Shipped" } };
      res = createResponse();
      await orderStatusController(req, res);
      expect(res.json.mock.calls[0][0].status).toBe("Shipped");

      // Step 3: Delivered
      req = { params: { orderId: order._id.toString() }, body: { status: "Delivered" } };
      res = createResponse();
      await orderStatusController(req, res);
      expect(res.json.mock.calls[0][0].status).toBe("Delivered");

      // Verify final state in DB
      const final = await orderModel.findById(order._id);
      expect(final.status).toBe("Delivered");
    });

    it("should allow cancellation at early stages", async () => {
      const order = await new orderModel({
        products: [productId],
        buyer: buyerId,
        payment: { success: true },
        status: "Not Processing",
      }).save();

      const req = { params: { orderId: order._id.toString() }, body: { status: "Cancelled" } };
      const res = createResponse();
      await orderStatusController(req, res);

      expect(res.json.mock.calls[0][0].status).toBe("Cancelled");

      const cancelled = await orderModel.findById(order._id);
      expect(cancelled.status).toBe("Cancelled");
    });
  });

  describe("Data Integrity", () => {
    it("should not lose product references after status change", async () => {
      const product2 = await new productModel({
        name: "Product 2",
        slug: "product-2",
        description: "Second product",
        price: 50,
        category: categoryId,
        quantity: 5,
      }).save();

      const order = await new orderModel({
        products: [productId, product2._id],
        buyer: buyerId,
        payment: { success: true },
        status: "Not Processing",
      }).save();

      expect(order.products.length).toBe(2);

      const req = { params: { orderId: order._id.toString() }, body: { status: "Processing" } };
      const res = createResponse();
      await orderStatusController(req, res);

      const updated = await orderModel.findById(order._id).populate("products");
      expect(updated.products.length).toBe(2);
      expect(updated.products[0]._id.toString()).toBe(productId.toString());
      expect(updated.products[1]._id.toString()).toBe(product2._id.toString());
    });

    it("should not modify buyer information on status change", async () => {
      const order = await new orderModel({
        products: [productId],
        buyer: buyerId,
        payment: { success: true },
        status: "Not Processing",
      }).save();

      const req = { params: { orderId: order._id.toString() }, body: { status: "Processing" } };
      const res = createResponse();
      await orderStatusController(req, res);

      const updated = await orderModel.findById(order._id).populate("buyer");
      expect(updated.buyer._id.toString()).toBe(buyerId.toString());
      expect(updated.buyer.email).toBe("test@example.com");
    });
  });
});
