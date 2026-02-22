import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import axios from "axios";
import "@testing-library/jest-dom/extend-expect";
import PrivateRoute from "./Private";
import { useAuth } from "../../context/auth";

// Mock dependencies
jest.mock("axios");
jest.mock("../../context/auth", () => ({
  useAuth: jest.fn(),
}));
jest.mock("../Spinner", () => () => <div data-testid="spinner">Loading...</div>);

describe("PrivateRoute Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders Spinner when auth token is not present", () => {
    useAuth.mockReturnValue([{ token: null }, jest.fn()]);

    render(
      <MemoryRouter initialEntries={["/private"]}>
        <Routes>
          <Route path="/private" element={<PrivateRoute />}>
            <Route index element={<div data-testid="private-content">Private Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByTestId("spinner")).toBeInTheDocument();
    expect(screen.queryByTestId("private-content")).not.toBeInTheDocument();
  });

  it("renders Outlet content when auth check is successful", async () => {
    useAuth.mockReturnValue([{ token: "valid-token" }, jest.fn()]);
    axios.get.mockResolvedValueOnce({ data: { ok: true } });

    render(
      <MemoryRouter initialEntries={["/private"]}>
        <Routes>
          <Route path="/private" element={<PrivateRoute />}>
            <Route index element={<div data-testid="private-content">Private Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    // Initially it might show spinner while checking
    expect(screen.getByTestId("spinner")).toBeInTheDocument();

    // Wait for the auth check to complete and content to render
    await waitFor(() => {
      expect(screen.getByTestId("private-content")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("spinner")).not.toBeInTheDocument();
    expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/user-auth");
  });

  it("renders Spinner when auth check fails", async () => {
    useAuth.mockReturnValue([{ token: "invalid-token" }, jest.fn()]);
    axios.get.mockResolvedValueOnce({ data: { ok: false } });

    render(
      <MemoryRouter initialEntries={["/private"]}>
        <Routes>
          <Route path="/private" element={<PrivateRoute />}>
            <Route index element={<div data-testid="private-content">Private Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId("spinner")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("private-content")).not.toBeInTheDocument();
    expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/user-auth");
  });
});
