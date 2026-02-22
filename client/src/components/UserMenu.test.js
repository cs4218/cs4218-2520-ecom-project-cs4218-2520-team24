import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import "@testing-library/jest-dom/extend-expect";
import UserMenu from "./UserMenu";

describe("UserMenu Component", () => {
  it("renders the Dashboard header", () => {
    render(
      <MemoryRouter>
        <UserMenu />
      </MemoryRouter>
    );
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });

  it("renders all user navigation links correctly", () => {
    render(
      <MemoryRouter>
        <UserMenu />
      </MemoryRouter>
    );

    // Check if all links are present
    const profileLink = screen.getByRole("link", { name: /profile/i });
    const ordersLink = screen.getByRole("link", { name: /orders/i });

    expect(profileLink).toBeInTheDocument();
    expect(ordersLink).toBeInTheDocument();

    // Check if links have correct href attributes
    expect(profileLink).toHaveAttribute("href", "/dashboard/user/profile");
    expect(ordersLink).toHaveAttribute("href", "/dashboard/user/orders");
  });
});
