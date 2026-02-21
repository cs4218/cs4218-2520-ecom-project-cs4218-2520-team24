import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CartProvider, useCart } from "./cart";

const CartConsumer = () => {
  const [cart, setCart] = useCart();

  return (
    <>
      <span data-testid="count">{cart.length}</span>
      <button onClick={() => setCart([...cart, { _id: "new-item" }])}>add</button>
    </>
  );
};

describe("Cart context", () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  it("uses empty cart by default", () => {
    render(
      <CartProvider>
        <CartConsumer />
      </CartProvider>
    );

    expect(screen.getByTestId("count")).toHaveTextContent("0");
  });

  it("hydrates cart from localStorage", async () => {
    localStorage.setItem("cart", JSON.stringify([{ _id: "item-1" }, { _id: "item-2" }]));

    render(
      <CartProvider>
        <CartConsumer />
      </CartProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("count")).toHaveTextContent("2");
    });
  });

  it("updates cart state via setCart", async () => {
    render(
      <CartProvider>
        <CartConsumer />
      </CartProvider>
    );

    fireEvent.click(screen.getByText("add"));

    await waitFor(() => {
      expect(screen.getByTestId("count")).toHaveTextContent("1");
    });
  });
});