// Leong Yu Jun Nicholas, A0257284W
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, useNavigate } from "react-router-dom";
import CartPage from "./CartPage";
import { CartProvider } from "../context/cart";
import { AuthProvider } from "../context/auth";
import "@testing-library/jest-dom/extend-expect";
import axios from "axios";

// Mocking only the navigator to verify route redirects
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: jest.fn(),
}));

jest.mock("axios", () => ({
  get: jest.fn(),
  post: jest.fn(),
  defaults: {
    headers: {
      common: {}
    }
  }
}));

jest.mock("../hooks/useCategory", () => jest.fn(() => []));
jest.mock("../context/search", () => ({
  useSearch: jest.fn(() => [{ keyword: "", results: [] }, jest.fn()])
}));

// Provide drop-in component integration setup function
const renderIntegratedCartPage = (initialCart = [], authState = { user: null, token: "" }) => {
  // Directly manipulate localStorage to establish test boundary
  localStorage.setItem("cart", JSON.stringify(initialCart));
  localStorage.setItem("auth", JSON.stringify(authState));

  return render(
    <AuthProvider>
      <CartProvider>
        <MemoryRouter>
          <CartPage />
        </MemoryRouter>
      </CartProvider>
    </AuthProvider>
  );
};

describe("Frontend Integration: Cart Context & UI Behaviors", () => {
  const mockItem1 = { _id: "p1", name: "Premium Laptop", price: 1000, description: "Fast PC" };
  const mockItem2 = { _id: "p2", name: "Wireless Mouse", price: 50, description: "Good mouse" };
  const mockAuthUser = { user: { name: "Integration User", address: "123 Lane" }, token: "mock-token" };
  let mockNavigate;

  beforeAll(() => {
    // Suppress expected console warning/errors around React act() and catch blocks
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterAll(() => {
    console.log.mockRestore();
    console.error.mockRestore();
  });

  beforeEach(() => {
    // Reset Braintree mock responses
    axios.get.mockResolvedValue({ data: { clientToken: "test-token" } });
    
    mockNavigate = jest.fn();
    useNavigate.mockReturnValue(mockNavigate);
  });

  afterEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it("F1 & F2: should properly sync Context with UI arrays, calculate dynamic Subtotals, and mutate LocalStorage", () => {
    // Arrange
    renderIntegratedCartPage([mockItem1, mockItem2], mockAuthUser);

    // Assert Initial Sync
    expect(screen.getByText(/You Have 2 items in your cart/i)).toBeInTheDocument();
    // Currency parsing usually checks total: 1000 + 50 = 1050 
    expect(screen.getByText(/Total : \$1,050.00/i)).toBeInTheDocument();
    
    // Act: Remove an item
    const removeButtons = screen.getAllByText(/Remove/i);
    fireEvent.click(removeButtons[1]); // Remove mouse

    // Assert Subsequent Sync (UI updates & LocalStorage side-effect)
    expect(screen.getByText(/You Have 1 items in your cart/i)).toBeInTheDocument();
    expect(screen.getByText(/Total : \$1,000.00/i)).toBeInTheDocument();
    
    // Test the persistence logic directly reading from mocked storage wrapper
    const savedCart = JSON.parse(localStorage.getItem("cart"));
    expect(savedCart).toHaveLength(1);
    expect(savedCart[0].name).toBe("Premium Laptop");
  });

  it("F3: unauthenticated users should see login prompt and be securely redirected during checkout flow", () => {
    // Arrange (Unauthenticated Cart flow)
    const unauthUser = { user: null, token: "" };
    renderIntegratedCartPage([mockItem1], unauthUser);

    // Assert standard UI prompt
    const loginPromptButton = screen.getByRole("button", { name: /Please Login to checkout/i });
    expect(loginPromptButton).toBeInTheDocument();

    // Act
    fireEvent.click(loginPromptButton);

    // Assert integration with router logic
    expect(mockNavigate).toHaveBeenCalledWith("/login", {
      state: "/cart", // Standard react-router hook redirect to reserve state
    });
  });

  it("F4: user address logic integration resolves properly to cart checkout", () => {
    // Arrange
    renderIntegratedCartPage([mockItem1], mockAuthUser);

    // Assert UI correctly pulled address down from AuthProvider into CartPage
    expect(screen.getByText(/Current Address/i)).toBeInTheDocument();
    expect(screen.getByText("123 Lane")).toBeInTheDocument();

    // Verify it doesn't show the unauthorized login prompt if address is resolved
    expect(screen.queryByText(/Please Login to checkout/i)).not.toBeInTheDocument();
  });

  it("F5: should display empty cart UI correctly and hide checkout payment section", () => {
    // Arrange (Empty cart)
    renderIntegratedCartPage([], mockAuthUser);

    // Assert "Your Cart Is Empty" takes precedence
    expect(screen.getByText(/Your Cart Is Empty/i)).toBeInTheDocument();

    // The checkout payment button should not be displayed when cart is empty
    expect(screen.queryByText(/Make Payment/i)).not.toBeInTheDocument();
  });

  it("F6: authenticated user with no address should see Update Address button instead of login prompt", () => {
    // Arrange: authenticated but address is empty/missing
    const authNoAddress = { user: { name: "No Address User" }, token: "mock-token" };
    renderIntegratedCartPage([mockItem1], authNoAddress);

    // Assert: Update Address button should be visible
    const updateBtn = screen.getByRole("button", { name: /Update Address/i });
    expect(updateBtn).toBeInTheDocument();

    // Assert: should NOT show "Please Login to checkout" (user is authenticated)
    expect(screen.queryByText(/Please Login to checkout/i)).not.toBeInTheDocument();

    // Assert: should NOT show "Current Address" section since there is no address
    expect(screen.queryByText(/Current Address/i)).not.toBeInTheDocument();

    // Act: Click Update Address should navigate to profile
    fireEvent.click(updateBtn);
    expect(mockNavigate).toHaveBeenCalledWith("/dashboard/user/profile");
  });

  it("F7: CartContext hydrates from localStorage on initial mount and renders items", () => {
    // Arrange: Pre-populate localStorage before render to test useEffect hydration
    const preloadedItems = [
      { _id: "pre1", name: "Preloaded Widget", price: 200, description: "From storage" },
      { _id: "pre2", name: "Preloaded Gadget", price: 300, description: "Also from storage" },
    ];

    // Render with preloaded cart (simulating a returning user with items in localStorage)
    renderIntegratedCartPage(preloadedItems, mockAuthUser);

    // Assert: CartContext useEffect should have read localStorage and the UI should display the items
    expect(screen.getByText(/You Have 2 items in your cart/i)).toBeInTheDocument();
    expect(screen.getByText("Preloaded Widget")).toBeInTheDocument();
    expect(screen.getByText("Preloaded Gadget")).toBeInTheDocument();

    // Assert: Subtotal should reflect the correct total ($200 + $300 = $500)
    expect(screen.getByText(/Total : \$500.00/i)).toBeInTheDocument();
  });
});
