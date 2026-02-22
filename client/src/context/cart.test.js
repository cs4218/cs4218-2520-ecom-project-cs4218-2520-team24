import React from "react";
import { render, screen, act } from "@testing-library/react";
import { CartProvider, useCart } from "./cart";

// A test component to consume the context
const TestComponent = () => {
  const [cart, setCart] = useCart();

  return (
    <div>
      <div data-testid="cart-length">{cart.length}</div>
      <button
        data-testid="add-item"
        onClick={() => setCart([...cart, { id: 1, name: "Test Product" }])}
      >
        Add Item
      </button>
    </div>
  );
};

describe("Cart Context", () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    jest.clearAllMocks();
  });

  it("provides an empty cart by default", () => {
    render(
      <CartProvider>
        <TestComponent />
      </CartProvider>
    );

    expect(screen.getByTestId("cart-length")).toHaveTextContent("0");
  });

  it("loads cart from localStorage on mount", () => {
    const mockCart = [{ id: 1, name: "Saved Product" }, { id: 2, name: "Another Product" }];
    localStorage.setItem("cart", JSON.stringify(mockCart));

    render(
      <CartProvider>
        <TestComponent />
      </CartProvider>
    );

    expect(screen.getByTestId("cart-length")).toHaveTextContent("2");
  });

  it("allows updating the cart", () => {
    render(
      <CartProvider>
        <TestComponent />
      </CartProvider>
    );

    expect(screen.getByTestId("cart-length")).toHaveTextContent("0");

    act(() => {
      screen.getByTestId("add-item").click();
    });

    expect(screen.getByTestId("cart-length")).toHaveTextContent("1");
  });
});
