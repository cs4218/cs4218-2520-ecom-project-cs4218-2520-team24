// Leong Yu Jun Nicholas, A0257284W
import mongoose from "mongoose";
import braintree from "braintree";
import { brainTreePaymentController, productFiltersController, braintreeTokenController } from "./productController";
import orderModel from "../models/orderModel";
import productModel from "../models/productModel";
import userModel from "../models/userModel";

import { MongoMemoryServer } from "mongodb-memory-server";

// Mock Braintree Gateway
jest.mock("braintree", () => {
  const mockSale = jest.fn();
  const mockGenerate = jest.fn();
  return {
    BraintreeGateway: jest.fn().mockImplementation(() => ({
      transaction: {
        sale: mockSale,
      },
      clientToken: {
        generate: mockGenerate,
      }
    })),
    Environment: { Sandbox: "sandbox" },
    mockSale, // exported for tests
    mockGenerate,
  };
});


describe("Backend Integration: Payments & Filters", () => {
  let testUser, testProduct, mongoServer;

  beforeAll(async () => {
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    if (mongoServer) {
        await mongoServer.stop();
    }
    console.log.mockRestore();
    console.error.mockRestore();
  });

  beforeEach(async () => {
    // Clean DB before each test
    await orderModel.deleteMany({});
    await productModel.deleteMany({});
    await userModel.deleteMany({});
    jest.clearAllMocks();

    // Seed Data
    testUser = await new userModel({
      name: "Integration User",
      email: "testint@example.com",
      password: "password123",
      phone: "1234567890",
      address: "123 Test Ave",
      answer: "Test",
    }).save();

    testProduct = await new productModel({
      name: "Integration Product",
      slug: "integration-product",
      description: "Test description",
      price: 150,
      category: new mongoose.Types.ObjectId(),
      quantity: 5,
      shipping: true,
    }).save();
  });

  it("B1: should successfully capture payment, create an order, and link products", async () => {
    // Arrange
    braintree.mockSale.mockResolvedValueOnce({ success: true, transaction: { id: "txn_123" } });

    const req = {
      user: { _id: testUser._id },
      body: {
        nonce: "fake-valid-nonce",
        cart: [{ ...testProduct.toObject(), price: 150 }],
      },
    };
    const res = { json: jest.fn(), status: jest.fn().mockReturnThis(), send: jest.fn() };

    // Act
    await brainTreePaymentController(req, res);

    // Assert
    expect(braintree.mockSale).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ ok: true });

    // Verify DB Side Effects (Integration assertion)
    const storedOrder = await orderModel.findOne({ buyer: testUser._id }).populate("products");
    expect(storedOrder).not.toBeNull();
    expect(storedOrder.payment.success).toBe(true);
    expect(storedOrder.products[0]._id.toString()).toBe(testProduct._id.toString());
    expect(storedOrder.status).toBe("Not Process");
  });

  it("B2: should fail payment gracefully without creating an order in DB", async () => {
    // Arrange
    braintree.mockSale.mockRejectedValueOnce(new Error("Processor Declined"));

    const req = {
      user: { _id: testUser._id },
      body: { nonce: "fake-invalid-nonce", cart: [{ ...testProduct.toObject(), price: 150 }] },
    };
    const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };

    // Act
    await brainTreePaymentController(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalled();

    // Verify DB Side Effects - Order MUST NOT exist
    const ordersCount = await orderModel.countDocuments();
    expect(ordersCount).toBe(0);
  });

  it("B3: should return filtered results utilizing actual DB boundaries across attributes", async () => {
    // Arrange
    await new productModel({
      name: "Cheap Product",
      slug: "cheap",
      description: "Desc",
      price: 20,
      category: testProduct.category, // match category
      quantity: 10,
    }).save();

    const req = {
      body: {
        checked: [testProduct.category.toString()], // Category Filter
        radio: [50, 200], // Price Range Filter ($50 to $200)
      },
    };
    const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };

    // Act
    await productFiltersController(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(200);
    const responsePayload = res.send.mock.calls[0][0];
    
    expect(responsePayload.success).toBe(true);
    expect(responsePayload.products.length).toBe(1); // Should only return the $150 product, explicitly skipping the $20 one
    expect(responsePayload.products[0].name).toBe("Integration Product");
  });

  it("B4: should generate a braintree token successfully", async () => {
    // Arrange
    braintree.mockGenerate.mockImplementationOnce((args, cb) => cb(null, { clientToken: "test-token" }));
    const req = {};
    const res = { send: jest.fn(), status: jest.fn().mockReturnThis() };

    // Act
    await braintreeTokenController(req, res);

    // Assert
    expect(res.send).toHaveBeenCalledWith({ clientToken: "test-token" });
  });

  it("B5: should fail gracefully when token generation fails", async () => {
    // Arrange
    const errorObj = new Error("Gateway Error");
    braintree.mockGenerate.mockImplementationOnce((args, cb) => cb(errorObj, null));
    const req = {};
    const res = { send: jest.fn(), status: jest.fn().mockReturnThis() };

    // Act
    await braintreeTokenController(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith(errorObj);
  });

  it("B6: filter edge cases - should handle empty filters gracefully", async () => {
    // Arrange
    const req = { body: {} }; 
    const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };

    // Act
    await productFiltersController(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(200);
    const payload = res.send.mock.calls[0][0];
    expect(payload.success).toBe(true);
    expect(payload.products.length).toBeGreaterThan(0); // Returns all seed products
  });

  it("B7: filter edge cases - single filter only (category) applies correctly", async () => {
     // Arrange: only checking Category Filter, no price radio
     const req = { body: { checked: [testProduct.category.toString()] } };
     const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };
     
     // Act
     await productFiltersController(req, res);

     // Assert
     expect(res.status).toHaveBeenCalledWith(200);
     const payload = res.send.mock.calls[0][0];
     expect(payload.success).toBe(true);
     // Only testProduct was seeded in beforeEach
     expect(payload.products.length).toBe(1);
     expect(payload.products[0].name).toBe("Integration Product");
  });

  it("B8: should return 400 and NOT create order when Braintree returns result.success = false (card declined)", async () => {
    // Arrange: Braintree resolves but with success: false (e.g. card declined)
    braintree.mockSale.mockResolvedValueOnce({
      success: false,
      message: "Card Declined",
      transaction: { id: "txn_declined" },
    });

    const req = {
      user: { _id: testUser._id },
      body: {
        nonce: "fake-declined-nonce",
        cart: [{ ...testProduct.toObject(), price: 150 }],
      },
    };
    const res = { json: jest.fn(), status: jest.fn().mockReturnThis(), send: jest.fn() };

    // Act
    await brainTreePaymentController(req, res);

    // Assert: should return 400 with decline message, NOT 500
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({ message: "Card Declined" });

    // Verify DB Side Effects - Order MUST NOT exist after declined payment
    const ordersCount = await orderModel.countDocuments();
    expect(ordersCount).toBe(0);
  });

  it("B9: failed payment should not mutate product quantity or state", async () => {
    // Arrange: record original product state
    const originalProduct = await productModel.findById(testProduct._id);
    const originalQuantity = originalProduct.quantity;

    braintree.mockSale.mockRejectedValueOnce(new Error("Gateway Timeout"));

    const req = {
      user: { _id: testUser._id },
      body: { nonce: "fail-nonce", cart: [{ ...testProduct.toObject(), price: 150 }] },
    };
    const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };

    // Act
    await brainTreePaymentController(req, res);

    // Assert: product quantity remains unchanged
    const productAfter = await productModel.findById(testProduct._id);
    expect(productAfter.quantity).toBe(originalQuantity);
    expect(productAfter.name).toBe(originalProduct.name);
    expect(productAfter.price).toBe(originalProduct.price);
  });

  it("B10: should create order with multiple products correctly linked", async () => {
    // Arrange: seed a second product
    const secondProduct = await new productModel({
      name: "Second Product",
      slug: "second-product",
      description: "Another test item",
      price: 75,
      category: new mongoose.Types.ObjectId(),
      quantity: 3,
    }).save();

    braintree.mockSale.mockResolvedValueOnce({ success: true, transaction: { id: "txn_multi" } });

    const req = {
      user: { _id: testUser._id },
      body: {
        nonce: "fake-multi-nonce",
        cart: [
          { ...testProduct.toObject(), price: 150 },
          { ...secondProduct.toObject(), price: 75 },
        ],
      },
    };
    const res = { json: jest.fn(), status: jest.fn().mockReturnThis(), send: jest.fn() };

    // Act
    await brainTreePaymentController(req, res);

    // Assert
    expect(res.json).toHaveBeenCalledWith({ ok: true });

    // Verify the order links both products
    const storedOrder = await orderModel.findOne({ buyer: testUser._id }).populate("products");
    expect(storedOrder).not.toBeNull();
    expect(storedOrder.products).toHaveLength(2);

    const productIds = storedOrder.products.map((p) => p._id.toString());
    expect(productIds).toContain(testProduct._id.toString());
    expect(productIds).toContain(secondProduct._id.toString());

    // Verify the total amount sent to Braintree was correct (150 + 75 = 225)
    expect(braintree.mockSale).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 225 })
    );
  });

  it("B11: filter with price range only (no category) returns correct products", async () => {
    // Arrange: seed products at different price points
    await new productModel({
      name: "Budget Item",
      slug: "budget-item",
      description: "Cheap",
      price: 25,
      category: new mongoose.Types.ObjectId(),
      quantity: 10,
    }).save();

    // testProduct is $150 (seeded in beforeEach)
    const req = {
      body: {
        radio: [100, 200], // Price range filter only, no checked categories
      },
    };
    const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };

    // Act
    await productFiltersController(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(200);
    const payload = res.send.mock.calls[0][0];
    expect(payload.success).toBe(true);
    expect(payload.products.length).toBe(1); // Only the $150 product, not the $25 one
    expect(payload.products[0].name).toBe("Integration Product");
  });
});
