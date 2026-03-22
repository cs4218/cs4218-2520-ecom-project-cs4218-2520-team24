const mockSave = jest.fn();
const mockCategoryModel = jest.fn(() => ({ save: mockSave }));
mockCategoryModel.findOne = jest.fn();
mockCategoryModel.findByIdAndUpdate = jest.fn();
mockCategoryModel.find = jest.fn();
mockCategoryModel.findByIdAndDelete = jest.fn();

const mockSlugify = jest.fn((value) => `slug-${value}`);

jest.mock("../models/categoryModel.js", () => ({
  __esModule: true,
  default: mockCategoryModel,
}));

jest.mock("slugify", () => ({
    );
  });

  it("returns all categories", async () => {
    const { categoryControlller } = await import(
                message: "Error while getting all categories",
            })
        );
        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
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
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {}); 
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
        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
    });
});

describe('deleteCategoryController', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    it("should delete category successfully", async () => {
        const mockCategory = { _id: "20" };
        categoryModel.findByIdAndDelete.mockResolvedValue(mockCategory);

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
            category: mockCategory,
            success: true,
            message: "Category deleted successfully",
        });
    });

    it("should handle errors when failing to delete category", async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
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
        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
    });
});
