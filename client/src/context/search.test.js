import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SearchProvider, useSearch } from "./search";

const SearchConsumer = () => {
  const [search, setSearch] = useSearch();

  return (
    <>
      <span data-testid="keyword">{search.keyword || "empty"}</span>
      <span data-testid="results-count">{search.results.length}</span>
      <button
        onClick={() =>
          setSearch({
            keyword: "laptop",
            results: [{ _id: "product-1" }],
          })
        }
      >
        update
      </button>
    </>
  );
};

describe("Search context", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("uses default search state", () => {
    render(
      <SearchProvider>
        <SearchConsumer />
      </SearchProvider>
    );

    expect(screen.getByTestId("keyword")).toHaveTextContent("empty");
    expect(screen.getByTestId("results-count")).toHaveTextContent("0");
  });

  it("updates search state via setSearch", async () => {
    render(
      <SearchProvider>
        <SearchConsumer />
      </SearchProvider>
    );

    fireEvent.click(screen.getByText("update"));

    await waitFor(() => {
      expect(screen.getByTestId("keyword")).toHaveTextContent("laptop");
      expect(screen.getByTestId("results-count")).toHaveTextContent("1");
    });
  });
});