// Choo Jia Rong, A0257352A
import bcrypt from "bcrypt";
import { comparePassword, hashPassword } from "./authHelper.js";

jest.mock("bcrypt");

describe("authHelper", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("hashPassword", () => {
        it("hashes password with salt rounds", async () => {
            bcrypt.hash.mockResolvedValue("hashed_value");

            const result = await hashPassword("plain_password");

            expect(bcrypt.hash).toHaveBeenCalledWith("plain_password", 10);
            expect(result).toBe("hashed_value");
        });

        it("logs error and returns undefined on failure", async () => {
            const error = new Error("hash failed");
            bcrypt.hash.mockRejectedValue(error);
            const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});

            const result = await hashPassword("plain_password");

            expect(consoleSpy).toHaveBeenCalledWith(error);
            expect(result).toBeUndefined();

            consoleSpy.mockRestore();
        });
    });

    describe("comparePassword", () => {
        it("compares password with hash", async () => {
            bcrypt.compare.mockResolvedValue(true);

            const result = await comparePassword("plain_password", "hashed_value");

            expect(bcrypt.compare).toHaveBeenCalledWith("plain_password", "hashed_value");
            expect(result).toBe(true);
        });
    });
});
