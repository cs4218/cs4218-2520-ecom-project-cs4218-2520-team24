// Nam Dohyun, A0226590A
const mockSave = jest.fn();
const mockProductModel = jest.fn((data) => ({
  ...data,
  photo: { data: null, contentType: null },
  save: mockSave,
}));
mockProductModel.find = jest.fn();
mockProductModel.findOne = jest.fn();
mockProductModel.findById = jest.fn();
mockProductModel.findByIdAndDelete = jest.fn();
mockProductModel.findByIdAndUpdate = jest.fn();
mockProductModel.countDocuments = jest.fn();

const mockCategoryModel = jest.fn();
mockCategoryModel.findOne = jest.fn();

const mockOrderSave = jest.fn();
const mockOrderModel = jest.fn(() => ({ save: mockOrderSave }));

const mockReadFileSync = jest.fn(() => Buffer.from("photo"));

const mockSlugify = jest.fn((value) => `slug-${value}`);

const mockClientTokenGenerate = jest.fn();
const mockTransactionSale = jest.fn();
const mockBraintreeGateway = jest.fn(() => ({
  clientToken: { generate: mockClientTokenGenerate },
  transaction: { sale: mockTransactionSale },
}));

jest.mock("../models/productModel.js", () => ({
  __esModule: true,
  default: mockProductModel,
}));

jest.mock("../models/categoryModel.js", () => ({
  __esModule: true,
  default: mockCategoryModel,
}));

jest.mock("../models/orderModel.js", () => ({
  __esModule: true,
  default: mockOrderModel,
}));

jest.mock("fs", () => ({
  __esModule: true,
  default: {
    readFileSync: mockReadFileSync,
  },
  readFileSync: mockReadFileSync,
}));

jest.mock("slugify", () => ({
  __esModule: true,
  default: mockSlugify,
}));

jest.mock("dotenv", () => ({
  __esModule: true,
  default: {
    config: jest.fn(),
  },
  config: jest.fn(),
}));

jest.mock("braintree", () => ({
  __esModule: true,
  default: {
    BraintreeGateway: mockBraintreeGateway,
    Environment: { Sandbox: "Sandbox" },
  },
  BraintreeGateway: mockBraintreeGateway,
  Environment: { Sandbox: "Sandbox" },
}));

const createRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.set = jest.fn().mockReturnValue(res);
  return res;
};

const createQueryMock = (result) => {
  const chain = {
    select: jest.fn().mockReturnThis(),
    populate: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
  };
  chain.then = (resolve, reject) => Promise.resolve(result).then(resolve, reject);
  return chain;
};

const createSelectMock = (result) => ({
  select: jest.fn().mockResolvedValue(result),
});

describe("Product controllers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("validates create product fields", async () => {
    const { createProductController } = await import(
      "../controllers/productController.js"
    );
    const res = createRes();

    await createProductController({ fields: {}, files: {} }, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({ error: "Name is Required" });

    res.status.mockClear();
    res.send.mockClear();
    await createProductController(
      { fields: { name: "Product" }, files: {} },
      res
    );
    expect(res.send).toHaveBeenCalledWith({ error: "Description is Required" });

    res.status.mockClear();
    res.send.mockClear();
    await createProductController(
      { fields: { name: "Product", description: "Desc" }, files: {} },
      res
    );
    expect(res.send).toHaveBeenCalledWith({ error: "Price is Required" });

    res.status.mockClear();
    res.send.mockClear();
    await createProductController(
      {
        fields: { name: "Product", description: "Desc", price: -1 },
        files: {},
      },
      res
    );
    expect(res.send).toHaveBeenCalledWith({
      error: "Price must be greater than 0",
    });

    res.status.mockClear();
    res.send.mockClear();
    await createProductController(
      {
        fields: { name: "Product", description: "Desc", price: 10 },
        files: {},
      },
      res
    );
    expect(res.send).toHaveBeenCalledWith({ error: "Category is Required" });

    res.status.mockClear();
    res.send.mockClear();
    await createProductController(
      {
        fields: {
          name: "Product",
          description: "Desc",
          price: 10,
          category: "cat",
        },
        files: {},
      },
      res
    );
    expect(res.send).toHaveBeenCalledWith({ error: "Quantity is Required" });

    res.status.mockClear();
    res.send.mockClear();
    await createProductController(
      {
        fields: {
          name: "Product",
          description: "Desc",
          price: 10,
          category: "cat",
          quantity: -1,
        },
        files: {},
      },
      res
    );
    expect(res.send).toHaveBeenCalledWith({
      error: "Quantity must be greater than 0",
    });

    res.status.mockClear();
    res.send.mockClear();
    await createProductController(
      {
        fields: {
          name: "Product",
          description: "Desc",
          price: 10,
          category: "cat",
          quantity: 5,
        },
        files: {},
      },
      res
    );
    expect(res.send).toHaveBeenCalledWith({ error: "Photo is Required" });

    res.status.mockClear();
    res.send.mockClear();
    await createProductController(
      {
        fields: {
          name: "Product",
          description: "Desc",
          price: 10,
          category: "cat",
          quantity: 5,
        },
        files: { photo: { size: 1000001 } },
      },
      res
    );
    expect(res.send).toHaveBeenCalledWith({
      error: "photo is Required and should be less then 1mb",
    });

    res.status.mockClear();
    res.send.mockClear();
    await createProductController(
      {
        fields: {
          name: "Product",
          description: "Desc",
          price: 10,
          category: "cat",
          quantity: 5,
        },
        files: { photo: { size: 100, path: "photo.png", type: "image/png" } },
      },
      res
    );
    expect(res.send).toHaveBeenCalledWith({ error: "Shipping is Required" });
  });

  it("creates a product with photo", async () => {
    const { createProductController } = await import(
      "../controllers/productController.js"
    );
    const res = createRes();

    await createProductController(
      {
        fields: {
          name: "Product",
          description: "Desc",
          price: 10,
          category: "cat",
          quantity: 5,
          shipping: true,
        },
        files: { photo: { size: 100, path: "photo.png", type: "image/png" } },
      },
      res
    );

    expect(mockReadFileSync).toHaveBeenCalledWith("photo.png");
    expect(mockSave).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: "Product Created Successfully",
      })
    );
  });

  it("handles create product errors", async () => {
    const { createProductController } = await import(
      "../controllers/productController.js"
    );
    mockProductModel.mockImplementationOnce(() => {
      throw new Error("db");
    });
    const res = createRes();

    await createProductController(
      {
        fields: {
          name: "Product",
          description: "Desc",
          price: 10,
          category: "cat",
          quantity: 5,
          shipping: true,
        },
        files: { photo: { size: 100, path: "photo.png", type: "image/png" } },
      },
      res
    );

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Error in creating product",
      })
    );
  });

  it("returns product list", async () => {
    const { getProductController } = await import(
      "../controllers/productController.js"
    );
    mockProductModel.find.mockReturnValueOnce(createQueryMock([{ _id: "p1" }]));
    const res = createRes();

    await getProductController({}, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: "All Products",
      })
    );
  });

  it("handles get products errors", async () => {
    const { getProductController } = await import(
      "../controllers/productController.js"
    );
    mockProductModel.find.mockImplementationOnce(() => {
      throw new Error("db");
    });
    const res = createRes();

    await getProductController({}, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Error in getting products",
      })
    );
  });

  it("returns a single product", async () => {
    const { getSingleProductController } = await import(
      "../controllers/productController.js"
    );
    mockProductModel.findOne.mockReturnValueOnce(createQueryMock({ _id: "p1" }));
    const res = createRes();

    await getSingleProductController({ params: { slug: "slug" } }, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: "Single Product Fetched",
      })
    );
  });

  it("handles get single product errors", async () => {
    const { getSingleProductController } = await import(
      "../controllers/productController.js"
    );
    mockProductModel.findOne.mockImplementationOnce(() => {
      throw new Error("db");
    });
    const res = createRes();

    await getSingleProductController({ params: { slug: "slug" } }, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Error while getting single product",
      })
    );
  });

  it("returns product photo", async () => {
    const { productPhotoController } = await import(
      "../controllers/productController.js"
    );
    mockProductModel.findById.mockReturnValueOnce(
      createSelectMock({
        photo: { data: Buffer.from("photo"), contentType: "image/png" },
      })
    );
    const res = createRes();

    await productPhotoController({ params: { pid: "p1" } }, res);

    expect(res.set).toHaveBeenCalledWith("Content-type", "image/png");
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalled();
  });

  it("handles missing photo data", async () => {
    const { productPhotoController } = await import(
      "../controllers/productController.js"
    );
    mockProductModel.findById.mockReturnValueOnce(
      createSelectMock({ photo: { data: null } })
    );
    const res = createRes();

    await productPhotoController({ params: { pid: "p1" } }, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Photo not found",
    });
  });

  it("handles product photo errors", async () => {
    const { productPhotoController } = await import(
      "../controllers/productController.js"
    );
    mockProductModel.findById.mockImplementationOnce(() => {
      throw new Error("db");
    });
    const res = createRes();

    await productPhotoController({ params: { pid: "p1" } }, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Error while getting photo",
      })
    );
  });

  it("deletes a product", async () => {
    const { deleteProductController } = await import(
      "../controllers/productController.js"
    );
    mockProductModel.findByIdAndDelete.mockReturnValueOnce(createSelectMock({}));
    const res = createRes();

    await deleteProductController({ params: { pid: "p1" } }, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      message: "Product Deleted successfully",
    });
  });

  it("handles delete product errors", async () => {
    const { deleteProductController } = await import(
      "../controllers/productController.js"
    );
    mockProductModel.findByIdAndDelete.mockImplementationOnce(() => {
      throw new Error("db");
    });
    const res = createRes();

    await deleteProductController({ params: { pid: "p1" } }, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Error while deleting product",
      })
    );
  });

  it("validates update product fields", async () => {
    const { updateProductController } = await import(
      "../controllers/productController.js"
    );
    const res = createRes();
    const params = { pid: "p1" };
    await updateProductController({ params, fields: {}, files: {} }, res);
    expect(res.send).toHaveBeenCalledWith({ error: "Name is Required" });

    res.send.mockClear();
    await updateProductController(
      { params, fields: { name: "Product" }, files: {} },
      res
    );
    expect(res.send).toHaveBeenCalledWith({ error: "Description is Required" });

    res.send.mockClear();
    await updateProductController(
      { params, fields: { name: "Product", description: "Desc" }, files: {} },
      res
    );
    expect(res.send).toHaveBeenCalledWith({ error: "Price is Required" });

    res.send.mockClear();
    await updateProductController(
      {
        params,
        fields: { name: "Product", description: "Desc", price: 10 },
        files: {},
      },
      res
    );
    expect(res.send).toHaveBeenCalledWith({ error: "Category is Required" });

    res.send.mockClear();
    await updateProductController(
      {
        params,
        fields: {
          name: "Product",
          description: "Desc",
          price: 10,
          category: "cat",
        },
        files: {},
      },
      res
    );
    expect(res.send).toHaveBeenCalledWith({ error: "Quantity is Required" });

    res.send.mockClear();
    await updateProductController(
      {
        params,
        fields: {
          name: "Product",
          description: "Desc",
          price: 10,
          category: "cat",
          quantity: 5,
        },
        files: {},
      },
      res
    );
    expect(res.send).toHaveBeenCalledWith({ error: "Shipping is Required" });

    res.send.mockClear();
    await updateProductController(
      {
        params,
        fields: {
          name: "Product",
          description: "Desc",
          price: 10,
          category: "cat",
          quantity: 5,
          shipping: true,
        },
        files: { photo: { size: 1000001 } },
      },
      res
    );
    expect(res.send).toHaveBeenCalledWith({
      error: "photo is Required and should be less then 1mb",
    });
  });

  it("updates a product with photo", async () => {
    const { updateProductController } = await import(
      "../controllers/productController.js"
    );
    const product = { photo: { data: null, contentType: null }, save: mockSave };
    mockProductModel.findByIdAndUpdate.mockResolvedValueOnce(product);

    const res = createRes();
    await updateProductController(
      {
        params: { pid: "p1" },
        fields: {
          name: "Product",
          description: "Desc",
          price: 10,
          category: "cat",
          quantity: 5,
          shipping: true,
        },
        files: { photo: { size: 100, path: "photo.png", type: "image/png" } },
      },
      res
    );

    expect(mockReadFileSync).toHaveBeenCalledWith("photo.png");
    expect(mockSave).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: "Product Updated Successfully",
      })
    );
  });

  it("updates a product without photo", async () => {
    const { updateProductController } = await import(
      "../controllers/productController.js"
    );
    const product = { photo: { data: null, contentType: null }, save: mockSave };
    mockProductModel.findByIdAndUpdate.mockResolvedValueOnce(product);
    const res = createRes();

    await updateProductController(
      {
        params: { pid: "p1" },
        fields: {
          name: "Product",
          description: "Desc",
          price: 10,
          category: "cat",
          quantity: 5,
          shipping: true,
        },
        files: {},
      },
      res
    );

    expect(mockReadFileSync).not.toHaveBeenCalled();
    expect(mockSave).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("handles update product errors", async () => {
    const { updateProductController } = await import(
      "../controllers/productController.js"
    );
    mockProductModel.findByIdAndUpdate.mockRejectedValueOnce(new Error("db"));
    const res = createRes();

    await updateProductController(
      {
        params: { pid: "p1" },
        fields: {
          name: "Product",
          description: "Desc",
          price: 10,
          category: "cat",
          quantity: 5,
          shipping: true,
        },
        files: { photo: { size: 100, path: "photo.png", type: "image/png" } },
      },
      res
    );

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Error in Update Product",
      })
    );
  });

  it("filters products with criteria", async () => {
    const { productFiltersController } = await import(
      "../controllers/productController.js"
    );
    mockProductModel.countDocuments.mockResolvedValueOnce(2);
    mockProductModel.find.mockReturnValueOnce(createQueryMock([{ _id: "p1" }]));
    const res = createRes();

    await productFiltersController(
      { body: { checked: ["cat"], radio: [0, 100] } },
      res
    );

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        total: 2,
      })
    );
  });

  it("filters products without criteria", async () => {
    const { productFiltersController } = await import(
      "../controllers/productController.js"
    );
    mockProductModel.countDocuments.mockResolvedValueOnce(1);
    mockProductModel.find.mockReturnValueOnce(createQueryMock([{ _id: "p1" }]));
    const res = createRes();

    await productFiltersController({ body: { checked: [], radio: [] } }, res);

    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("handles product filter errors", async () => {
    const { productFiltersController } = await import(
      "../controllers/productController.js"
    );
    mockProductModel.countDocuments.mockRejectedValueOnce(new Error("db"));
    const res = createRes();

    await productFiltersController({ body: { checked: [], radio: [] } }, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Error While Filtering Products",
      })
    );
  });

  it("counts products", async () => {
    const { productCountController } = await import(
      "../controllers/productController.js"
    );
    mockProductModel.find.mockReturnValueOnce({
      estimatedDocumentCount: jest.fn().mockResolvedValue(5),
    });
    const res = createRes();

    await productCountController({}, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({ success: true, total: 5 });
  });

  it("handles product count errors", async () => {
    const { productCountController } = await import(
      "../controllers/productController.js"
    );
    mockProductModel.find.mockReturnValueOnce({
      estimatedDocumentCount: jest.fn().mockRejectedValue(new Error("db")),
    });
    const res = createRes();

    await productCountController({}, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Error in product count",
      })
    );
  });

  it("returns product list by page", async () => {
    const { productListController } = await import(
      "../controllers/productController.js"
    );
    mockProductModel.find.mockReturnValueOnce(createQueryMock([{ _id: "p1" }]));
    const res = createRes();

    await productListController({ params: { page: 2 } }, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({ success: true })
    );
  });

  it("returns product list default page", async () => {
    const { productListController } = await import(
      "../controllers/productController.js"
    );
    mockProductModel.find.mockReturnValueOnce(createQueryMock([{ _id: "p1" }]));
    const res = createRes();

    await productListController({ params: {} }, res);

    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("handles product list errors", async () => {
    const { productListController } = await import(
      "../controllers/productController.js"
    );
    mockProductModel.find.mockImplementationOnce(() => {
      throw new Error("db");
    });
    const res = createRes();

    await productListController({ params: { page: 1 } }, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Error In Per Page Ctrl",
      })
    );
  });

  it("searches products", async () => {
    const { searchProductController } = await import(
      "../controllers/productController.js"
    );
    mockProductModel.find.mockReturnValueOnce(createQueryMock([{ _id: "p1" }]));
    const res = createRes();

    await searchProductController({ params: { keyword: "shoe" } }, res);

    expect(res.json).toHaveBeenCalledWith([{ _id: "p1" }]);
  });

  it("handles search errors", async () => {
    const { searchProductController } = await import(
      "../controllers/productController.js"
    );
    mockProductModel.find.mockImplementationOnce(() => {
      throw new Error("db");
    });
    const res = createRes();

    await searchProductController({ params: { keyword: "shoe" } }, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Error In Search Product API",
      })
    );
  });

  it("returns related products", async () => {
    const { realtedProductController } = await import(
      "../controllers/productController.js"
    );
    mockProductModel.find.mockReturnValueOnce(createQueryMock([{ _id: "p1" }]));
    const res = createRes();

    await realtedProductController(
      { params: { pid: "p1", cid: "c1" } },
      res
    );

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({ success: true })
    );
  });

  it("handles related products errors", async () => {
    const { realtedProductController } = await import(
      "../controllers/productController.js"
    );
    mockProductModel.find.mockImplementationOnce(() => {
      throw new Error("db");
    });
    const res = createRes();

    await realtedProductController(
      { params: { pid: "p1", cid: "c1" } },
      res
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "error while geting related product",
      })
    );
  });

  it("returns products by category", async () => {
    const { productCategoryController } = await import(
      "../controllers/productController.js"
    );
    mockCategoryModel.findOne.mockResolvedValueOnce({ _id: "c1" });
    mockProductModel.find.mockReturnValueOnce(createQueryMock([{ _id: "p1" }]));
    mockProductModel.countDocuments.mockResolvedValueOnce(1);
    const res = createRes();

    await productCategoryController({ params: { slug: "cat" } }, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({ success: true })
    );
  });

  it("handles products by category errors", async () => {
    const { productCategoryController } = await import(
      "../controllers/productController.js"
    );
    mockCategoryModel.findOne.mockRejectedValueOnce(new Error("db"));
    const res = createRes();

    await productCategoryController({ params: { slug: "cat" } }, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Error While Getting products",
      })
    );
  });

  it("returns braintree token", async () => {
    const { braintreeTokenController } = await import(
      "../controllers/productController.js"
    );
    mockClientTokenGenerate.mockImplementationOnce((_, cb) => {
      cb(null, { token: "token" });
    });
    const res = createRes();

    await braintreeTokenController({}, res);

    expect(res.send).toHaveBeenCalledWith({ token: "token" });
  });

  it("handles braintree token errors", async () => {
    const { braintreeTokenController } = await import(
      "../controllers/productController.js"
    );
    const tokenError = new Error("token");
    mockClientTokenGenerate.mockImplementationOnce((_, cb) => {
      cb(tokenError);
    });
    const res = createRes();

    await braintreeTokenController({}, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith(tokenError);
  });

  it("catches braintree token exceptions", async () => {
    const { braintreeTokenController } = await import(
      "../controllers/productController.js"
    );
    mockClientTokenGenerate.mockImplementationOnce(() => {
      throw new Error("boom");
    });
    const res = createRes();

    await braintreeTokenController({}, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Error in Braintree Token",
      })
    );
  });

  it("processes braintree payment", async () => {
    const { brainTreePaymentController } = await import(
      "../controllers/productController.js"
    );
    mockTransactionSale.mockResolvedValueOnce({ success: true, id: "txn" });
    const res = createRes();

    await brainTreePaymentController(
      {
        body: { nonce: "nonce", cart: [{ price: 10 }, { price: 5 }] },
        user: { _id: "user-1" },
      },
      res
    );

    expect(mockOrderModel).toHaveBeenCalledWith(
      expect.objectContaining({
        products: [{ price: 10 }, { price: 5 }],
      })
    );
    expect(mockOrderSave).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ ok: true });
  });

  it("handles braintree payment failure responses", async () => {
    const { brainTreePaymentController } = await import(
      "../controllers/productController.js"
    );
    mockTransactionSale.mockResolvedValueOnce({
      success: false,
      message: "declined",
    });
    const res = createRes();

    await brainTreePaymentController(
      { body: { nonce: "nonce", cart: [{ price: 10 }] }, user: { _id: "user-1" } },
      res
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({ message: "declined" });
  });

  it("handles braintree payment errors", async () => {
    const { brainTreePaymentController } = await import(
      "../controllers/productController.js"
    );
    mockTransactionSale.mockRejectedValueOnce(new Error("boom"));
    const res = createRes();

    await brainTreePaymentController(
      { body: { nonce: "nonce", cart: [{ price: 10 }] }, user: { _id: "user-1" } },
      res
    );

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Error in BrainTree Payment",
      })
    );
  });
});
