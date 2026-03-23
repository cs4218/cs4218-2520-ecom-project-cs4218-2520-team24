// Choo Jia Rong
import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import Header from "../../components/Header";
import { AuthProvider } from "../../context/auth";
import { CartProvider } from "../../context/cart";
import { SearchProvider } from "../../context/search";
import Login from "./Login";
import Register from "./Register";

jest.mock("axios");
jest.mock("react-hot-toast", () => ({
  success: jest.fn(),
  error: jest.fn(),
  Toaster: function Toaster() {
    return null;
  },
}));

jest.mock("../../hooks/useCategory", () => jest.fn(() => []));
jest.mock("../../components/Form/SearchInput", () => () => (
  <div data-testid="search-input" />
));

window.matchMedia =
  window.matchMedia ||
  function matchMedia() {
    return {
      matches: false,
      addListener: function addListener() {},
      removeListener: function removeListener() {},
    };
  };

const renderWithProviders = (initialEntries = ["/login"]) =>
  render(
    <AuthProvider>
      <SearchProvider>
        <CartProvider>
          <MemoryRouter initialEntries={initialEntries}>
            <Routes>
              <Route path="/" element={<Header />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
            </Routes>
          </MemoryRouter>
        </CartProvider>
      </SearchProvider>
    </AuthProvider>
  );

describe("Auth pages integration with AuthContext", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it("logs in and updates localStorage and Header", async () => {
    const authResponse = {
      success: true,
      message: "Logged in",
      user: { id: 1, name: "John Doe", role: 0 },
      token: "mockToken",
    };

    axios.post.mockResolvedValueOnce({ data: authResponse });
    const setItemSpy = jest.spyOn(Storage.prototype, "setItem");

    renderWithProviders(["/login"]);

    const nav = within(screen.getByRole("navigation"));
    expect(nav.getByRole("link", { name: "Login" })).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("Enter Your Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Enter Your Password"), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "LOGIN" }));

    await waitFor(() =>
      expect(axios.post).toHaveBeenCalledWith("/api/v1/auth/login", {
        email: "test@example.com",
        password: "password123",
      })
    );

    await waitFor(() =>
      expect(setItemSpy).toHaveBeenCalledWith(
        "auth",
        JSON.stringify(authResponse)
      )
    );

    expect(toast.success).toHaveBeenCalledWith(authResponse.message, {
      duration: 5000,
      icon: "🙏",
      style: {
        background: "green",
        color: "white",
      },
    });

    await waitFor(() =>
      expect(screen.getByRole("navigation")).toHaveTextContent("John Doe")
    );
    await waitFor(() =>
      expect(screen.queryByRole("link", { name: "Login" })).not.toBeInTheDocument()
    );

    setItemSpy.mockRestore();
  });

  it("registers without mutating auth context", async () => {
    axios.post.mockResolvedValueOnce({ data: { success: true } });
    const setItemSpy = jest.spyOn(Storage.prototype, "setItem");

    renderWithProviders(["/register"]);

    fireEvent.change(screen.getByPlaceholderText("Enter Your Name"), {
      target: { value: "John Doe" },
    });
    fireEvent.change(screen.getByPlaceholderText("Enter Your Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Enter Your Password"), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByPlaceholderText("Enter Your Phone"), {
      target: { value: "1234567890" },
    });
    fireEvent.change(screen.getByPlaceholderText("Enter Your Address"), {
      target: { value: "123 Street" },
    });
    fireEvent.change(screen.getByPlaceholderText("Enter Your DOB"), {
      target: { value: "2000-01-01" },
    });
    fireEvent.change(screen.getByPlaceholderText("What is Your Favorite sports"), {
      target: { value: "Football" },
    });

    fireEvent.click(screen.getByRole("button", { name: "REGISTER" }));

    await waitFor(() => expect(axios.post).toHaveBeenCalled());
    expect(setItemSpy).not.toHaveBeenCalled();

    await waitFor(() =>
      expect(screen.getByText("LOGIN FORM")).toBeInTheDocument()
    );

    setItemSpy.mockRestore();
  });
});
