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
});
