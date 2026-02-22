// Nam Dohyun, A0226590A
import {
    createProductController,
    getProductController,
    updateProductController,
    deleteProductController,
    getSingleProductController,
    productCategoryController,
    productPhotoController,
    productFiltersController,
    productCountController,
    productListController,
    searchProductController,
    realtedProductController,
} from './productController';

import slugify from 'slugify';
import fs from 'fs';
import braintree from "braintree";

// 1. Mock Braintree first
jest.mock("braintree", () => {
    // Define the mock object INSIDE the factory function
    const internalMockGateway = {
        clientToken: {
            generate: jest.fn(),
        },
        transaction: {
            sale: jest.fn(),
        },
    };

    return {
        BraintreeGateway: jest.fn(() => internalMockGateway),
        Environment: { Sandbox: "sandbox" },
        // Export the internal mock so we can access it in our tests
        internalMockGateway
    };
});

// 2. Now import your controllers and models
import {
    braintreeTokenController,
    brainTreePaymentController
} from "./productController";
import productModel from "../models/productModel.js";
import orderModel from "../models/orderModel.js";
import categoryModel from "../models/categoryModel.js";
import { json } from 'stream/consumers';

// 3. Access the mock object for use in 'it' blocks
const mockGateway = braintree.internalMockGateway;

jest.mock('../models/productModel');
jest.mock('../models/orderModel');
jest.mock('fs');
jest.mock('slugify');

describe('createProductController', () => {
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();
        req = {
            fields: {
                name: 'iPhone 15',
                description: 'A premium smartphone',
                price: 999,
                category: 'electronics123',
                quantity: 50,
                shipping: 'yes',
            },
            files: {
                photo: {
                    path: 'fake/path/image.jpg',
                    type: 'image/jpeg',
                    size: 500000,
                },
            },
        };

        res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
        };

        // Default mock behaviors
        slugify.mockReturnValue('iphone-15');
        fs.readFileSync.mockReturnValue(Buffer.from('fake-binary-data'));
    });

    it('should create a product successfully when all fields are valid', async () => {
        const saveMock = jest.fn().mockResolvedValue(true);

        productModel.mockImplementation(() => ({
            save: saveMock,
            photo: {}
        }));

        await createProductController(req, res);

        expect(res.status).toHaveBeenCalledWith(201);
        expect(saveMock).toHaveBeenCalled();
        expect(res.send).toHaveBeenCalledWith(
            expect.objectContaining({
                success: true,
                message: "Product Created Successfully",
            })
        );
    });

    it('should return 500 if price is less than or equal to 0', async () => {
        req.fields.price = -1; // -1 to avoid triggering !price (0 is falsy)

        await createProductController(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({ error: "Price must be greater than 0" });
    });

    it('should return 500 if quantity is less than or equal to 0', async () => {
        req.fields.quantity = -5; // -5 to avoid triggering !quantity

        await createProductController(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({ error: "Quantity must be greater than 0" });
    });

    it('should return 500 if shipping is missing', async () => {
        req.fields.shipping = '';

        await createProductController(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({ error: "Shipping is Required" });
    });

    it('should return 500 if photo is missing', async () => {
        delete req.files.photo;

        await createProductController(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({ error: "Photo is Required" });
    });

    it('should return 500 if name is missing', async () => {
        req.fields.name = ''; // Missing name should return 500

        await createProductController(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({ error: "Name is Required" });
        // Verify the model was never even instantiated
        expect(productModel).not.toHaveBeenCalled();
    });

    it('should return 500 if description is missing', async () => {
        req.fields.description = ''; // Missing description should return 500

        await createProductController(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({ error: "Description is Required" });
        // Verify the model was never even instantiated
        expect(productModel).not.toHaveBeenCalled();
    });

    it('should return 500 if price is missing', async () => {
        req.fields.price = ''; // Missing price should return 500

        await createProductController(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({ error: "Price is Required" });
        // Verify the model was never even instantiated
        expect(productModel).not.toHaveBeenCalled();
    });

    it('should return 500 if category is missing', async () => {
        req.fields.category = ''; // Missing category should return 500

        await createProductController(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({ error: "Category is Required" });
        // Verify the model was never even instantiated
        expect(productModel).not.toHaveBeenCalled();
    });

    it('should return 500 if quantity is missing', async () => {
        req.fields.quantity = ''; // Missing quantity should return 500

        await createProductController(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({ error: "Quantity is Required" });
        // Verify the model was never even instantiated
        expect(productModel).not.toHaveBeenCalled();
    });

    it('should return 500 if photo size is greater than 1MB', async () => {
        req.files.photo.size = 2000000; // 2MB

        await createProductController(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({
            error: "photo is Required and should be less then 1mb"
        });
    });

    it('should handle errors in the catch block', async () => {
        // Spy on console.log so we don't clutter the test output
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => { });

        // Force an error by making the constructor throw
        productModel.mockImplementation(() => {
            throw new Error("Database Error");
        });

        await createProductController(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith(
            expect.objectContaining({ success: false, message: "Error in creating product" })
        );
        expect(consoleSpy).toHaveBeenCalled();

        consoleSpy.mockRestore();
    });
});

describe('getProductController', () => {
    let req, res;
    beforeEach(() => {
        jest.clearAllMocks();
        req = {};
        res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
        };
    })

    it('should get all products successfully', async () => {
        const mockProducts = [
            { name: "Product 1", price: 10 },
            { name: "Product 2", price: 20 },
        ];

        productModel.find = jest.fn().mockReturnThis();
        productModel.populate = jest.fn().mockReturnThis();
        productModel.select = jest.fn().mockReturnThis();
        productModel.limit = jest.fn().mockReturnThis();
        productModel.sort = jest.fn().mockResolvedValue(mockProducts); // The last one resolves the data

        await getProductController(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({
            success: true,
            countTotal: 2,
            message: "All Products",
            products: mockProducts,
        });
    })

    it('should handle error in the catch block', async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
        productModel.sort.mockRejectedValue(new Error("Database Error"));

        await getProductController(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith(
            expect.objectContaining({ success: false, message: "Error in getting products" })
        );
        expect(consoleSpy).toHaveBeenCalled();

        consoleSpy.mockRestore();
    })
})

describe('getSingleProductController', () => {
    let req, res;
    beforeEach(() => {
        req = { params: { slug: 'iphone-15' } };
        res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
        };
    });

    it('should fetch a single product by slug', async () => {
        const mockProduct = { name: 'iPhone 15', slug: 'iphone-15' };

        // Mocking the chain: findOne().select().populate()
        productModel.findOne = jest.fn().mockReturnThis();
        productModel.select = jest.fn().mockReturnThis();
        productModel.populate = jest.fn().mockResolvedValue(mockProduct);

        await getSingleProductController(req, res);

        expect(productModel.findOne).toHaveBeenCalledWith({ slug: 'iphone-15' });
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({
            success: true,
            message: "Single Product Fetched",
            product: mockProduct,
        });
    });

    it('should handle errors when fetching single product', async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => { });

        productModel.findOne = jest.fn().mockReturnThis();
        productModel.select = jest.fn().mockReturnThis();
        productModel.populate = jest.fn().mockRejectedValue(new Error("DB Error"));

        await getSingleProductController(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith(
            expect.objectContaining({ success: false, message: "Error while getting single product" })
        );
        expect(consoleSpy).toHaveBeenCalled();

        consoleSpy.mockRestore();
    });
});

describe('productPhotoController', () => {
    let req, res;
    beforeEach(() => {
        req = { params: { pid: 'prod123' } };
        res = {
            set: jest.fn(),
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
        };
    });

    it('should return the photo data with correct content-type', async () => {
        const mockProduct = {
            photo: {
                data: Buffer.from('fake-image'),
                contentType: 'image/png'
            }
        };
        productModel.findById = jest.fn().mockReturnThis();
        productModel.select = jest.fn().mockResolvedValue(mockProduct);

        await productPhotoController(req, res);

        expect(res.set).toHaveBeenCalledWith("Content-type", "image/png");
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith(mockProduct.photo.data);
    });

    it('should handle errors when getting photo', async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
        productModel.findById.mockReturnThis();
        productModel.select.mockRejectedValue(new Error("Photo Error"));

        await productPhotoController(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
        consoleSpy.mockRestore();
    });

    it('should do nothing if product has no photo data', async () => {
        productModel.findById.mockReturnThis();
        productModel.select.mockResolvedValue({ photo: {} }); // No .data property

        await productPhotoController(req, res);

        expect(res.set).not.toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalledWith(200);
    });
});

describe('deleteProductController', () => {
    let req, res;
    beforeEach(() => {
        req = { params: { pid: 'prod123' } };
        res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
        };
    });

    it('should delete the product successfully', async () => {
        productModel.findByIdAndDelete = jest.fn().mockReturnThis();
        productModel.select = jest.fn().mockResolvedValue(true);

        await deleteProductController(req, res);

        expect(productModel.findByIdAndDelete).toHaveBeenCalledWith('prod123');
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
            success: true,
            message: "Product Deleted successfully"
        }));
    });

    it('should handle errors during product deletion', async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
        productModel.findByIdAndDelete = jest.fn().mockReturnThis();
        productModel.select = jest.fn().mockRejectedValue(new Error("Delete Error"));

        await deleteProductController(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
            success: false,
            message: "Error while deleting product"
        }));
        consoleSpy.mockRestore();
    });
});

describe('updateProductController', () => {
    let req, res;
    beforeEach(() => {
        jest.clearAllMocks();
        req = {
            params: { pid: 'prod123' },
            fields: { name: 'Updated Name', description: 'New desc', price: 100, category: 'cat1', quantity: 10, shipping: 'yes' },
            files: {
                photo: {
                    path: "/fake/path/image.jpg",
                    type: "image/jpeg",
                    size: 50000,
                }
            }
        };
        res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
        };
        slugify.mockReturnValue('updated-name');
    });

    it('should update product details successfully', async () => {
        const saveMock = jest.fn().mockResolvedValue(true);
        fs.readFileSync.mockReturnValue(Buffer.from("fake-binary-data"));
        const mockUpdatedProduct = {
            ...req.fields,
            ...req.files,
            save: saveMock
        };

        productModel.findByIdAndUpdate = jest.fn().mockResolvedValue(mockUpdatedProduct);

        await updateProductController(req, res);

        expect(productModel.findByIdAndUpdate).toHaveBeenCalled();
        expect(fs.readFileSync).toHaveBeenCalledWith("/fake/path/image.jpg");
        expect(mockUpdatedProduct.photo.data.toString()).toBe("fake-binary-data");
        expect(saveMock).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
            message: "Product Updated Successfully"
        }));
    });

    it("should return 500 if photo is missing", async () => {
        const saveMock = jest.fn().mockResolvedValue(true);
        req.files.photo = null;
        const mockUpdatedProduct = {
            ...req.fields,
            save: saveMock
        };

        productModel.findByIdAndUpdate = jest.fn().mockResolvedValue(mockUpdatedProduct);

        await updateProductController(req, res);

        expect(productModel.findByIdAndUpdate).not.toHaveBeenCalled();
        expect(saveMock).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({error: "Photo is Required"});
    })

    it('should return 500 if name is missing', async () => {
        req.fields.name = ''; // Missing name should return 500

        await updateProductController(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({ error: "Name is Required" });
        // Verify the model was never even instantiated
        expect(productModel.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('should return 500 if description is missing', async () => {
        req.fields.description = ''; // Missing description should return 500

        await updateProductController(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({ error: "Description is Required" });
        // Verify the model was never even instantiated
        expect(productModel.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('should return 500 if price is missing', async () => {
        req.fields.price = ''; // Missing price should return 500

        await updateProductController(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({ error: "Price is Required" });
        // Verify the model was never even instantiated
        expect(productModel.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('should return 500 if category is missing', async () => {
        req.fields.category = ''; // Missing category should return 500

        await updateProductController(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({ error: "Category is Required" });
        // Verify the model was never even instantiated
        expect(productModel.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('should return 500 if quantity is missing', async () => {
        req.fields.quantity = ''; // Missing quantity should return 500

        await updateProductController(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({ error: "Quantity is Required" });
        // Verify the model was never even instantiated
        expect(productModel.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('should return 500 if shipping is missing', async () => {
        req.fields.shipping = ''; // Missing shipping should return 500

        await updateProductController(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({ error: "Shipping is Required" });
        // Verify the model was never even instantiated
        expect(productModel.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('should return 500 if photo is too large', async () => {
        req.files = { photo: { size: 2000000 } }; // Photo size exceeds 1MB limit

        await updateProductController(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({ error: "photo is Required and should be less then 1mb" });
        // Verify the model was never even instantiated
        expect(productModel.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('should correctly process and update the photo if one is provided', async () => {
        // 1. Setup mock data
        const mockBinaryData = Buffer.from("new-photo-content");
        fs.readFileSync.mockReturnValue(mockBinaryData);
        
        // Create a mock product object that findByIdAndUpdate will return
        // It must have a 'photo' object and a 'save' method
        const mockProduct = {
            ...req.fields,
            photo: { data: null, contentType: null },
            save: jest.fn().mockResolvedValue(true)
        };

        productModel.findByIdAndUpdate = jest.fn().mockResolvedValue(mockProduct);

        // 2. Execute the controller
        await updateProductController(req, res);

        // 3. Assertions
        // Verify fs.readFileSync was called with the correct path from req.files.photo
        expect(fs.readFileSync).toHaveBeenCalledWith(req.files.photo.path);

        // Verify the photo data and type were assigned correctly
        expect(mockProduct.photo.data).toEqual(mockBinaryData);
        expect(mockProduct.photo.contentType).toBe(req.files.photo.type);

        // Verify the document was saved after the photo assignment
        expect(mockProduct.save).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should handle errors in the catch block', async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
        productModel.findByIdAndUpdate = jest.fn().mockRejectedValue(new Error("Update Error"));

        await updateProductController(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith(
            expect.objectContaining({ success: false, message: "Error in Update Product" })
        );
        expect(consoleSpy).toHaveBeenCalled();

        consoleSpy.mockRestore();
    })
});

describe('productFiltersController', () => {
    let req, res;
    beforeEach(() => {
        req = { body: { checked: ['cat1', 'cat2'], radio: [100, 500] } };
        res = { status: jest.fn().mockReturnThis(), send: jest.fn() };
    });

    it('should filter products based on category and price range with pagination', async () => {
        const mockProducts = [{ name: 'Filtered Product' }];
        req.body.page = 2;
        
        productModel.find = jest.fn().mockReturnThis();
        productModel.countDocuments = jest.fn().mockResolvedValue(10);
        productModel.skip = jest.fn().mockReturnThis();
        productModel.limit = jest.fn().mockReturnThis();
        productModel.sort = jest.fn().mockResolvedValue(mockProducts);

        await productFiltersController(req, res);

        expect(productModel.skip).toHaveBeenCalledWith(6); // (2-1) * 6
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({ 
            success: true, 
            products: mockProducts,
            total: 10
        });
    });

    it('should handle errors in the catch block', async () => {
        // 1. Spy on error, not log (matching your controller's catch block)
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
        
        // 2. Mock the first async call so it doesn't fail early
        productModel.countDocuments = jest.fn().mockResolvedValue(10);

        // 3. Mock find to throw the error
        productModel.find = jest.fn().mockImplementation(() => {
            throw new Error("Filter Error");
        });

        const req = { body: { checked: [], radio: [] } };
        const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };

        await productFiltersController(req, res);

        // Assertions
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith(
            expect.objectContaining({ 
                success: false, 
                message: "Error While Filtering Products" 
            })
        );
        
        // This will now pass and keep the console clean
        expect(consoleSpy).toHaveBeenCalled();

        consoleSpy.mockRestore();
    });
});

describe('productCountController', () => {
    let req, res;
    beforeEach(() => {
        req = {};
        res = { status: jest.fn().mockReturnThis(), send: jest.fn() };
    });

    it('should return total product count', async () => {
        productModel.find = jest.fn().mockReturnThis();
        productModel.estimatedDocumentCount = jest.fn().mockResolvedValue(42);

        await productCountController(req, res);

        expect(productModel.find).toHaveBeenCalledWith({});
        expect(productModel.estimatedDocumentCount).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({ success: true, total: 42 });
    });
    it('should handle errors in the catch block', async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
        productModel.find = jest.fn().mockReturnThis();
        productModel.estimatedDocumentCount = jest.fn().mockRejectedValue(new Error("Count Error"));

        await productCountController(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith(
            expect.objectContaining({ success: false, message: "Error in product count" })
        );
        expect(consoleSpy).toHaveBeenCalled();

        consoleSpy.mockRestore();
    })
});

describe('productListController', () => {
    let req, res;
    beforeEach(() => {
        req = { params: { page: 2 } };
        res = { status: jest.fn().mockReturnThis(), send: jest.fn() };
    });

    it('should return products with correct pagination (skip and limit)', async () => {
        productModel.find = jest.fn().mockReturnThis();
        productModel.select = jest.fn().mockReturnThis();
        productModel.skip = jest.fn().mockReturnThis();
        productModel.limit = jest.fn().mockReturnThis();
        productModel.sort = jest.fn().mockResolvedValue([]);

        await productListController(req, res);

        // Page 2 with 6 per page should skip 6
        expect(productModel.skip).toHaveBeenCalledWith(6);
        expect(productModel.limit).toHaveBeenCalledWith(6);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should handle errors in the catch block', async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
        productModel.find = jest.fn().mockReturnThis();
        productModel.select = jest.fn().mockReturnThis();
        productModel.skip = jest.fn().mockReturnThis();
        productModel.limit = jest.fn().mockReturnThis();
        productModel.sort = jest.fn().mockRejectedValue(new Error("Sort Error"));

        await productListController(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith(
            expect.objectContaining({ success: false, message: "Error In Per Page Ctrl" })
        );
        expect(consoleSpy).toHaveBeenCalled();

        consoleSpy.mockRestore();
    })
});

describe('searchProductController', () => {
    let req, res;
    beforeEach(() => {
        req = { params: { keyword: 'phone' } };
        res = { status: jest.fn().mockReturnThis(), send: jest.fn(), json: jest.fn() };
        jest.clearAllMocks();
    });
    it('should search products using regex on name and description', async () => {
        productModel.find = jest.fn().mockReturnThis();
        productModel.select = jest.fn().mockResolvedValue([{ name: 'iPhone' }]);

        await searchProductController(req, res);

        expect(productModel.find).toHaveBeenCalledWith({
            $or: [
                { name: { $regex: 'phone', $options: 'i' } },
                { description: { $regex: 'phone', $options: 'i' } },
            ],
        });
        expect(res.json).toHaveBeenCalledWith([{ name: 'iPhone' }]);
    });
    it('should handle errors in the catch block', async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
        productModel.find = jest.fn().mockReturnThis();
        productModel.select = jest.fn().mockRejectedValue(new Error("Search Error"));

        await searchProductController(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith(
            expect.objectContaining({ success: false, message: "Error In Search Product API" })
        );
        expect(consoleSpy).toHaveBeenCalled();

        consoleSpy.mockRestore();
    })
});

describe('realtedProductController', () => {
    let req, res;
    beforeEach(() => {
        req = { params: { pid: 'p123', cid: 'c456' } };
        res = { status: jest.fn().mockReturnThis(), send: jest.fn() };
        jest.clearAllMocks();
    });
    it('should fetch similar products excluding the current product', async () => {
        productModel.find = jest.fn().mockReturnThis();
        productModel.select = jest.fn().mockReturnThis();
        productModel.limit = jest.fn().mockReturnThis();
        productModel.populate = jest.fn().mockResolvedValue([]);

        await realtedProductController(req, res);

        expect(productModel.find).toHaveBeenCalledWith({
            category: 'c456',
            _id: { $ne: 'p123' }
        });
    });
    it('should handle errors in the catch block', async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
        productModel.find = jest.fn().mockReturnThis();
        productModel.select = jest.fn().mockReturnThis();
        productModel.limit = jest.fn().mockReturnThis();
        productModel.populate = jest.fn().mockRejectedValue(new Error("Related Error"));

        await realtedProductController(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith(
            expect.objectContaining({ success: false, message: "error while geting related product" })
        );
        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
    });
});


describe('braintreeTokenController', () => {
    let req, res;
    beforeEach(() => {
        req = {};
        res = { send: jest.fn(), status: jest.fn().mockReturnThis() };
    });
    it('should generate a client token successfully', async () => {


        // Simulating the Braintree callback
        mockGateway.clientToken.generate = jest.fn((options, callback) => {
            callback(null, { clientToken: 'fake_token' });
        });

        await braintreeTokenController(req, res);

        expect(res.send).toHaveBeenCalledWith({ clientToken: 'fake_token' });
    });
    it('should handle errors from Braintree token generation', async () => {
        // Simulating an error from Braintree
        mockGateway.clientToken.generate = jest.fn((options, callback) => {
            callback("Braintree Error", null);
        });

        await braintreeTokenController(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith("Braintree Error");
    });
    it('should handle exceptions in the catch block', async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => { });

        // Force an exception
        mockGateway.clientToken.generate = jest.fn(() => {
            throw new Error("Exception Error");
        });

        await braintreeTokenController(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith(
            expect.objectContaining({ success: false, message: "Error in Braintree Token" })
        );
        expect(consoleSpy).toHaveBeenCalled();

        consoleSpy.mockRestore();
    });
});

describe('brainTreePaymentController', () => {
    let req, res;
    beforeEach(() => {
        req = {
            body: { nonce: 'fake-nonce', cart: [{ price: 10 }, { price: 20 }] },
            user: { _id: 'user123' }
        };
        res = { json: jest.fn(), status: jest.fn().mockReturnThis(), send: jest.fn() };
    });

    it('should complete transaction and create an order', async () => {
        // 1. Mock the gateway to return success: true
        mockGateway.transaction.sale.mockResolvedValue({
            success: true,
            transaction: { id: "test_trans_id" }
        });

        // 2. Mock orderModel.save()
        // If your controller does 'new orderModel(...).save()', 
        // ensure the constructor mock returns an object with a save method.
        const saveMock = jest.fn().mockResolvedValue(true);
        orderModel.prototype.save = saveMock;

        await brainTreePaymentController(req, res);

        // 3. Assertions
        expect(res.json).toHaveBeenCalledWith({ ok: true });
    });
});

describe('productCategoryController', () => {
    it('should get products by category', async () => {
        const req = { params: { slug: 'electronics' } };
        const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };
        const mockCat = { _id: '123', name: 'Electronics' };

        categoryModel.findOne = jest.fn().mockResolvedValue(mockCat);
        productModel.find = jest.fn().mockReturnThis();
        productModel.populate = jest.fn().mockResolvedValue([{ name: 'Laptop' }]);

        await productCategoryController(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith(expect.objectContaining({ category: mockCat }));
    });

    it('should handle errors in productCategoryController', async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
        const req = { params: { slug: 'electronics' } };
        const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };
        categoryModel.findOne = jest.fn().mockRejectedValue(new Error("Cat Error"));

        await productCategoryController(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
    });
});

describe('braintreeTokenController Errors', () => {
    it('should return 500 when gateway fails to generate token', async () => {
        const req = {};
        const res = { send: jest.fn(), status: jest.fn().mockReturnThis() };

        mockGateway.clientToken.generate.mockImplementation((options, callback) => {
            callback("Braintree Token Error", null);
        });

        await braintreeTokenController(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith("Braintree Token Error");
    });
});

describe('brainTreePaymentController Errors', () => {
    let req, res;

    beforeEach(() => {
        req = {
            body: { nonce: 'fake-nonce', cart: [{ price: 10 }] },
            user: { _id: 'user123' }
        };
        res = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis(),
            send: jest.fn()
        };
        jest.clearAllMocks();
    });

    it('should return 400 when transaction is declined (result.success is false)', async () => {
        // Mock a successful API call but a declined payment logic
        mockGateway.transaction.sale.mockResolvedValue({
            success: false,
            message: "Insufficient Funds"
        });

        await brainTreePaymentController(req, res);

        // This hits the 'else' block inside the 'try'
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith({ message: "Insufficient Funds" });
    });

    it('should return 500 and trigger catch block when gateway crashes/rejects', async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
        const errorResponse = new Error("Gateway Timeout");

        // Mock a Promise rejection (this triggers the 'catch' block)
        mockGateway.transaction.sale.mockRejectedValue(errorResponse);

        await brainTreePaymentController(req, res);

        // This hits the 'catch (error)' block
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
            success: false,
            message: "Error in BrainTree Payment",
            error: errorResponse
        }));
        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
    });
});

describe('productListController Edge Cases', () => {
    it('should default to page 1 if no page param is provided', async () => {
        const req = { params: {} }; // No page param
        const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };

        productModel.find = jest.fn().mockReturnThis();
        productModel.select = jest.fn().mockReturnThis();
        productModel.skip = jest.fn().mockReturnThis();
        productModel.limit = jest.fn().mockReturnThis();
        productModel.sort = jest.fn().mockResolvedValue([]);

        await productListController(req, res);

        expect(productModel.skip).toHaveBeenCalledWith(0); // (1-1) * 6 = 0
    });
});

describe('productFiltersController Empty Filters', () => {
    it('should work with empty filters', async () => { 
        const req = { body: { checked: [], radio: [], page: 1 } };
        const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };

        // 1. Mock countDocuments
        productModel.countDocuments = jest.fn().mockResolvedValue(0);

        // 2. Mock the chain properly
        // Every method before the final 'await' must return 'this' (the mock object)
        const mockQuery = {
            skip: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            sort: jest.fn().mockResolvedValue([]) // The last one returns the actual data
        };

        // Ensure find returns that mockQuery object
        productModel.find = jest.fn().mockReturnValue(mockQuery);

        await productFiltersController(req, res);

        // Assertions
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
            success: true,
            products: [],
            total: 0
        }));
    });
});