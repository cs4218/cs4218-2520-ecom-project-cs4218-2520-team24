import { Prices } from "./Prices";

describe("Prices Array", () => {
  it("should be an array of price range objects", () => {
    expect(Array.isArray(Prices)).toBe(true);
    expect(Prices.length).toBeGreaterThan(0);
  });

  it("should contain objects with _id, name, and array properties", () => {
    Prices.forEach((price) => {
      expect(price).toHaveProperty("_id");
      expect(price).toHaveProperty("name");
      expect(price).toHaveProperty("array");
      
      expect(typeof price._id).toBe("number");
      expect(typeof price.name).toBe("string");
      expect(Array.isArray(price.array)).toBe(true);
      expect(price.array.length).toBe(2);
      expect(typeof price.array[0]).toBe("number");
      expect(typeof price.array[1]).toBe("number");
    });
  });

  it("should have correct specific price ranges", () => {
    expect(Prices[0]).toEqual({
      _id: 0,
      name: "$0 to 19",
      array: [0, 19],
    });

    expect(Prices.at(-1)).toEqual({
      _id: 5,
      name: "$100 or more",
      array: [100, 9999],
    });
  });
});
