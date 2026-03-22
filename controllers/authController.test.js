import express from "express";
import request from "supertest";

const mockSave = jest.fn();
const mockUserModel = jest.fn(() => ({ save: mockSave }));
mockUserModel.findOne = jest.fn();
mockUserModel.findById = jest.fn();
mockUserModel.findByIdAndUpdate = jest.fn();

const mockHashPassword = jest.fn();
const mockComparePassword = jest.fn();

const mockSign = jest.fn();

const mockOrderSave = jest.fn();
const mockOrderModel = jest.fn(() => ({ save: mockOrderSave }));
mockOrderModel.find = jest.fn();
mockOrderModel.findByIdAndUpdate = jest.fn();

jest.mock("../models/userModel.js", () => ({
  __esModule: true,
  default: mockUserModel,
}));

jest.mock("../helpers/authHelper.js", () => ({
  __esModule: true,
  hashPassword: mockHashPassword,
  comparePassword: mockComparePassword,
}));

jest.mock("../models/orderModel.js", () => ({
  __esModule: true,
  default: mockOrderModel,
}));

jest.mock("jsonwebtoken", () => ({
  __esModule: true,
  default: {
    sign: mockSign,
  },
  sign: mockSign,
}));

const createRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const createOrderQuery = (result) => {
  const chain = {
    populate: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
  };
  chain.then = (resolve, reject) => Promise.resolve(result).then(resolve, reject);
  return chain;
};

const setupApp = async () => {
  const { registerController, loginController } = await import(
    "../controllers/authController.js"
  );
  const router = express.Router();
  router.post("/register", registerController);
  router.post("/login", loginController);

  const app = express();
  app.use(express.json());
  app.use("/api/v1/auth", router);
  return app;
};

describe("Auth controllers integration", () => {
  beforeAll(() => {
    process.env.JWT_SECRET = "test-secret";
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("registers a new user", async () => {
    const app = await setupApp();

    mockUserModel.findOne.mockResolvedValueOnce(null);
    mockHashPassword.mockResolvedValueOnce("hashed-password");
    mockSave.mockResolvedValueOnce({
      _id: "user-1",
      name: "Jane Doe",
      email: "jane@example.com",
      phone: "1234567890",
      address: "123 Street",
      answer: "Blue",
    });

    const response = await request(app)
      .post("/api/v1/auth/register")
      .send({
        name: "Jane Doe",
        email: "jane@example.com",
        password: "password123",
        phone: "1234567890",
        address: "123 Street",
        answer: "Blue",
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe("User Register Successfully");
    expect(mockHashPassword).toHaveBeenCalledWith("password123");
    expect(mockUserModel).toHaveBeenCalledWith({
      name: "Jane Doe",
      email: "jane@example.com",
      phone: "1234567890",
      address: "123 Street",
      password: "hashed-password",
      answer: "Blue",
    });
    expect(mockSave).toHaveBeenCalled();
  });

  it("validates missing registration fields", async () => {
    const { registerController } = await import(
      "../controllers/authController.js"
    );

    const baseReq = {
      body: {
        name: "Jane Doe",
        email: "jane@example.com",
        password: "password123",
        phone: "1234567890",
        address: "123 Street",
        answer: "Blue",
      },
    };

    const res = createRes();
    await registerController({ body: { ...baseReq.body, name: "" } }, res);
    expect(res.send).toHaveBeenCalledWith({ error: "Name is Required" });

    res.send.mockClear();
    await registerController({ body: { ...baseReq.body, email: "" } }, res);
    expect(res.send).toHaveBeenCalledWith({ message: "Email is Required" });

    res.send.mockClear();
    await registerController({ body: { ...baseReq.body, password: "" } }, res);
    expect(res.send).toHaveBeenCalledWith({ message: "Password is Required" });

    res.send.mockClear();
    await registerController({ body: { ...baseReq.body, phone: "" } }, res);
    expect(res.send).toHaveBeenCalledWith({ message: "Phone no is Required" });

    res.send.mockClear();
    await registerController({ body: { ...baseReq.body, address: "" } }, res);
    expect(res.send).toHaveBeenCalledWith({ message: "Address is Required" });

    res.send.mockClear();
    await registerController({ body: { ...baseReq.body, answer: "" } }, res);
    expect(res.send).toHaveBeenCalledWith({ message: "Answer is Required" });
  });

  it("rejects duplicate registration by email", async () => {
    const app = await setupApp();

    mockUserModel.findOne.mockResolvedValueOnce({
      _id: "user-1",
      email: "jane@example.com",
    });

    const response = await request(app)
      .post("/api/v1/auth/register")
      .send({
        name: "Jane Doe",
        email: "jane@example.com",
        password: "password123",
        phone: "1234567890",
        address: "123 Street",
        answer: "Blue",
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Already Register please login");
    expect(mockSave).not.toHaveBeenCalled();
  });

  it("handles registration errors", async () => {
    const { registerController } = await import(
      "../controllers/authController.js"
    );

    mockUserModel.findOne.mockRejectedValueOnce(new Error("db error"));
    const res = createRes();

    await registerController(
      {
        body: {
          name: "Jane Doe",
          email: "jane@example.com",
          password: "password123",
          phone: "1234567890",
          address: "123 Street",
          answer: "Blue",
        },
      },
      res
    );

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Errro in Registeration",
      })
    );
  });

  it("logs in and returns a JWT", async () => {
    const app = await setupApp();

    const user = {
      _id: "user-1",
      name: "Jane Doe",
      email: "jane@example.com",
      phone: "1234567890",
      address: "123 Street",
      role: 0,
      password: "hashed-password",
    };

    mockUserModel.findOne.mockResolvedValueOnce(user);
    mockComparePassword.mockResolvedValueOnce(true);
    mockSign.mockReturnValueOnce("jwt-token");

    const response = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: "jane@example.com",
        password: "password123",
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.token).toBe("jwt-token");
    expect(response.body.user).toMatchObject({
      _id: "user-1",
      name: "Jane Doe",
      email: "jane@example.com",
      phone: "1234567890",
      address: "123 Street",
      role: 0,
    });
    expect(mockComparePassword).toHaveBeenCalledWith(
      "password123",
      "hashed-password"
    );
    expect(mockSign).toHaveBeenCalledWith({ _id: "user-1" }, "test-secret", {
      expiresIn: "7d",
    });
  });

  it("rejects login when email is not registered", async () => {
    const { loginController } = await import(
      "../controllers/authController.js"
    );
    mockUserModel.findOne.mockResolvedValueOnce(null);
    const res = createRes();

    await loginController(
      { body: { email: "missing@example.com", password: "pass" } },
      res
    );

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Email is not registerd",
    });
  });

  it("rejects login with invalid password", async () => {
    const app = await setupApp();

    mockUserModel.findOne.mockResolvedValueOnce({
      _id: "user-1",
      email: "jane@example.com",
      password: "hashed-password",
    });
    mockComparePassword.mockResolvedValueOnce(false);

    const response = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: "jane@example.com",
        password: "wrong-password",
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Invalid Password");
  });

  it("handles login errors", async () => {
    const { loginController } = await import(
      "../controllers/authController.js"
    );
    mockUserModel.findOne.mockRejectedValueOnce(new Error("db error"));
    const res = createRes();

    await loginController(
      { body: { email: "jane@example.com", password: "password123" } },
      res
    );

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Error in login",
      })
    );
  });

  it("rejects login with missing credentials", async () => {
    const app = await setupApp();

    const response = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "" });

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Invalid email or password");
  });

  it("handles forgot password validation and success", async () => {
    const { forgotPasswordController } = await import(
      "../controllers/authController.js"
    );
    const res = createRes();

    await forgotPasswordController({ body: { answer: "Blue" } }, res);
    expect(res.status).toHaveBeenCalledWith(400);

    res.status.mockClear();
    await forgotPasswordController({ body: { email: "jane@example.com" } }, res);
    expect(res.status).toHaveBeenCalledWith(400);

    res.status.mockClear();
    await forgotPasswordController(
      { body: { email: "jane@example.com", answer: "Blue" } },
      res
    );
    expect(res.status).toHaveBeenCalledWith(400);

    mockUserModel.findOne.mockResolvedValueOnce(null);
    await forgotPasswordController(
      {
        body: {
          email: "jane@example.com",
          answer: "Blue",
          newPassword: "newpass123",
        },
      },
      res
    );
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Wrong Email Or Answer",
    });

    mockUserModel.findOne.mockResolvedValueOnce({ _id: "user-1" });
    mockHashPassword.mockResolvedValueOnce("hashed-new");
    mockUserModel.findByIdAndUpdate.mockResolvedValueOnce({});

    await forgotPasswordController(
      {
        body: {
          email: "jane@example.com",
          answer: "Blue",
          newPassword: "newpass123",
        },
      },
      res
    );

    expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith("user-1", {
      password: "hashed-new",
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      message: "Password Reset Successfully",
    });
  });

  it("handles forgot password errors", async () => {
    const { forgotPasswordController } = await import(
      "../controllers/authController.js"
    );
    mockUserModel.findOne.mockRejectedValueOnce(new Error("db error"));
    const res = createRes();

    await forgotPasswordController(
      {
        body: {
          email: "jane@example.com",
          answer: "Blue",
          newPassword: "newpass123",
        },
      },
      res
    );

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Something went wrong",
      })
    );
  });

  it("updates profile and validates password length", async () => {
    const { updateProfileController } = await import(
      "../controllers/authController.js"
    );
    const res = createRes();

    await updateProfileController(
      { body: { password: "123" }, user: { _id: "user-1" } },
      res
    );
    expect(res.json).toHaveBeenCalledWith({
      error: "Passsword is required and 6 character long",
    });

    mockUserModel.findById.mockResolvedValueOnce({
      _id: "user-1",
      name: "Jane Doe",
      phone: "123",
      address: "Address",
      password: "hashed-old",
    });
    mockHashPassword.mockResolvedValueOnce("hashed-new");
    mockUserModel.findByIdAndUpdate.mockResolvedValueOnce({
      _id: "user-1",
      name: "Jane Doe",
      phone: "123",
      address: "Address",
    });

    await updateProfileController(
      {
        body: { name: "Jane Doe", password: "newpass123" },
        user: { _id: "user-1" },
      },
      res
    );

    expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({ password: "hashed-new" }),
      { new: true }
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("handles profile update errors", async () => {
    const { updateProfileController } = await import(
      "../controllers/authController.js"
    );
    mockUserModel.findById.mockRejectedValueOnce(new Error("db error"));
    const res = createRes();

    await updateProfileController(
      { body: { name: "Jane" }, user: { _id: "user-1" } },
      res
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Error WHile Update profile",
      })
    );
  });

  it("returns orders for a user", async () => {
    const { getOrdersController } = await import(
      "../controllers/authController.js"
    );
    const res = createRes();
    const orders = [{ _id: "order-1" }];
    mockOrderModel.find.mockReturnValueOnce(createOrderQuery(orders));

    await getOrdersController({ user: { _id: "user-1" } }, res);

    expect(res.json).toHaveBeenCalledWith(orders);
  });

  it("handles get orders errors", async () => {
    const { getOrdersController } = await import(
      "../controllers/authController.js"
    );
    mockOrderModel.find.mockImplementationOnce(() => {
      throw new Error("db error");
    });
    const res = createRes();

    await getOrdersController({ user: { _id: "user-1" } }, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Error WHile Geting Orders",
      })
    );
  });

  it("returns all orders for admin", async () => {
    const { getAllOrdersController } = await import(
      "../controllers/authController.js"
    );
    const res = createRes();
    const orders = [{ _id: "order-1" }];
    mockOrderModel.find.mockReturnValueOnce(createOrderQuery(orders));

    await getAllOrdersController({}, res);

    expect(res.json).toHaveBeenCalledWith(orders);
  });

  it("handles get all orders errors", async () => {
    const { getAllOrdersController } = await import(
      "../controllers/authController.js"
    );
    mockOrderModel.find.mockImplementationOnce(() => {
      throw new Error("db error");
    });
    const res = createRes();

    await getAllOrdersController({}, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Error WHile Geting Orders",
      })
    );
  });

  it("updates order status", async () => {
    const { orderStatusController } = await import(
      "../controllers/authController.js"
    );
    const res = createRes();
    mockOrderModel.findByIdAndUpdate.mockResolvedValueOnce({ _id: "order-1" });

    await orderStatusController(
      { params: { orderId: "order-1" }, body: { status: "PAID" } },
      res
    );

    expect(mockOrderModel.findByIdAndUpdate).toHaveBeenCalledWith(
      "order-1",
      { status: "PAID" },
      { new: true }
    );
    expect(res.json).toHaveBeenCalledWith({ _id: "order-1" });
  });

  it("handles order status errors", async () => {
    const { orderStatusController } = await import(
      "../controllers/authController.js"
    );
    mockOrderModel.findByIdAndUpdate.mockRejectedValueOnce(new Error("db"));
    const res = createRes();

    await orderStatusController(
      { params: { orderId: "order-1" }, body: { status: "PAID" } },
      res
    );

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Error While Updateing Order",
      })
    );
  });

  it("returns protected route message", async () => {
    const { testController } = await import("../controllers/authController.js");
    const res = createRes();

    await testController({}, res);
    expect(res.send).toHaveBeenCalledWith("Protected Routes");
  });

  it("handles test controller errors", async () => {
    const { testController } = await import("../controllers/authController.js");
    const res = createRes();
    res.send.mockImplementationOnce(() => {
      throw new Error("send failed");
    });

    await testController({}, res);

    expect(res.send).toHaveBeenCalledWith({ error: expect.any(Error) });
  });
});
