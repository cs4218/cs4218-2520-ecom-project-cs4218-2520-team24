// Leong Yu Jun Nicholas A0257284W
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import axios from "axios";
import { MemoryRouter, useNavigate } from "react-router-dom";
import "@testing-library/jest-dom/extend-expect";
import SearchInput from "./SearchInput";
import { useSearch } from "../../context/search";

// Mock dependencies
jest.mock("axios");
jest.mock("../../context/search", () => ({
  useSearch: jest.fn(),
}));

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

describe("SearchInput Component", () => {
  let mockSetValues;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSetValues = jest.fn();
    useSearch.mockReturnValue([{ keyword: "", results: [] }, mockSetValues]);
  });

  it("renders the search input and button", () => {
    render(
      <MemoryRouter>
        <SearchInput />
      </MemoryRouter>
    );

    expect(screen.getByPlaceholderText("Search")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /search/i })).toBeInTheDocument();
  });

  it("updates keyword value on input change", () => {
    render(
      <MemoryRouter>
        <SearchInput />
      </MemoryRouter>
    );

    const input = screen.getByPlaceholderText("Search");
    fireEvent.change(input, { target: { value: "laptop" } });

    expect(mockSetValues).toHaveBeenCalledWith({ keyword: "laptop", results: [] });
  });

  it("submits the form, fetches results, and navigates to /search", async () => {
    useSearch.mockReturnValue([{ keyword: "phone", results: [] }, mockSetValues]);
    const mockData = [{ _id: "1", name: "Phone 1" }];
    axios.get.mockResolvedValueOnce({ data: mockData });

    render(
      <MemoryRouter>
        <SearchInput />
      </MemoryRouter>
    );

    const button = screen.getByRole("button", { name: /search/i });
    fireEvent.click(button);

    expect(axios.get).toHaveBeenCalledWith("/api/v1/product/search/phone");

    await waitFor(() => {
      expect(mockSetValues).toHaveBeenCalledWith({ keyword: "phone", results: mockData });
      expect(mockNavigate).toHaveBeenCalledWith("/search");
    });
  });

  it("handles API errors gracefully", async () => {
    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    useSearch.mockReturnValue([{ keyword: "error-test", results: [] }, mockSetValues]);
    axios.get.mockRejectedValueOnce(new Error("API Error"));

    render(
      <MemoryRouter>
        <SearchInput />
      </MemoryRouter>
    );

    const button = screen.getByRole("button", { name: /search/i });
    fireEvent.click(button);

    expect(axios.get).toHaveBeenCalledWith("/api/v1/product/search/error-test");

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    consoleSpy.mockRestore();
  });
});
