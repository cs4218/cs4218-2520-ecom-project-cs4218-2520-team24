// Choo Jia Rong, A0257352A
import JWT from "jsonwebtoken";
import userModel from "../models/userModel.js";
import { isAdmin, requireSignIn } from "./authMiddleware.js";

jest.mock("jsonwebtoken");
jest.mock("../models/userModel.js");

function createResponse() {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    return res;
}

describe("authMiddleware", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("requireSignIn", () => {
        it("verifies token and calls next", async () => {
            const req = { headers: { authorization: "Bearer token" } };
            const res = createResponse();
            const next = jest.fn();
            JWT.verify.mockReturnValue({ _id: "userId" });
            process.env.JWT_SECRET = "test_secret";

            await requireSignIn(req, res, next);

            expect(JWT.verify).toHaveBeenCalledWith("Bearer token", "test_secret");
            expect(req.user).toEqual({ _id: "userId" });
            expect(next).toHaveBeenCalled();
        });

        it("logs error when token is invalid", async () => {
            const req = { headers: { authorization: "Bearer token" } };
            const res = createResponse();
            const next = jest.fn();
            const error = new Error("invalid token");
            JWT.verify.mockImplementation(() => {
                throw error;
            });
            const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});

            await requireSignIn(req, res, next);

            expect(consoleSpy).toHaveBeenCalledWith(error);
            expect(next).not.toHaveBeenCalled();

            consoleSpy.mockRestore();
        });
    });

    describe("isAdmin", () => {
        it("returns 401 when user is not admin", async () => {
            const req = { user: { _id: "userId" } };
            const res = createResponse();
            const next = jest.fn();
            userModel.findById.mockResolvedValue({ role: 0 });

            await isAdmin(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: "UnAuthorized Access",
            });
            expect(next).not.toHaveBeenCalled();
        });

        it("calls next when user is admin", async () => {
            const req = { user: { _id: "userId" } };
            const res = createResponse();
            const next = jest.fn();
            userModel.findById.mockResolvedValue({ role: 1 });

            await isAdmin(req, res, next);

            expect(next).toHaveBeenCalled();
        });

        it("handles errors and returns 401", async () => {
            const req = { user: { _id: "userId" } };
            const res = createResponse();
            const next = jest.fn();
            const error = new Error("db error");
            userModel.findById.mockRejectedValue(error);
            const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});

            await isAdmin(req, res, next);

            expect(consoleSpy).toHaveBeenCalledWith(error);
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                error,
                message: "Error in admin middleware",
            });
            expect(next).not.toHaveBeenCalled();

            consoleSpy.mockRestore();
        });
    });
});
