// Leong Yu Jun Nicholas A0257284W
import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Footer from "./Footer";

describe("Footer Component", () => {

it("renders the footer text correctly", () => {
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>
    );

    expect(screen.getByText(/All Rights Reserved © TestingComp/i)).toBeInTheDocument();
  });

  it("renders the About link correctly", () => {
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>
    );

    const aboutLink = screen.getByRole("link", { name: /About/i });
    
    expect(aboutLink).toBeInTheDocument();
    expect(aboutLink).toHaveAttribute("href", "/about");
  });

  it("renders the Contact link correctly", () => {
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>
    );

    const contactLink = screen.getByRole("link", { name: /Contact/i });
    
    expect(contactLink).toBeInTheDocument();
    expect(contactLink).toHaveAttribute("href", "/contact");
  });

  it("renders the Privacy Policy link correctly", () => {
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>
    );

    const policyLink = screen.getByRole("link", { name: /Privacy Policy/i });
    
    expect(policyLink).toBeInTheDocument();
    expect(policyLink).toHaveAttribute("href", "/policy");
  });
});
