// Leroy Chiu, A0273083E
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

import app from "../server.js";
import categoryModel from "../models/categoryModel.js";
import productModel from "../models/productModel.js";

let mongoServer;

jest.mock("../middlewares/authMiddleware.js", () => ({
    requireSignIn: (req, res, next) => next(),
    isAdmin: (req, res, next) => next(),
}));

jest.setTimeout(60000);

describe("Category & Public Assets Integration Tests", () => {

    // ------------------ SETUP ------------------
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
        await categoryModel.deleteMany({});
        await productModel.deleteMany({});
    });

    // =========================================================
    // 🧪 CATEGORY CRUD LIFECYCLE
    // =========================================================

    describe("Category CRUD Integration Tests", () => {

        it("should create a new category and persist in DB", async () => {
            const res = await request(app)
                .post("/api/v1/category/create-category")
                .send({ name: "Electronics" });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.category.name).toBe("Electronics");

            const category = await categoryModel.findOne({ name: "Electronics" });
            expect(category).not.toBeNull();
        });

        it("should fail if name is missing", async () => {
            const res = await request(app)
                .post("/api/v1/category/create-category")
                .send({});

            expect(res.status).toBe(400);
            expect(res.body.error).toBe("Name is required");
        });

        it("should not create duplicate category", async () => {
            await new categoryModel({ name: "Books", slug: "books" }).save();

            const res = await request(app)
                .post("/api/v1/category/create-category")
                .send({ name: "Books" });

            expect(res.status).toBe(200);
            expect(res.body.message).toBe("Category already exists");

            const categories = await categoryModel.find({ name: "Books" });
            expect(categories.length).toBe(1);
        });

        it("should fetch all categories", async () => {
            await categoryModel.insertMany([
                { name: "A", slug: "a" },
                { name: "B", slug: "b" }
            ]);

            const res = await request(app)
                .get("/api/v1/category/get-category");

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.category).toHaveLength(2);
        });

        it("should update category name and slug", async () => {
            const category = await new categoryModel({
                name: "Old",
                slug: "old"
            }).save();

            const res = await request(app)
                .put(`/api/v1/category/update-category/${category._id}`)
                .send({ name: "New" });

            expect(res.status).toBe(200);
            expect(res.body.category.name).toBe("New");
            expect(res.body.category.slug).toBe("new");

            const updated = await categoryModel.findById(category._id);
            expect(updated.name).toBe("New");
        });

        it("should delete category from DB", async () => {
            const category = await new categoryModel({
                name: "ToDelete",
                slug: "todelete"
            }).save();

            const res = await request(app)
                .delete(`/api/v1/category/delete-category/${category._id}`);

            expect(res.status).toBe(200);

            const deleted = await categoryModel.findById(category._id);
            expect(deleted).toBeNull();
        });

        it("should fetch category by slug", async () => {
            const category = await new categoryModel({
                name: "Fashion",
                slug: "fashion"
            }).save();

            const res = await request(app)
                .get(`/api/v1/category/single-category/${category.slug}`);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.category.name).toBe("Fashion");
        });

        it("should return null for non-existent slug", async () => {
            const res = await request(app)
                .get("/api/v1/category/single-category/does-not-exist");

            expect(res.status).toBe(200);
            expect(res.body.category).toBeNull();
        });
    });

    // =========================================================
    // 🧪 PUBLIC ASSETS & CATEGORY RETRIEVAL
    // =========================================================

    describe("Public Assets & Category Retrieval Integration Tests", () => {

        let category;
        let product;

        beforeEach(async () => {
            category = await new categoryModel({
                name: "Media",
                slug: "media"
            }).save();

            product = await new productModel({
                name: "Camera",
                slug: "camera",
                description: "Test camera",
                price: 100,
                category: category._id,
                quantity: 5,
                shipping: true,
                photo: {
                    data: Buffer.from("fake image data"),
                    contentType: "image/jpeg"
                }
            }).save();
        });

        it("should return product photo with correct headers and binary data", async () => {
            const res = await request(app)
                .get(`/api/v1/product/product-photo/${product._id}`);

            expect(res.status).toBe(200);
            expect(res.headers["content-type"]).toBe("image/jpeg");
            expect(res.body).toBeDefined();
        });

        it("should handle product with no photo gracefully", async () => {
            const noPhotoProduct = await new productModel({
                name: "NoPhoto",
                slug: "nophoto",
                description: "No image",
                price: 50,
                category: category._id,
                quantity: 1,
                shipping: true
            }).save();

            const res = await request(app)
                .get(`/api/v1/product/product-photo/${noPhotoProduct._id}`);

            expect(res.status).toBe(404);
        });

        it("should retrieve category by slug correctly", async () => {
            const res = await request(app)
                .get(`/api/v1/category/single-category/${category.slug}`);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.category.name).toBe("Media");
        });

        it("should fetch products by category slug", async () => {
            const res = await request(app)
                .get(`/api/v1/product/product-category/${category.slug}`);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.category.name).toBe("Media");
            expect(res.body.products).toHaveLength(1);
        });

        it("should return empty results for invalid category slug", async () => {
            const res = await request(app)
                .get("/api/v1/product/product-category/invalid");

            expect(res.status).toBe(200);
            expect(res.body.category).toBeNull();
            expect(res.body.products).toHaveLength(0);
        });
    });

});