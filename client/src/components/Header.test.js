// Leong Yu Jun Nicholas A0257284W
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Header from "./Header";
import { useAuth } from "../context/auth";
import { useCart } from "../context/cart";
import useCategory from "../hooks/useCategory";
import toast from "react-hot-toast";

// Mock the hooks and components
jest.mock("../context/auth", () => ({
  useAuth: jest.fn(),
}));

jest.mock("../context/cart", () => ({
  useCart: jest.fn(),
}));

jest.mock("../hooks/useCategory", () => jest.fn());

jest.mock("react-hot-toast", () => ({
  success: jest.fn(),
}));

jest.mock("./Form/SearchInput", () => () => <div data-testid="search-input">SearchInput</div>);

describe("Header Component", () => {
  let mockSetAuth;

  beforeEach(() => {
    mockSetAuth = jest.fn();
    useAuth.mockReturnValue([{ user: null, token: "" }, mockSetAuth]);
    useCart.mockReturnValue([[]]);
    useCategory.mockReturnValue([]);
    Storage.prototype.removeItem = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("renders the brand name and basic links", () => {
    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    );

    expect(screen.getByText("🛒 Virtual Vault")).toBeInTheDocument();
    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("Categories")).toBeInTheDocument();
    expect(screen.getByTestId("search-input")).toBeInTheDocument();
  });

  it("renders Register and Login links when user is not authenticated", () => {
    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    );

    expect(screen.getByText("Register")).toBeInTheDocument();
    expect(screen.getByText("Login")).toBeInTheDocument();
    expect(screen.queryByText("Logout")).not.toBeInTheDocument();
  });

  it("renders user name and Dashboard/Logout links when user is authenticated", () => {
    useAuth.mockReturnValue([{ user: { name: "John Doe", role: 0 }, token: "token" }, mockSetAuth]);

    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    );

    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Logout")).toBeInTheDocument();
    expect(screen.queryByText("Register")).not.toBeInTheDocument();
    expect(screen.queryByText("Login")).not.toBeInTheDocument();
  });

  it("renders admin dashboard link when user is admin", () => {
    useAuth.mockReturnValue([{ user: { name: "Admin User", role: 1 }, token: "token" }, mockSetAuth]);

    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    );

    const dashboardLink = screen.getByText("Dashboard");
    
    expect(dashboardLink).toHaveAttribute("href", "/dashboard/admin");
  });

  it("renders user dashboard link when user is not admin", () => {
    useAuth.mockReturnValue([{ user: { name: "Normal User", role: 0 }, token: "token" }, mockSetAuth]);

    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    );

    const dashboardLink = screen.getByText("Dashboard");
    expect(dashboardLink).toHaveAttribute("href", "/dashboard/user");
  });

  it("handles logout correctly", () => {
    useAuth.mockReturnValue([{ user: { name: "John Doe", role: 0 }, token: "token" }, mockSetAuth]);

    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    );

    const logoutLink = screen.getByText("Logout");
    fireEvent.click(logoutLink);

    expect(mockSetAuth).toHaveBeenCalledWith({
      user: null,
      token: "",
    });
    expect(localStorage.removeItem).toHaveBeenCalledWith("auth");
    expect(toast.success).toHaveBeenCalledWith("Logout Successfully");
  });

  it("renders categories correctly", () => {
    const mockCategories = [
      { _id: "1", name: "Electronics", slug: "electronics" },
      { _id: "2", name: "Books", slug: "books" },
    ];
    useCategory.mockReturnValue(mockCategories);

    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    );

    expect(screen.getByText("All Categories")).toBeInTheDocument();
    expect(screen.getByText("Electronics")).toBeInTheDocument();
    expect(screen.getByText("Books")).toBeInTheDocument();
  });

  it("renders cart count correctly", () => {
    useCart.mockReturnValue([[{ id: 1 }, { id: 2 }]]);

    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    );

    // antd Badge renders the count inside a sup element
    expect(screen.getByText("2")).toBeInTheDocument();
  });
});
