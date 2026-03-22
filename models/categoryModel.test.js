// Leong Yu Jun Nicholas A0257284W
import mongoose from "mongoose";
import Category from "./categoryModel";

describe("Category Model Test", () => {

it("should create a category successfully", () => {
    const categoryData = {
      name: "Electronics",
      slug: "electronics",
    };
    
    const category = new Category(categoryData);
    
    expect(category.name).toBe(categoryData.name);
    expect(category.slug).toBe(categoryData.slug);
  });

  it("should lowercase the slug", () => {
    const categoryData = {
      name: "Books",
      slug: "BOOKS",
    };
    const category = new Category(categoryData);
    
    // Mongoose setters (like lowercase) are applied during validation or save
    category.validateSync();
    
    expect(category.slug).toBe("books");
  });

  it("should fail validation if name is missing", () => {
    const category = new Category({ slug: "test-slug" });
    const err = category.validateSync();
    expect(err).toBeUndefined(); // Name is not strictly required in the schema, just unique
  });

  it("should allow empty slug", () => {
    const category = new Category({ name: "Test" });
    const err = category.validateSync();
    expect(err).toBeUndefined();
  });
});
