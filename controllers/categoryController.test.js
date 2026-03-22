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

  it("creates a new category", async () => {
    const { createCategoryController } = await import(
      "../controllers/categoryController.js"
    );
    mockCategoryModel.findOne.mockResolvedValueOnce(null);
    mockSave.mockResolvedValueOnce({ _id: "cat-1", name: "Shoes" });

    const res = createRes();
    await createCategoryController({ body: { name: "Shoes" } }, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: "new category created",
      })
    );
    expect(mockSlugify).toHaveBeenCalledWith("Shoes");
  });

  it("validates category name", async () => {
    const { createCategoryController } = await import(
      "../controllers/categoryController.js"
    );
    const res = createRes();

    await createCategoryController({ body: {} }, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.send).toHaveBeenCalledWith({ message: "Name is required" });
  });

  it("handles duplicate category", async () => {
    const { createCategoryController } = await import(
      "../controllers/categoryController.js"
    );
    mockCategoryModel.findOne.mockResolvedValueOnce({ _id: "cat-1" });

    const res = createRes();
    await createCategoryController({ body: { name: "Shoes" } }, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      message: "Category Already Exisits",
    });
  });

  it("throws in create category error branch", async () => {
    const { createCategoryController } = await import(
      "../controllers/categoryController.js"
    );
    mockCategoryModel.findOne.mockRejectedValueOnce(new Error("db"));
    const res = createRes();

    await expect(
      createCategoryController({ body: { name: "Shoes" } }, res)
    ).rejects.toThrow(ReferenceError);
  });

  it("updates a category", async () => {
    const { updateCategoryController } = await import(
      "../controllers/categoryController.js"
    );
    mockCategoryModel.findByIdAndUpdate.mockResolvedValueOnce({
      _id: "cat-1",
      name: "Shoes",
    });

    const res = createRes();
    await updateCategoryController(
      { params: { id: "cat-1" }, body: { name: "Shoes" } },
      res
    );

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        messsage: "Category Updated Successfully",
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
      { params: { id: "cat-1" }, body: { name: "Shoes" } },
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

  it("returns all categories", async () => {
    const { categoryControlller } = await import(
      "../controllers/categoryController.js"
    );
    mockCategoryModel.find.mockResolvedValueOnce([{ _id: "cat-1" }]);

    const res = createRes();
    await categoryControlller({}, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: "All Categories List",
      })
    );
  });

  it("handles get all categories errors", async () => {
    const { categoryControlller } = await import(
      "../controllers/categoryController.js"
    );
    mockCategoryModel.find.mockRejectedValueOnce(new Error("db"));
    const res = createRes();

    await categoryControlller({}, res);

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

    await singleCategoryController({ params: { slug: "shoes" } }, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: "Get SIngle Category SUccessfully",
      })
    );
  });

  it("handles single category errors", async () => {
    const { singleCategoryController } = await import(
      "../controllers/categoryController.js"
    );
    mockCategoryModel.findOne.mockRejectedValueOnce(new Error("db"));
    const res = createRes();

    await singleCategoryController({ params: { slug: "shoes" } }, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Error While getting Single Category",
      })
    );
  });

  it("deletes a category", async () => {
    const { deleteCategoryCOntroller } = await import(
      "../controllers/categoryController.js"
    );
    mockCategoryModel.findByIdAndDelete.mockResolvedValueOnce({});
    const res = createRes();

    await deleteCategoryCOntroller({ params: { id: "cat-1" } }, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      message: "Categry Deleted Successfully",
    });
  });

  it("handles delete category errors", async () => {
    const { deleteCategoryCOntroller } = await import(
      "../controllers/categoryController.js"
    );
    mockCategoryModel.findByIdAndDelete.mockRejectedValueOnce(new Error("db"));
    const res = createRes();

    await deleteCategoryCOntroller({ params: { id: "cat-1" } }, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "error while deleting category",
      })
    );
  });
});
