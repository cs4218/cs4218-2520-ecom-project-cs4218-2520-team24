import categoryModel from "../models/categoryModel";
import slugify from "slugify";

import {
    createCategoryController,
    updateCategoryController,
    categoryController,
    singleCategoryController,
    deleteCategoryController
} from "./categoryController";

jest.mock("../models/categoryModel")
jest.mock("slugify", () => jest.fn((name) => name.toLowerCase()));

describe('createCategoryController', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("should return 400 if name is missing", async () => {
        const req = { body: {} };
        const res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
        };

        await createCategoryController(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith({
            error: "Name is required"
        });
    });

    it("should return 200 if category already exists", async () => {
        categoryModel.findOne.mockResolvedValue({name: "Electronics"});

        const req = {body: {name: "Electronics"}};
        const res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
        };

        await createCategoryController(req, res);

        expect(categoryModel.findOne).toHaveBeenCalledWith({ name: "Electronics" });
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({
            success: true,
            message: "Category already exists",
        });
    });

    it("should create new category", async () => {
        categoryModel.findOne.mockResolvedValue(null);

        categoryModel.prototype.save = jest.fn().mockResolvedValue({
            name: "Books",
            slug: "books",
        });

        const req = {body: {name: "Books"}};
        const res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
        };

        await createCategoryController(req, res);

        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.send).toHaveBeenCalledWith(
            expect.objectContaining({
            success: true,
            message: "New category created",
        }));
    });

    it("should handle errors", async () => {
        categoryModel.findOne.mockRejectedValue(new Error("Category Error"));

        const req = { body: {name: "Test"}};
        const res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn()
        };

        await createCategoryController(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith(
            expect.objectContaining({
                success: false,
                message: "Error in category",
            })
        );
    });
});

describe('updateCategoryController', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("should update category successfully", async () => {
        categoryModel.findByIdAndUpdate.mockResolvedValue({
            _id: "20",
            name: "New",
            slug: "new",
        });

        const req = {
            body: {name: "New"},
            params: {id: "20"},
        };
        const res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
        };

        await updateCategoryController(req, res);

        expect(categoryModel.findByIdAndUpdate).toHaveBeenCalledWith(
            "20", {name: "New", slug: "new"}, {new: true}
        );

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith(
            expect.objectContaining({
                success: true,
                message: "Category Updated Successfully",
            })
        );
    });

    it("should handle errors if update fails", async () => {
        categoryModel.findByIdAndUpdate.mockRejectedValue(new Error("Update error"));

        const req = {
            body: {name: "New"},
            params: {id: "20"},
        };
        const res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
        };

        await updateCategoryController(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith(
            expect.objectContaining({
                success: false,
                message: "Error while updating category",
            })
        );
    });
});

describe('categoryController', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("should list all categories", async () => {
        categoryModel.find.mockResolvedValue([
            {name: "Electronics"},
            {name: "Books"},
        ]);

        const req = {};
        const res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
        };

        await categoryController(req, res);

        expect(categoryModel.find).toHaveBeenCalledWith({});
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith(
            expect.objectContaining({
                success: true,
                message: "All Categories Listed",
            })
        );
    });

    it("should handle errors when failing to list all categories", async () => {
        categoryModel.find.mockRejectedValue(new Error("List all error"));

        const req = {};
        const res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
        };

        await categoryController(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith(
            expect.objectContaining({
                success: false,
                message: "Error while getting all categories",
            })
        );
    });
});

describe('singleCategoryController', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("should return single category successfully", async () => {
        categoryModel.findOne.mockResolvedValue({
            name: "Books",
            slug: "books"
        });

        const req = {
            params: {slug: "books"}
        };
        const res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
        };

        await singleCategoryController(req, res);

        expect(categoryModel.findOne).toHaveBeenCalledWith({slug: "books"});
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith(
            expect.objectContaining({
                success: true,
                message: "Get single category successfully",
            })
        );
    });

    it("should handle errors when failing to get a single category", async () => {
       categoryModel.findOne.mockRejectedValue(new Error("Single Category Error"));

        const req = {
            params: {slug: "books"}
        };
        const res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
        };

        await singleCategoryController(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith(
            expect.objectContaining({
                success: false,
                message: "Error while getting single category",
            })
        );
    });
});

describe('deleteCategoryController', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("should delete category successfully", async () => {
        categoryModel.findByIdAndDelete.mockResolvedValue({
            _id: "20"
        });

        const req = {
            params: {id: "20"}
        };
        const res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
        };

        await deleteCategoryController(req, res);

        expect(categoryModel.findByIdAndDelete).toHaveBeenCalledWith("20");
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({
            success: true,
            message: "Category deleted successfully",
        });
    });

    it("should handle errors when failing to delete category", async () => {
        categoryModel.findByIdAndDelete.mockRejectedValue(new Error("Deletion error"));

        const req = {
            params: {id: "20"}
        };
        const res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
        };

        await deleteCategoryController(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith(
            expect.objectContaining({
                success: false,
                message: "Error while deleting category",
            })
        );
    });
});