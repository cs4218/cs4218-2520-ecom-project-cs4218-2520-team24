// Leong Yu Jun Nicholas A0257284W
import mongoose from "mongoose";
import User from "./userModel";

describe("User Model Test", () => {

it("should create a user successfully", () => {
    const userData = {
      name: "John Doe",
      email: "john@example.com",
      password: "password123",
      phone: "1234567890",
      address: "123 Main St",
      answer: "Blue",
    };
    const user = new User(userData);
    
    const err = user.validateSync();
    
    expect(err).toBeUndefined();
    expect(user.name).toBe(userData.name);
    expect(user.role).toBe(0); // Default role
  });

  it("should fail validation if required fields are missing", () => {
    const user = new User({});
    
    const err = user.validateSync();
    
    expect(err.errors.name).toBeDefined();
    expect(err.errors.email).toBeDefined();
    expect(err.errors.password).toBeDefined();
    expect(err.errors.phone).toBeDefined();
    expect(err.errors.address).toBeDefined();
    expect(err.errors.answer).toBeDefined();
  });

  it("should fail validation if only email is missing", () => {
    const user = new User({
      name: "John Doe",
      password: "password123",
      phone: "1234567890",
      address: "123 Main St",
      answer: "Blue",
    });
    const err = user.validateSync();
    expect(err.errors.email).toBeDefined();
    expect(err.errors.name).toBeUndefined();
  });

  it("should fail validation if only password is missing", () => {
    const user = new User({
      name: "John Doe",
      email: "john@example.com",
      phone: "1234567890",
      address: "123 Main St",
      answer: "Blue",
    });
    const err = user.validateSync();
    expect(err.errors.password).toBeDefined();
    expect(err.errors.email).toBeUndefined();
  });

  it("should set role to 0 by default", () => {
    const user = new User({
      name: "John Doe",
      email: "john@example.com",
      password: "password123",
      phone: "1234567890",
      address: "123 Main St",
      answer: "Blue",
    });
    expect(user.role).toBe(0);
  });

  it("should allow role to be set to 1 (admin)", () => {
    const user = new User({
      name: "Admin User",
      email: "admin@example.com",
      password: "password123",
      phone: "1234567890",
      address: "123 Main St",
      answer: "Blue",
      role: 1,
    });
    expect(user.role).toBe(1);
  });
});
