// Leong Yu Jun Nicholas A0257284W
import mongoose from "mongoose";
import connectDB from "./db";
import "colors";

// Mock mongoose
jest.mock("mongoose");

describe("Database Connection", () => {
  let consoleLogSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    process.env.MONGO_URL = "mongodb://localhost:27017/testdb";
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    delete process.env.MONGO_URL;
  });

  it("should connect to the database successfully", async () => {
    // Mock a successful connection
    const mockConnection = {
      connection: {
        host: "localhost",
      },
    };
    mongoose.connect.mockResolvedValueOnce(mockConnection);

    await connectDB();

    expect(mongoose.connect).toHaveBeenCalledWith("mongodb://localhost:27017/testdb");
    expect(consoleLogSpy).toHaveBeenCalledWith(`Connected To Mongodb Database localhost`.bgMagenta.white);
  });

  it("should handle connection errors gracefully", async () => {
    // Mock a connection error
    const mockError = new Error("Connection failed");
    mongoose.connect.mockRejectedValueOnce(mockError);

    await connectDB();

    expect(mongoose.connect).toHaveBeenCalledWith("mongodb://localhost:27017/testdb");
    expect(consoleLogSpy).toHaveBeenCalledWith(`Error in Mongodb Error: Connection failed`.bgRed.white);
  });

  it("should use process.env.MONGO_URL for connection", async () => {
    process.env.MONGO_URL = "mongodb://custom-url:27017/customdb";
    mongoose.connect.mockResolvedValueOnce({ connection: { host: "custom-host" } });

    await connectDB();

    expect(mongoose.connect).toHaveBeenCalledWith("mongodb://custom-url:27017/customdb");
    expect(consoleLogSpy).toHaveBeenCalledWith(`Connected To Mongodb Database custom-host`.bgMagenta.white);
  });

  it("should handle missing MONGO_URL gracefully", async () => {
    delete process.env.MONGO_URL;
    mongoose.connect.mockResolvedValueOnce({ connection: { host: "localhost" } });

    await connectDB();

    expect(mongoose.connect).toHaveBeenCalledWith(undefined);
  });
});
