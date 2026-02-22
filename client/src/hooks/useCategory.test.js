import { renderHook, waitFor } from "@testing-library/react";
import axios from "axios";
import useCategory from "./useCategory";

jest.mock("axios");

describe("useCategory Hook", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should fetch and return categories successfully", async () => {
    const mockCategories = [
      { _id: "1", name: "Electronics", slug: "electronics" },
      { _id: "2", name: "Books", slug: "books" },
    ];

    axios.get.mockResolvedValueOnce({
      data: {
        success: true,
        category: mockCategories,
      },
    });

    const { result } = renderHook(() => useCategory());

    // Initially, categories should be an empty array
    expect(result.current).toEqual([]);

    // Wait for the API call to resolve and state to update
    await waitFor(() => {
      expect(result.current).toEqual(mockCategories);
    });

    expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category");
    expect(axios.get).toHaveBeenCalledTimes(1);
  });

  it("should handle API errors gracefully and return empty array", async () => {
    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    const mockError = new Error("Network Error");
    
    axios.get.mockRejectedValueOnce(mockError);

    const { result } = renderHook(() => useCategory());

    // Initially, categories should be an empty array
    expect(result.current).toEqual([]);

    // Wait for the API call to reject
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(mockError);
    });

    // Categories should remain empty
    expect(result.current).toEqual([]);

    expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category");
    expect(axios.get).toHaveBeenCalledTimes(1);

    consoleSpy.mockRestore();
  });
});
