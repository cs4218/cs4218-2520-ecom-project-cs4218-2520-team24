import userModel from "../models/userModel.js";
import orderModel from "../models/orderModel.js";
import { 
    registerController,
    updateProfileController,
    loginController,
    forgotPasswordController,
    testController,
    getOrdersController,
    getAllOrdersController,
    orderStatusController
} from "./authController.js";
import { hashPassword, comparePassword } from "./../helpers/authHelper.js";
import JWT from "jsonwebtoken";

jest.mock("../models/userModel.js");
jest.mock("../models/orderModel.js");
jest.mock("../helpers/authHelper.js");
jest.mock("jsonwebtoken");

function createResponse() {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
}

describe("Register Controller", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("should return error if name is missing", async () => {
        const req = { body: {
            email: "email",
            password: "password",
            phone: "phone",
            address: "address",
            answer: "answer"
        }};
        const res = createResponse();

        await registerController(req, res);

        expect(res.send).toHaveBeenCalledWith({ error: "Name is required" });
    });

    it("should return error if email is missing", async () => {
        const req = { body: {
            name: "name",
            password: "password",
            phone: "phone",
            address: "address",
            answer: "answer"
        }};
        const res = createResponse();

        await registerController(req, res);

        expect(res.send).toHaveBeenCalledWith({ error: "Email is required" });
    });

    it("should return error if password is missing", async () => {
        const req = { body: {
            name: "name",
            email: "email",
            phone: "phone",
            address: "address",
            answer: "answer"
        }};
        const res = createResponse();

        await registerController(req, res);

        expect(res.send).toHaveBeenCalledWith({ error: "Password is required" });
    });

    it("should return error if password is missing", async () => {
        const req = { body: {
            name: "name",
            email: "email",
            phone: "phone",
            address: "address",
            answer: "answer"
        }};
        const res = createResponse();

        await registerController(req, res);

        expect(res.send).toHaveBeenCalledWith({ error: "Password is required" });
    });

     it("should return error if phone is missing", async () => {
        const req = { body: {
            name: "name",
            email: "email",
            password: "password",
            address: "address",
            answer: "answer"
        }};
        const res = createResponse();

        await registerController(req, res);

        expect(res.send).toHaveBeenCalledWith({ error: "Phone number is required" });
    });
    
     it("should return error if address is missing", async () => {
        const req = { body: {
            name: "name",
            email: "email",
            password: "password",
            phone: "phone",
            answer: "answer"
        }};
        const res = createResponse();

        await registerController(req, res);

        expect(res.send).toHaveBeenCalledWith({ error: "Address is required" });
    });

     it("should return error if answer is missing", async () => {
        const req = { body: {
            name: "name",
            email: "email",
            password: "password",
            phone: "phone",
            address: "address"
        }};
        const res = createResponse();

        await registerController(req, res);

        expect(res.send).toHaveBeenCalledWith({ error: "Answer is required" });
    });

    it("should return error if user already exists", async () => {
        const req = { body: {
            name: "name",
            email: "email",
            password: "password",
            phone: "phone",
            address: "address",
            answer: "answer"
        }};
        const res = createResponse();
        
        userModel.findOne.mockResolvedValue({ _id: "userId" });

        await registerController(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({
            success: false,
            message: "Email already registered, please log in",
        });
    });

    it("should register a single user successfully", async () => {
        const req = { body: {
            name: "name",
            email: "email",
            password: "password",
            phone: "phone",
            address: "address",
            answer: "answer"
        }};
        const res = createResponse();

        userModel.findOne.mockResolvedValue(null);
        hashPassword.mockResolvedValue("hashed_password");
        userModel.prototype.save.mockResolvedValue({ _id: "userId", name: "name", email: "email" });

        await registerController(req, res);

        expect(hashPassword).toHaveBeenCalledWith("password");
        expect(userModel).toHaveBeenCalledWith({
            name: "name",
            email: "email",
            phone: "phone",
            address: "address",
            password: "hashed_password",
            answer: "answer"
        });
        expect(userModel.mock.instances.length).toBe(1);
        expect(userModel.mock.instances[0].save).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.send).toHaveBeenCalledWith({
            success: true,
            message: "User registered successfully",
            user: { _id: "userId", name: "name", email: "email" },
        });
    });
    
    it("should handle errors", async () => {
        const req = { body: {
            name: "name",
            email: "email",
            password: "password",
            phone: "phone",
            address: "address",
            answer: "answer"
        }};
        const res = createResponse();
        userModel.findOne.mockRejectedValue(new Error("db error"));

        await registerController(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({
            success: false,
            message: "Error in registration",
            error: expect.any(Error),
        });
    });
});

describe("Update Profile Controller", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("errors when password is less than 6 characters", async () => {
        const req = {
            body: { password: "123" },
            user: { _id: "userId" }
        };
        const res = createResponse();

        await updateProfileController(req, res);

        expect(res.json).toHaveBeenCalledWith({ error: "Password must be at least 6 characters long" });
    });

    it("hashes password when provided", async() => {
        const req = {
            body: { password: "123456" },
            user: {_id: "userId" }
        }
        const res = createResponse();

        userModel.findById.mockResolvedValue({ password: "oldHashed" });
        hashPassword.mockImplementation(async (pwd) => `hashed_${pwd}`);

        await updateProfileController(req, res);

        expect(hashPassword).toHaveBeenCalledWith("123456");
        expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
            "userId",
            expect.objectContaining({ password: "hashed_123456" }),
            { new: true }
        );
    });

    it("updates profile successfully for every combination of fields", async () => {
        const existingUser = {
            name: "name",
            password: "password",
            phone: "phone",
            address: "address",
            email: "email"
        }
        const combinations = [{}]
        Object.keys(existingUser).forEach(field => {
            combinations.push(...combinations.map(c => ({ ...c, [field]: `new_${field}` })));
        })
        
        userModel.findById.mockResolvedValue(existingUser);
        userModel.findByIdAndUpdate.mockImplementation(async (id, update, options) => update);
        hashPassword.mockImplementation(async (pwd) => `hashed_${pwd}`);

        for (const body of combinations) {
            const req = { body, user: { _id: "userId" } };
            const res = createResponse();
            const expectedUser = {
                name: body.name || existingUser.name,
                password: body.password ? `hashed_${body.password}` : existingUser.password,
                phone: body.phone || existingUser.phone,
                address: body.address || existingUser.address,
            };

            await updateProfileController(req, res);

            expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
                "userId",
                expectedUser,
                { new: true }
            );
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith({
                success: true,
                message: "Profile updated successfully",
                updatedUser: expectedUser,
            });
        }
    });

    it("handles errors", async () => {
        userModel.findById.mockRejectedValue(new Error("db error"));

        const req = { body: { password: "123456" }, user: { _id: "u1" } };
        const res = createResponse();

        await updateProfileController(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Error while updating profile",
        error: expect.any(Error),
    });
  });
});

describe("Login Controller", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("returns error if password is missing", async () => {
        const req = {
            body: { email: "test@example.com" }
        };
        const res = createResponse();

        await loginController(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.send).toHaveBeenCalledWith({
            success: false,
            message: "Missing email or password",
        });
    });

    it("returns error if email is missing", async () => {
        const req = {
            body: { password: "password" }
        };
        const res = createResponse();

        await loginController(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.send).toHaveBeenCalledWith({
            success: false,
            message: "Missing email or password",
        });
    });

    it("returns error if email is not registered", async () => {
        const req = {
            body: { email: "unregistered@example.com", password: "password" }
        };
        const res = createResponse();
        
        userModel.findOne.mockResolvedValue(null);

        await loginController(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.send).toHaveBeenCalledWith({
            success: false,
            message: "Email is not registered",
        });
    });

    it("returns error if password is invalid", async () => {
        const req = {
            body: { email: "test@example.com", password: "wrong_password" }
        };
        const res = createResponse();
        
        userModel.findOne.mockResolvedValue({ email: "test@example.com", password: "correct_hashed_password" });
        comparePassword.mockReturnValue(false);

        await loginController(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({
            success: false,
            message: "Invalid password",
        });
    });

    it("logs in successfully with valid credentials", async () => {
        const req = {
            body: { email: "test@example.com", password: "password" }
        };
        const res = createResponse();
        
        const user = {
            _id: "userId", 
            name: "Test User",
            email: "test@example.com", 
            password: "hashed_password",
            phone: "12345678",
            address: "123 Test St",
            role: "user"
        }
        userModel.findOne.mockResolvedValue(user);
        comparePassword.mockReturnValue(true);
        JWT.sign.mockReturnValue("jwt_token");

        await loginController(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({
            success: true,
            message: "Login successful",
            token: "jwt_token",
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                address: user.address,
                role: user.role,
            },
        });
    });

    it("handles userModel errors", async () => {
        const req = {
            body: { email: "test@example.com", password: "password" }
        };
        const res = createResponse();
        userModel.findOne.mockRejectedValue(new Error("db error"));

        await loginController(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({
            success: false,
            message: "Error while logging in",
            error: expect.any(Error),
        });
    });

    it("handles JWT errors", async () => {
        const req = {
            body: { email: "test@example.com", password: "password" }
        };
        const res = createResponse();

        const user = {
            _id: "userId", 
            name: "Test User",
            email: "test@example.com",
            password: "hashed_password",
            phone: "12345678",
            address: "123 Test St",
            role: "user"
        }
        userModel.findOne.mockResolvedValue(user);
        comparePassword.mockReturnValue(true);
        JWT.sign.mockRejectedValue(new Error("jwt error"));
        
        await loginController(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({
            success: false,
            message: "Error while logging in",
            error: expect.any(Error),
        });
    });
});

describe("Forgot Password Controller", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("returns error if email is missing", async () => {
        const req = { body: { answer: "answer", newPassword: "new_password" } };
        const res = createResponse();

        userModel.findOne.mockResolvedValue(null);

        await forgotPasswordController(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith({ message: "Email is required" });
    });

    it("returns error if answer is missing", async () => {
        const req = { body: { email: "test@example.com", newPassword: "new_password" } };
        const res = createResponse();

        userModel.findOne.mockResolvedValue(null);

        await forgotPasswordController(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith({ message: "Answer is required" });
    });

    it("returns error if new password is missing", async () => {
        const req = { body: { email: "test@example.com", answer: "answer" } };
        const res = createResponse();

        userModel.findOne.mockResolvedValue(null);

        await forgotPasswordController(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith({ message: "New password is required" });
    });

    it("returns error if email or answer is wrong", async () => {
        const req = {
            body: { email: "test@example.com", answer: "wrong", newPassword: "new_password" }
        };
        const res = createResponse();

        userModel.findOne.mockResolvedValue(null);

        await forgotPasswordController(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.send).toHaveBeenCalledWith({
            success: false,
            message: "Wrong email or answer",
        });
    });

    it("resets password successfully", async () => {
        const req = {
            body: { email: "test@example.com", answer: "answer", newPassword: "new_password" }
        };
        const res = createResponse();

        userModel.findOne.mockResolvedValue({ _id: "userId" });
        hashPassword.mockResolvedValue("hashed_password");
        userModel.findByIdAndUpdate.mockResolvedValue({ _id: "userId" });

        await forgotPasswordController(req, res);

        expect(hashPassword).toHaveBeenCalledWith("new_password");
        expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith("userId", {
            password: "hashed_password",
        });
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({
            success: true,
            message: "Password reset successfully",
        });
    });

    it("handles errors", async () => {
        const req = {
            body: { email: "test@example.com", answer: "answer", newPassword: "new_password" }
        };
        const res = createResponse();

        userModel.findOne.mockRejectedValue(new Error("db error"));

        await forgotPasswordController(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({
            success: false,
            message: "Something went wrong",
            error: expect.any(Error),
        });
    });
});

describe("Test Controller", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("returns protected route message", () => {
        const req = {};
        const res = createResponse();

        testController(req, res);

        expect(res.send).toHaveBeenCalledWith("Protected Routes");
    });
});

describe("Get Orders Controller", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("returns orders for the user successfully", async () => {
        const req = { user: { _id: "userId" } };
        const res = createResponse();
        const orders = [{ _id: "orderId" }];

        const populateBuyer = jest.fn().mockResolvedValue(orders);
        const populateProducts = jest.fn().mockReturnValue({ populate: populateBuyer });
        orderModel.find.mockReturnValue({ populate: populateProducts });

        await getOrdersController(req, res);

        expect(orderModel.find).toHaveBeenCalledWith({ buyer: "userId" });
        expect(populateProducts).toHaveBeenCalledWith("products", "-photo");
        expect(populateBuyer).toHaveBeenCalledWith("buyer", "name");
        expect(res.json).toHaveBeenCalledWith(orders);
    });

    it("handles errors", async () => {
        const req = { user: { _id: "userId" } };
        const res = createResponse();

        orderModel.find.mockImplementation(() => {
            throw new Error("db error");
        });

        await getOrdersController(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({
            success: false,
            message: "Error while getting orders",
            error: expect.any(Error),
        });
    });
});

describe("Get All Orders Controller", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("returns all orders successfully", async () => {
        const req = {};
        const res = createResponse();
        const orders = [{ _id: "orderId" }];

        const sortOrders = jest.fn().mockResolvedValue(orders);
        const populateBuyer = jest.fn().mockReturnValue({ sort: sortOrders });
        const populateProducts = jest.fn().mockReturnValue({ populate: populateBuyer });
        orderModel.find.mockReturnValue({ populate: populateProducts });

        await getAllOrdersController(req, res);

        expect(orderModel.find).toHaveBeenCalledWith({});
        expect(populateProducts).toHaveBeenCalledWith("products", "-photo");
        expect(populateBuyer).toHaveBeenCalledWith("buyer", "name");
        expect(sortOrders).toHaveBeenCalledWith({ createdAt: "-1" });
        expect(res.json).toHaveBeenCalledWith(orders);
    });

    it("handles errors", async () => {
        const req = {};
        const res = createResponse();

        orderModel.find.mockImplementation(() => {
            throw new Error("db error");
        });

        await getAllOrdersController(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({
            success: false,
            message: "Error while getting orders",
            error: expect.any(Error),
        });
    });
});

describe("Order Status Controller", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("updates order status successfully", async () => {
        const req = { params: { orderId: "orderId" }, body: { status: "Delivered" } };
        const res = createResponse();
        const updatedOrder = { _id: "orderId", status: "Delivered" };

        orderModel.findByIdAndUpdate.mockResolvedValue(updatedOrder);

        await orderStatusController(req, res);

        expect(orderModel.findByIdAndUpdate).toHaveBeenCalledWith(
            "orderId",
            { status: "Delivered" },
            { new: true }
        );
        expect(res.json).toHaveBeenCalledWith(updatedOrder);
    });

    it("handles errors", async () => {
        const req = { params: { orderId: "orderId" }, body: { status: "Delivered" } };
        const res = createResponse();

        orderModel.findByIdAndUpdate.mockRejectedValue(new Error("db error"));

        await orderStatusController(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({
            success: false,
            message: "Error while updating order status",
            error: expect.any(Error),
        });
    });
});


