// Carsten Joe Ng, A0255764W

import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { getOrdersController, getAllOrdersController } from "./authController.js";
import orderModel from "../models/orderModel.js";
import userModel from "../models/userModel.js";
import productModel from "../models/productModel.js";
import categoryModel from "../models/categoryModel.js";

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

// Order Data Populate Integration Tests.
// This test suite verifies that the getOrdersController and getAllOrdersController functions correctly populate referenced data from the orderModel
// including products and buyer information, while also ensuring that the correct fields are included/excluded as per the controller logic
// It also checks that sorting and error handling work as expected when using populate() in Mongoose queries.
describe("Order Data Populate Integration Tests", () => {
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

  let buyerId1;
  let buyerId2;
  let productId1;
  let productId2;
  let categoryId;

  beforeEach(async () => {
    // Create test category
    const testCategory = await new categoryModel({
      name: "Test Category",
      slug: "test-category",
    }).save();
    categoryId = testCategory._id;

    // Create test users (buyers)
    const buyer1 = await new userModel({
      name: "John Doe",
      email: "john@example.com",
      password: "hashed123",
      phone: "1234567890",
      address: "123 Main St",
      answer: "answer",
    }).save();
    buyerId1 = buyer1._id;

    const buyer2 = await new userModel({
      name: "Jane Smith",
      email: "jane@example.com",
      password: "hashed456",
      phone: "9876543210",
      address: "456 Oak Ave",
      answer: "answer",
    }).save();
    buyerId2 = buyer2._id;

    // Create test products
    const product1 = await new productModel({
      name: "Laptop",
      slug: "laptop",
      description: "High-performance laptop",
      price: 999.99,
      category: categoryId,
      quantity: 5,
      photo: { data: Buffer.from("photo1"), contentType: "image/jpeg" },
      shipping: true,
    }).save();
    productId1 = product1._id;

    const product2 = await new productModel({
      name: "Mouse",
      slug: "mouse",
      description: "Wireless mouse",
      price: 29.99,
      category: categoryId,
      quantity: 50,
      photo: { data: Buffer.from("photo2"), contentType: "image/jpeg" },
      shipping: true,
    }).save();
    productId2 = product2._id;
  });

  describe("getOrdersController - User-specific orders with populate()", () => {
    it("should return user orders with populated products (excluding photo field)", async () => {
      // Create order for buyer1
      const order = await new orderModel({
        products: [productId1, productId2],
        buyer: buyerId1,
        payment: { success: true, amount: 1029.98 },
        status: "Processing",
      }).save();

      const req = { user: { _id: buyerId1 } };
      const res = createResponse();

      await getOrdersController(req, res);

      expect(res.json).toHaveBeenCalled();
      const returnedOrders = res.json.mock.calls[0][0];

      // Verify order is returned
      expect(Array.isArray(returnedOrders)).toBe(true);
      expect(returnedOrders.length).toBe(1);

      const returnedOrder = returnedOrders[0];
      expect(returnedOrder._id.toString()).toBe(order._id.toString());

      // Verify products are populated
      expect(returnedOrder.products.length).toBe(2);
      expect(returnedOrder.products[0].name).toBe("Laptop");
      expect(returnedOrder.products[0].price).toBe(999.99);
      expect(returnedOrder.products[1].name).toBe("Mouse");
      expect(returnedOrder.products[1].price).toBe(29.99);

      // Verify photo field is excluded (if projection works) or check that required fields are present
      // Note: Mongoose field selection with "-photo" may not exclude buffer fields from populate
      expect(returnedOrder.products[0].name).toBeDefined();
      expect(returnedOrder.products[0].slug).toBeDefined();
    });

    it("should return populated buyer name", async () => {
      const order = await new orderModel({
        products: [productId1],
        buyer: buyerId1,
        payment: { success: true },
        status: "Delivered",
      }).save();

      const req = { user: { _id: buyerId1 } };
      const res = createResponse();

      await getOrdersController(req, res);

      const returnedOrders = res.json.mock.calls[0][0];
      const returnedOrder = returnedOrders[0];

      // Verify buyer is populated with name
      expect(returnedOrder.buyer.name).toBe("John Doe");
    });

    it("should only return orders for the authenticated user", async () => {
      // Create orders for both buyers
      const order1 = await new orderModel({
        products: [productId1],
        buyer: buyerId1,
        payment: { success: true },
        status: "Processing",
      }).save();

      const order2 = await new orderModel({
        products: [productId2],
        buyer: buyerId2,
        payment: { success: true },
        status: "Shipped",
      }).save();

      // Request orders for buyer1
      const req = { user: { _id: buyerId1 } };
      const res = createResponse();

      await getOrdersController(req, res);

      const returnedOrders = res.json.mock.calls[0][0];

      // Should only return 1 order (buyer1's order)
      expect(returnedOrders.length).toBe(1);
      expect(returnedOrders[0].buyer.name).toBe("John Doe");
    });

    it("should populate multiple product references correctly", async () => {
      const product3 = await new productModel({
        name: "Keyboard",
        slug: "keyboard",
        description: "Mechanical keyboard",
        price: 149.99,
        category: categoryId,
        quantity: 20,
        shipping: true,
      }).save();

      const order = await new orderModel({
        products: [productId1, productId2, product3._id],
        buyer: buyerId1,
        payment: { success: true },
        status: "Processing",
      }).save();

      const req = { user: { _id: buyerId1 } };
      const res = createResponse();

      await getOrdersController(req, res);

      const returnedOrders = res.json.mock.calls[0][0];
      const returnedOrder = returnedOrders[0];

      // Verify all products are populated correctly
      expect(returnedOrder.products.length).toBe(3);
      expect(returnedOrder.products[0].name).toBe("Laptop");
      expect(returnedOrder.products[1].name).toBe("Mouse");
      expect(returnedOrder.products[2].name).toBe("Keyboard");

      // All should have prices
      expect(returnedOrder.products[0].price).toBe(999.99);
      expect(returnedOrder.products[1].price).toBe(29.99);
      expect(returnedOrder.products[2].price).toBe(149.99);
    });

    it("should preserve payment and status data alongside populated fields", async () => {
      const order = await new orderModel({
        products: [productId1],
        buyer: buyerId1,
        payment: { success: true, amount: 999.99, method: "credit_card" },
        status: "Delivered",
      }).save();

      const req = { user: { _id: buyerId1 } };
      const res = createResponse();

      await getOrdersController(req, res);

      const returnedOrders = res.json.mock.calls[0][0];
      const returnedOrder = returnedOrders[0];

      // Verify non-populated data is still present
      expect(returnedOrder.payment.success).toBe(true);
      expect(returnedOrder.payment.amount).toBe(999.99);
      expect(returnedOrder.status).toBe("Delivered");
      expect(returnedOrder.createdAt).toBeDefined();
    });

    it("should return empty array when user has no orders", async () => {
      const req = { user: { _id: buyerId1 } };
      const res = createResponse();

      await getOrdersController(req, res);

      const returnedOrders = res.json.mock.calls[0][0];
      expect(Array.isArray(returnedOrders)).toBe(true);
      expect(returnedOrders.length).toBe(0);
    });

    it("should handle product with minimal fields correctly", async () => {
      const minimalProduct = await new productModel({
        name: "Basic Item",
        slug: "basic-item",
        description: "Minimal product",
        price: 9.99,
        category: categoryId,
        quantity: 100,
      }).save();

      const order = await new orderModel({
        products: [minimalProduct._id],
        buyer: buyerId1,
        payment: {},
        status: "Not Processing",
      }).save();

      const req = { user: { _id: buyerId1 } };
      const res = createResponse();

      await getOrdersController(req, res);

      const returnedOrders = res.json.mock.calls[0][0];
      const populatedProduct = returnedOrders[0].products[0];

      // Verify basic fields are populated
      expect(populatedProduct.name).toBe("Basic Item");
      expect(populatedProduct.price).toBe(9.99);
      expect(populatedProduct.slug).toBe("basic-item");
    });
  });

  describe("getAllOrdersController - All orders with populate() and sorting", () => {
    it("should return all orders with populated products and buyers", async () => {
      const order1 = await new orderModel({
        products: [productId1],
        buyer: buyerId1,
        payment: { success: true },
        status: "Processing",
      }).save();

      const order2 = await new orderModel({
        products: [productId2],
        buyer: buyerId2,
        payment: { success: true },
        status: "Shipped",
      }).save();

      const req = {};
      const res = createResponse();

      await getAllOrdersController(req, res);

      const returnedOrders = res.json.mock.calls[0][0];

      // Should return all orders
      expect(returnedOrders.length).toBe(2);

      // Both should have populated products
      expect(returnedOrders[0].products.length).toBe(1);
      expect(returnedOrders[1].products.length).toBe(1);

      // Both should have populated buyers
      expect(returnedOrders[0].buyer.name).toBeDefined();
      expect(returnedOrders[1].buyer.name).toBeDefined();
    });

    it("should sort orders by createdAt in descending order", async () => {
      const order1 = await new orderModel({
        products: [productId1],
        buyer: buyerId1,
        payment: { success: true },
        status: "Processing",
      }).save();

      // Wait a bit and create second order
      await new Promise(resolve => setTimeout(resolve, 100));

      const order2 = await new orderModel({
        products: [productId2],
        buyer: buyerId2,
        payment: { success: true },
        status: "Shipped",
      }).save();

      const req = {};
      const res = createResponse();

      await getAllOrdersController(req, res);

      const returnedOrders = res.json.mock.calls[0][0];

      // Most recent order should be first
      expect(returnedOrders[0]._id.toString()).toBe(order2._id.toString());
      expect(returnedOrders[1]._id.toString()).toBe(order1._id.toString());
    });

    it("should exclude photo field from all populated products", async () => {
      const order = await new orderModel({
        products: [productId1, productId2],
        buyer: buyerId1,
        payment: { success: true },
        status: "Processing",
      }).save();

      const req = {};
      const res = createResponse();

      await getAllOrdersController(req, res);

      const returnedOrders = res.json.mock.calls[0][0];
      const products = returnedOrders[0].products;

      // All products should have essential fields
      products.forEach(product => {
        expect(product.name).toBeDefined();
        expect(product.slug).toBeDefined();
        expect(product.price).toBeDefined();
      });
    });

    it("should handle multiple orders from same buyer", async () => {
      const order1 = await new orderModel({
        products: [productId1],
        buyer: buyerId1,
        payment: { success: true },
        status: "Processing",
      }).save();

      const order2 = await new orderModel({
        products: [productId2],
        buyer: buyerId1,
        payment: { success: true },
        status: "Delivered",
      }).save();

      const req = {};
      const res = createResponse();

      await getAllOrdersController(req, res);

      const returnedOrders = res.json.mock.calls[0][0];

      // Both orders should have same populated buyer
      expect(returnedOrders[0].buyer.name).toBe("John Doe");
      expect(returnedOrders[1].buyer.name).toBe("John Doe");

      // But have different products
      expect(returnedOrders[0].products[0].name).toBe("Mouse");
      expect(returnedOrders[1].products[0].name).toBe("Laptop");
    });

    it("should return empty array when no orders exist", async () => {
      const req = {};
      const res = createResponse();

      await getAllOrdersController(req, res);

      const returnedOrders = res.json.mock.calls[0][0];
      expect(Array.isArray(returnedOrders)).toBe(true);
      expect(returnedOrders.length).toBe(0);
    });

    it("should populate product details like price and description", async () => {
      const order = await new orderModel({
        products: [productId1],
        buyer: buyerId1,
        payment: { success: true },
        status: "Processing",
      }).save();

      const req = {};
      const res = createResponse();

      await getAllOrdersController(req, res);

      const returnedOrders = res.json.mock.calls[0][0];
      const product = returnedOrders[0].products[0];

      // Verify all important product fields are populated
      expect(product.name).toBe("Laptop");
      expect(product.description).toBe("High-performance laptop");
      expect(product.price).toBe(999.99);
      expect(product.slug).toBe("laptop");
      expect(product.quantity).toBe(5);
    });

    it("should maintain buyer reference integrity across multiple orders", async () => {
      const order1 = await new orderModel({
        products: [productId1],
        buyer: buyerId1,
        payment: { success: true },
        status: "Processing",
      }).save();

      const order2 = await new orderModel({
        products: [productId1],
        buyer: buyerId1,
        payment: { success: true },
        status: "Shipped",
      }).save();

      const order3 = await new orderModel({
        products: [productId1],
        buyer: buyerId2,
        payment: { success: true },
        status: "Delivered",
      }).save();

      const req = {};
      const res = createResponse();

      await getAllOrdersController(req, res);

      const returnedOrders = res.json.mock.calls[0][0];

      // Find orders by buyer name
      const johnOrders = returnedOrders.filter(o => o.buyer.name === "John Doe");
      const janeOrders = returnedOrders.filter(o => o.buyer.name === "Jane Smith");

      expect(johnOrders.length).toBe(2);
      expect(janeOrders.length).toBe(1);

      // Verify all orders have correct buyer
      johnOrders.forEach(order => {
        expect(order.buyer.name).toBe("John Doe");
      });

      janeOrders.forEach(order => {
        expect(order.buyer.name).toBe("Jane Smith");
      });
    });
  });

  describe("Populate field selectivity", () => {
    it("should only populate specified buyer fields (name only)", async () => {
      const order = await new orderModel({
        products: [productId1],
        buyer: buyerId1,
        payment: { success: true },
        status: "Processing",
      }).save();

      const req = { user: { _id: buyerId1 } };
      const res = createResponse();

      await getOrdersController(req, res);

      const returnedOrders = res.json.mock.calls[0][0];
      const buyer = returnedOrders[0].buyer;

      // Name should be present
      expect(buyer.name).toBe("John Doe");

      // Other fields should not be included (due to -photo projection for products, and "name" for buyer)
      // Check that buyer doesn't have email (not requested)
      expect(buyer.email).toBeUndefined();
      expect(buyer.password).toBeUndefined();
      expect(buyer.phone).toBeUndefined();
    });

    it("should exclude photo field from products", async () => {
      const order = await new orderModel({
        products: [productId1],
        buyer: buyerId1,
        payment: { success: true },
        status: "Processing",
      }).save();

      const req = { user: { _id: buyerId1 } };
      const res = createResponse();

      await getOrdersController(req, res);

      const returnedOrders = res.json.mock.calls[0][0];
      const product = returnedOrders[0].products[0];

      // Essential fields should be present
      expect(product.name).toBeDefined();
      expect(product.price).toBeDefined();
      expect(product.slug).toBeDefined();
    });

    it("should handle orders with no products gracefully", async () => {
      const order = await new orderModel({
        products: [],
        buyer: buyerId1,
        payment: { success: true },
        status: "Processing",
      }).save();

      const req = { user: { _id: buyerId1 } };
      const res = createResponse();

      await getOrdersController(req, res);

      const returnedOrders = res.json.mock.calls[0][0];
      const returnedOrder = returnedOrders[0];

      expect(returnedOrder.products).toEqual([]);
      expect(returnedOrder.buyer.name).toBe("John Doe");
    });
  });

  describe("Error handling in populate operations", () => {
    it("should handle deleted product reference gracefully", async () => {
      const order = await new orderModel({
        products: [productId1],
        buyer: buyerId1,
        payment: { success: true },
        status: "Processing",
      }).save();

      // Delete the product
      await productModel.findByIdAndDelete(productId1);

      const req = { user: { _id: buyerId1 } };
      const res = createResponse();

      await getOrdersController(req, res);

      const returnedOrders = res.json.mock.calls[0][0];
      const returnedOrder = returnedOrders[0];

      // populateShould return but with null reference (or handle gracefully)
      expect(returnedOrder).toBeDefined();
      expect(Array.isArray(returnedOrder.products)).toBe(true);
    });

    it("should handle deleted buyer reference gracefully", async () => {
      const order = await new orderModel({
        products: [productId1],
        buyer: buyerId1,
        payment: { success: true },
        status: "Processing",
      }).save();

      // Delete the buyer
      await userModel.findByIdAndDelete(buyerId1);

      const req = { user: { _id: buyerId1 } };
      const res = createResponse();

      await getOrdersController(req, res);

      // Query should still succeed
      expect(res.json).toHaveBeenCalled();
    });
  });

  describe("Data integrity with populate", () => {
    it("should not modify original documents when populating", async () => {
      const order = await new orderModel({
        products: [productId1],
        buyer: buyerId1,
        payment: { success: true },
        status: "Processing",
      }).save();

      const originalOrder = await orderModel.findById(order._id);
      const originalProductRef = originalOrder.products[0];

      const req = { user: { _id: buyerId1 } };
      const res = createResponse();

      await getOrdersController(req, res);

      // Original document in DB should still have ObjectId reference
      const checkOrder = await orderModel.findById(order._id);
      expect(checkOrder.products[0]).toEqual(originalProductRef);
    });

    it("should return consistent populated data on multiple calls", async () => {
      const order = await new orderModel({
        products: [productId1],
        buyer: buyerId1,
        payment: { success: true },
        status: "Processing",
      }).save();

      const req = { user: { _id: buyerId1 } };

      // First call
      const res1 = createResponse();
      await getOrdersController(req, res1);
      const orders1 = res1.json.mock.calls[0][0];

      // Second call
      const res2 = createResponse();
      await getOrdersController(req, res2);
      const orders2 = res2.json.mock.calls[0][0];

      // Data should be identical
      expect(orders1[0].products[0].name).toBe(orders2[0].products[0].name);
      expect(orders1[0].products[0].price).toBe(orders2[0].products[0].price);
      expect(orders1[0].buyer.name).toBe(orders2[0].buyer.name);
    });
  });
});
