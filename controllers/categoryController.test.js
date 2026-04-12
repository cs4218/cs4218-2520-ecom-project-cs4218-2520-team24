// Leroy Chiu, A0273083E
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
  __esModule: true,
  default: mockSlugify,
}));

const createRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
};

describe("Category controllers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("validates category creation", async () => {
    const { createCategoryController } = await import(
      "../controllers/categoryController.js"
    );
    const res = createRes();

    await createCategoryController({ body: {} }, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({ error: "Name is required" });
  });

  it("returns existing category", async () => {
    const { createCategoryController } = await import(
      "../controllers/categoryController.js"
    );
    mockCategoryModel.findOne.mockResolvedValueOnce({
      _id: "cat-1",
      name: "Books",
    });
    const res = createRes();

    await createCategoryController({ body: { name: "Books" } }, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      message: "Category already exists",
    });
  });

  it("creates a category", async () => {
    const { createCategoryController } = await import(
      "../controllers/categoryController.js"
    );
    mockCategoryModel.findOne.mockResolvedValueOnce(null);
    mockSave.mockResolvedValueOnce({
      _id: "cat-1",
      name: "Books",
      slug: "slug-Books",
    });
    const res = createRes();

    await createCategoryController({ body: { name: "Books" } }, res);

    expect(mockSlugify).toHaveBeenCalledWith("Books");
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: "New category created",
      })
    );
  });

  it("handles create category errors", async () => {
    const { createCategoryController } = await import(
      "../controllers/categoryController.js"
    );
    mockCategoryModel.findOne.mockRejectedValueOnce(new Error("db"));
    const res = createRes();

    await createCategoryController({ body: { name: "Books" } }, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Error in category",
      })
    );
  });

  it("updates a category", async () => {
    const { updateCategoryController } = await import(
      "../controllers/categoryController.js"
    );
    mockCategoryModel.findByIdAndUpdate.mockResolvedValueOnce({
      _id: "cat-1",
      name: "Books",
    });
    const res = createRes();

    await updateCategoryController(
      { params: { id: "cat-1" }, body: { name: "Books" } },
      res
    );

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: "Category Updated Successfully",
      })
    );
  });

  it("handles update category errors", async () => {
    const { updateCategoryController } = await import(
      "../controllers/categoryController.js"
    );
    mockCategoryModel.findByIdAndUpdate.mockRejectedValueOnce(new Error("db"));
    const res = createRes();

    await updateCategoryController(
      { params: { id: "cat-1" }, body: { name: "Books" } },
      res
    );

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Error while updating category",
      })
    );
  });

  it("lists all categories", async () => {
    const { categoryController } = await import(
      "../controllers/categoryController.js"
    );
    mockCategoryModel.find.mockResolvedValueOnce([{ _id: "cat-1" }]);
    const res = createRes();

    await categoryController({}, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: "All Categories Listed",
      })
    );
  });

  it("handles list categories errors", async () => {
    const { categoryController } = await import(
      "../controllers/categoryController.js"
    );
    mockCategoryModel.find.mockRejectedValueOnce(new Error("db"));
    const res = createRes();

    await categoryController({}, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Error while getting all categories",
      })
    );
  });

  it("returns a single category", async () => {
    const { singleCategoryController } = await import(
      "../controllers/categoryController.js"
    );
    mockCategoryModel.findOne.mockResolvedValueOnce({ _id: "cat-1" });
    const res = createRes();

    await singleCategoryController({ params: { slug: "books" } }, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: "Get single category successfully",
      })
    );
  });

  it("handles single category errors", async () => {
    const { singleCategoryController } = await import(
      "../controllers/categoryController.js"
    );
    mockCategoryModel.findOne.mockRejectedValueOnce(new Error("db"));
    const res = createRes();

    await singleCategoryController({ params: { slug: "books" } }, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Error while getting single category",
      })
    );
  });

  it("deletes a category", async () => {
    const { deleteCategoryController } = await import(
      "../controllers/categoryController.js"
    );
    mockCategoryModel.findByIdAndDelete.mockResolvedValueOnce({ _id: "cat-1" });
    const res = createRes();

    await deleteCategoryController({ params: { id: "cat-1" } }, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: "Category deleted successfully",
      })
    );
  });

  it("handles delete category errors", async () => {
    const { deleteCategoryController } = await import(
      "../controllers/categoryController.js"
    );
    mockCategoryModel.findByIdAndDelete.mockRejectedValueOnce(new Error("db"));
    const res = createRes();

    await deleteCategoryController({ params: { id: "cat-1" } }, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Error while deleting category",
      })
    );
  });
});
