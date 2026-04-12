// Leong Yu Jun Nicholas A0257284W
import { Prices } from "./Prices";

describe("Prices Array", () => {

it("should be an array of price range objects", () => {
    const isArray = Array.isArray(Prices);
    const length = Prices.length;

    expect(isArray).toBe(true);
    expect(length).toBeGreaterThan(0);
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
    const firstPrice = Prices[0];
    const lastPrice = Prices.at(-1);

    expect(firstPrice).toEqual({
      _id: 0,
      name: "$0 to 19",
      array: [0, 19],
    });

    expect(lastPrice).toEqual({
      _id: 5,
      name: "$100 or more",
      array: [100, 9999],
    });
  });
});
