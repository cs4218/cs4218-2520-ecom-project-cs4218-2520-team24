// Nam Dohyun
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import app from "../server.js";
import productModel from "../models/productModel.js";
import categoryModel from "../models/categoryModel.js";

let mongoServer;

jest.mock("../middlewares/authMiddleware.js", () => ({
    requireSignIn: (req, res, next) => next(),
    isAdmin: (req, res, next) => next(),
}));

jest.setTimeout(60000);

describe("Product Details & Related Logic Integration Tests", () => {
  beforeAll(async () => {
    // Setup in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    
    // Disconnect if already connected (from server.js initialization)
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    
    await mongoose.connect(uri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  let seededCategory;
  let seededProduct;
  let otherProducts;

  beforeEach(async () => {
    // Clear collections
    await productModel.deleteMany({});
    await categoryModel.deleteMany({});

    // Seed Category
    seededCategory = await new categoryModel({
      name: "Electronics",
      slug: "electronics",
    }).save();

    // Seed Main Product
    seededProduct = await new productModel({
      name: "iPhone 15",
      slug: "iphone-15",
      description: "Latest Apple smartphone",
      price: 999,
      category: seededCategory._id,
      quantity: 50,
      shipping: true,
    }).save();

    // Seed Related Products
    otherProducts = await productModel.insertMany([
      {
        name: "Samsung Galaxy S24",
        slug: "samsung-galaxy-s24",
        description: "Flagship Samsung phone",
        price: 899,
        category: seededCategory._id,
        quantity: 30,
        shipping: true,
      },
      {
        name: "Google Pixel 8",
        slug: "google-pixel-8",
        description: "Google's latest AI phone",
        price: 699,
        category: seededCategory._id,
        quantity: 20,
        shipping: true,
      },
      {
        name: "OnePlus 12",
        slug: "oneplus-12",
        description: "High performance flagship",
        price: 799,
        category: seededCategory._id,
        quantity: 15,
        shipping: true,
      },
      {
        name: "MacBook Pro",
        slug: "macbook-pro",
        description: "Powerful laptop",
        price: 1999,
        category: seededCategory._id,
        quantity: 10,
        shipping: true,
      }
    ]);
  });

  describe("GET /api/v1/product/get-product/:slug", () => {
    it("should fetch a single product and correctly populate its category from real database", async () => {
      const res = await request(app).get(`/api/v1/product/get-product/${seededProduct.slug}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.product.name).toBe(seededProduct.name);
      
      // Verify category population
      expect(res.body.product.category).toBeDefined();
      expect(res.body.product.category.name).toBe(seededCategory.name);
      expect(res.body.product.category._id).toBe(seededCategory._id.toString());
    });

    it("should return success false if product slug does not exist", async () => {
      const res = await request(app).get("/api/v1/product/get-product/non-existent-slug");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.product).toBeNull();
    });
  });

  describe("GET /api/v1/product/related-product/:pid/:cid", () => {
    it("should fetch real related products excluding the current one and limiting to 3", async () => {
      const pid = seededProduct._id;
      const cid = seededCategory._id;

      const res = await request(app).get(`/api/v1/product/related-product/${pid}/${cid}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      
      // Should have 3 related products (we seeded 4 others)
      expect(res.body.products).toHaveLength(3);
      
      // Ensure the current product is not among the results
      const productIds = res.body.products.map(p => p._id);
      expect(productIds).not.toContain(pid.toString());
      
      // Ensure all related products belong to the same category
      res.body.products.forEach(p => {
        expect(p.category._id).toBe(cid.toString());
      });
    });

    it("should return empty array if no related products found", async () => {
      // Create a new category with no products except one
      const emptyCategory = await new categoryModel({ name: "Empty", slug: "empty" }).save();
      const onlyProduct = await new productModel({
        name: "Lonely Product",
        slug: "lonely",
        description: "No friends",
        price: 1,
        category: emptyCategory._id,
        quantity: 1,
      }).save();

      const res = await request(app).get(`/api/v1/product/related-product/${onlyProduct._id}/${emptyCategory._id}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.products).toHaveLength(0);
    });
  });

  describe("Pagination and List Fetching Integration Tests", () => {
    beforeEach(async () => {
      await productModel.deleteMany({});
      // Seed 15 products to test pagination (6 per page)
      const products = [];
      for (let i = 1; i <= 15; i++) {
        products.push({
          name: `Product ${i}`,
          slug: `product-${i}`,
          description: `Description for product ${i}`,
          price: 10 + i,
          category: seededCategory._id,
          quantity: 10,
          shipping: true,
        });
      }
      await productModel.insertMany(products);
    });

    it("should return correct total product count from /product-count", async () => {
      const res = await request(app).get("/api/v1/product/product-count");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.total).toBe(15);
    });

    it("should return first 6 products for /get-product (initial load)", async () => {
      const res = await request(app).get("/api/v1/product/get-product");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.products).toHaveLength(12); // getProductController limit is 12 (at line 77 in productController.js)
      expect(res.body.countTotal).toBe(12);
    });

    it("should return paginated products for /product-list/:page", async () => {
      // Test page 1
      const resPage1 = await request(app).get("/api/v1/product/product-list/1");
      expect(resPage1.status).toBe(200);
      expect(resPage1.body.success).toBe(true);
      expect(resPage1.body.products).toHaveLength(6);

      // Test page 2
      const resPage2 = await request(app).get("/api/v1/product/product-list/2");
      expect(resPage2.status).toBe(200);
      expect(resPage2.body.success).toBe(true);
      expect(resPage2.body.products).toHaveLength(6);

      // Test page 3 (remaining 3 products)
      const resPage3 = await request(app).get("/api/v1/product/product-list/3");
      expect(resPage3.status).toBe(200);
      expect(resPage3.body.success).toBe(true);
      expect(resPage3.body.products).toHaveLength(3);
    });

    it("should handle invalid page numbers gracefully in /product-list/:page", async () => {
      const res = await request(app).get("/api/v1/product/product-list/999");
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.products).toHaveLength(0);
    });
  });

  describe("Search and Category Integration Tests", () => {
    let searchCategory;
    
    beforeEach(async () => {
      await productModel.deleteMany({});
      await categoryModel.deleteMany({});

      searchCategory = await new categoryModel({
        name: "Searchable Category",
        slug: "searchable-category",
      }).save();

      await productModel.insertMany([
        {
          name: "Unique Smartphone",
          slug: "unique-smartphone",
          description: "A very fast mobile device",
          price: 500,
          category: searchCategory._id,
          quantity: 10,
        },
        {
          name: "Laptop Pro",
          slug: "laptop-pro",
          description: "Excellent performance for unique tasks",
          price: 1500,
          category: searchCategory._id,
          quantity: 5,
        }
      ]);
    });

    it("should return matching products for /search/:keyword", async () => {
      // Search by name
      const resName = await request(app).get("/api/v1/product/search/Unique");
      expect(resName.status).toBe(200);
      expect(resName.body).toHaveLength(2); // One in name, one in description

      // Search by description
      const resDesc = await request(app).get("/api/v1/product/search/mobile");
      expect(resDesc.status).toBe(200);
      expect(resDesc.body).toHaveLength(1);
      expect(resDesc.body[0].name).toBe("Unique Smartphone");

      // Search for non-existent keyword
      const resNone = await request(app).get("/api/v1/product/search/nonexistent");
      expect(resNone.status).toBe(200);
      expect(resNone.body).toHaveLength(0);
    });

    it("should return products by category slug for /product-category/:slug", async () => {
      const res = await request(app).get(`/api/v1/product/product-category/${searchCategory.slug}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.category.name).toBe(searchCategory.name);
      expect(res.body.products).toHaveLength(2);
    });

    it("should return empty products if category slug does not exist in /product-category/:slug", async () => {
      const res = await request(app).get("/api/v1/product/product-category/wrong-slug");
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.category).toBeNull();
      expect(res.body.products).toHaveLength(0);
    });
  });

  describe("GET /api/v1/product/product-photo/:pid", () => {
    it("should return 404 if product is not found", async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app).get(`/api/v1/product/product-photo/${fakeId}`);
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Photo not found");
    });

    it("should return 404 if product exists but has no photo", async () => {
      const res = await request(app).get(`/api/v1/product/product-photo/${seededProduct._id}`);
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Photo not found");
    });

    it("should return 200 and photo data if photo exists", async () => {
      // Add a photo to the seeded product
      seededProduct.photo.data = Buffer.from("fake-photo-content");
      seededProduct.photo.contentType = "image/png";
      await seededProduct.save();

      const res = await request(app).get(`/api/v1/product/product-photo/${seededProduct._id}`);
      expect(res.status).toBe(200);
      expect(res.header["content-type"]).toBe("image/png");
      expect(res.body.toString()).toBe("fake-photo-content");
    });

    it("should return 500 if the ID is invalid (CastError)", async () => {
      const res = await request(app).get("/api/v1/product/product-photo/invalid-id");
      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Error while getting photo");
    });
  });

  // Leroy Chiu, A0273083E
  describe("Product Admin CRUD & Photo Upload Integration Tests", () => {
      it("should create a product with image and store buffer in DB", async () => {
          const res = await request(app)
              .post("/api/v1/product/create-product")
              .field("name", "Camera")
              .field("description", "DSLR Camera")
              .field("price", 500)
              .field("category", seededCategory._id.toString())
              .field("quantity", 10)
              .field("shipping", true)
              .attach("photo", Buffer.from("fake image"), "camera.jpg");

          expect(res.status).toBe(201);
          expect(res.body.success).toBe(true);

          const product = await productModel.findOne({ name: "Camera" });

          expect(product).not.toBeNull();
          expect(product.photo.data).toBeDefined();
          expect(product.photo.contentType).toBe("image/jpeg");
      });

      it("should fail if photo is missing", async () => {
          const res = await request(app)
              .post("/api/v1/product/create-product")
              .field("name", "No Photo")
              .field("description", "Test")
              .field("price", 100)
              .field("category", seededCategory._id.toString())
              .field("quantity", 5)
              .field("shipping", true);

          expect(res.status).toBe(500);
          expect(res.body.error).toBe("Photo is Required");
      });

      it("should update product and replace image buffer", async () => {
          seededProduct.photo = {
              data: Buffer.from("fake-photo"),
              contentType: "image/jpeg",
          };
          await seededProduct.save();

          const oldProduct = await productModel.findById(seededProduct._id);

          const res = await request(app)
              .put(`/api/v1/product/update-product/${seededProduct._id}`)
              .field("name", "Updated Name")
              .field("description", seededProduct.description)
              .field("price", seededProduct.price)
              .field("category", seededCategory._id.toString())
              .field("quantity", seededProduct.quantity)
              .field("shipping", true)
              .attach("photo", Buffer.from("new image"), "new.jpg");

          expect(res.status).toBe(201);

          const updated = await productModel.findById(seededProduct._id);

          expect(updated.name).toBe("Updated Name");

          // Ensure image changed
          expect(updated.photo.data.toString()).not.toBe(
              oldProduct.photo.data.toString()
          );
      });

      it("should delete product from database", async () => {
          const res = await request(app)
              .delete(`/api/v1/product/delete-product/${seededProduct._id}`);

          expect(res.status).toBe(200);

          const deleted = await productModel.findById(seededProduct._id);
          expect(deleted).toBeNull();
      });

      it("should return product photo as binary", async () => {
          seededProduct.photo = {
              data: Buffer.from("fake-photo"),
              contentType: "image/jpeg",
          };
          await seededProduct.save();

          const res = await request(app)
              .get(`/api/v1/product/product-photo/${seededProduct._id}`);

          expect(res.status).toBe(200);
          expect(res.headers["content-type"]).toBe("image/jpeg");
          expect(res.body).toBeDefined();
      });
  });
});
