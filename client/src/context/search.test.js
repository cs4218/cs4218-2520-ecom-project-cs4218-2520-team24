import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/extend-expect";
import { SearchProvider, useSearch } from "./search";

// A test component to consume the context
const TestComponent = () => {
  const [search, setSearch] = useSearch();

  return (
    <div>
      <div data-testid="keyword">{search.keyword}</div>
      <div data-testid="results-length">{search.results.length}</div>
      <button
        onClick={() =>
          setSearch({ keyword: "test keyword", results: [{ id: 1, name: "Test Product" }] })
        }
      >
        Update Search
      </button>
    </div>
  );
};

describe("Search Context", () => {
  it("provides default values", () => {
    render(
      <SearchProvider>
        <TestComponent />
      </SearchProvider>
    );

    expect(screen.getByTestId("keyword")).toHaveTextContent("");
    expect(screen.getByTestId("results-length")).toHaveTextContent("0");
  });

  it("updates values correctly", () => {
    render(
      <SearchProvider>
        <TestComponent />
      </SearchProvider>
    );

    const button = screen.getByRole("button", { name: /update search/i });
    fireEvent.click(button);

    expect(screen.getByTestId("keyword")).toHaveTextContent("test keyword");
    expect(screen.getByTestId("results-length")).toHaveTextContent("1");
  });
});
