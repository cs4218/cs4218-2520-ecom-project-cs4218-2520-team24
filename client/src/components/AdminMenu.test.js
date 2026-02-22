import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import "@testing-library/jest-dom/extend-expect";
import AdminMenu from "./AdminMenu";

describe("AdminMenu Component", () => {
  it("renders the Admin Panel header", () => {
    render(
      <MemoryRouter>
        <AdminMenu />
      </MemoryRouter>
    );
    expect(screen.getByText("Admin Panel")).toBeInTheDocument();
  });

  it("renders all admin navigation links correctly", () => {
    render(
      <MemoryRouter>
        <AdminMenu />
      </MemoryRouter>
    );

    // Check if all links are present
    const createCategoryLink = screen.getByRole("link", { name: /create category/i });
    const createProductLink = screen.getByRole("link", { name: /create product/i });
    const productsLink = screen.getByRole("link", { name: /^products$/i });
    const ordersLink = screen.getByRole("link", { name: /orders/i });

    expect(createCategoryLink).toBeInTheDocument();
    expect(createProductLink).toBeInTheDocument();
    expect(productsLink).toBeInTheDocument();
    expect(ordersLink).toBeInTheDocument();

    // Check if links have correct href attributes
    expect(createCategoryLink).toHaveAttribute("href", "/dashboard/admin/create-category");
    expect(createProductLink).toHaveAttribute("href", "/dashboard/admin/create-product");
    expect(productsLink).toHaveAttribute("href", "/dashboard/admin/products");
    expect(ordersLink).toHaveAttribute("href", "/dashboard/admin/orders");
  });
});
