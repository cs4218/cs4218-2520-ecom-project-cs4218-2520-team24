import React from "react";
import { render, screen } from "@testing-library/react";
import Layout from "./Layout";
import { Helmet } from "react-helmet";

// Mock the child components
jest.mock("./Header", () => () => <header data-testid="header">Header</header>);
jest.mock("./Footer", () => () => <footer data-testid="footer">Footer</footer>);
jest.mock("react-hot-toast", () => ({
  Toaster: () => <div data-testid="toaster">Toaster</div>,
}));

describe("Layout Component", () => {
  it("renders Header, Footer, Toaster, and children", () => {
    render(
      <Layout>
        <div data-testid="child-content">Child Content</div>
      </Layout>
    );

    expect(screen.getByTestId("header")).toBeInTheDocument();
    expect(screen.getByTestId("footer")).toBeInTheDocument();
    expect(screen.getByTestId("toaster")).toBeInTheDocument();
    expect(screen.getByTestId("child-content")).toBeInTheDocument();
    expect(screen.getByText("Child Content")).toBeInTheDocument();
  });

  it("sets default Helmet props correctly", () => {
    render(
      <Layout>
        <div>Content</div>
      </Layout>
    );

    const helmet = Helmet.peek();
    expect(helmet.title).toBe("Ecommerce app - shop now");
    
    const metaTags = helmet.metaTags;
    expect(metaTags).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "description", content: "mern stack project" }),
        expect.objectContaining({ name: "keywords", content: "mern,react,node,mongodb" }),
        expect.objectContaining({ name: "author", content: "Techinfoyt" }),
      ])
    );
  });

  it("sets custom Helmet props correctly", () => {
    render(
      <Layout
        title="Custom Title"
        description="Custom Description"
        keywords="custom, keywords"
        author="Custom Author"
      >
        <div>Content</div>
      </Layout>
    );

    const helmet = Helmet.peek();
    expect(helmet.title).toBe("Custom Title");
    
    const metaTags = helmet.metaTags;
    expect(metaTags).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "description", content: "Custom Description" }),
        expect.objectContaining({ name: "keywords", content: "custom, keywords" }),
        expect.objectContaining({ name: "author", content: "Custom Author" }),
      ])
    );
  });
});
