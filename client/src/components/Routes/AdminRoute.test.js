// Leong Yu Jun Nicholas A0257284W
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import AdminRoute from "./AdminRoute";
import { useAuth } from "../../context/auth";
import axios from "axios";

// Mock dependencies
jest.mock("../../context/auth", () => ({
  useAuth: jest.fn(),
}));

jest.mock("axios");

jest.mock("../Spinner", () => () => <div data-testid="spinner">Spinner</div>);

describe("AdminRoute Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders Spinner initially when checking auth", () => {
    useAuth.mockReturnValue([{ token: "test-token" }, jest.fn()]);
    // Delay the axios response to check the initial state
    axios.get.mockImplementation(() => new Promise(() => {}));

    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <Routes>
          <Route path="/admin" element={<AdminRoute />}>
            <Route index element={<div data-testid="admin-content">Admin Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByTestId("spinner")).toBeInTheDocument();
    expect(screen.queryByTestId("admin-content")).not.toBeInTheDocument();
  });

  it("renders Outlet content when auth check is successful", async () => {
    useAuth.mockReturnValue([{ token: "valid-token" }, jest.fn()]);
    axios.get.mockResolvedValueOnce({ data: { ok: true } });

    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <Routes>
          <Route path="/admin" element={<AdminRoute />}>
            <Route index element={<div data-testid="admin-content">Admin Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId("admin-content")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("spinner")).not.toBeInTheDocument();
    expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/admin-auth");
  });

  it("renders Spinner when auth check fails", async () => {
    useAuth.mockReturnValue([{ token: "invalid-token" }, jest.fn()]);
    axios.get.mockResolvedValueOnce({ data: { ok: false } });

    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <Routes>
          <Route path="/admin" element={<AdminRoute />}>
            <Route index element={<div data-testid="admin-content">Admin Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId("spinner")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("admin-content")).not.toBeInTheDocument();
  });

  it("renders Spinner when there is no token", () => {
    useAuth.mockReturnValue([{ token: "" }, jest.fn()]);

    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <Routes>
          <Route path="/admin" element={<AdminRoute />}>
            <Route index element={<div data-testid="admin-content">Admin Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByTestId("spinner")).toBeInTheDocument();
    expect(screen.queryByTestId("admin-content")).not.toBeInTheDocument();
    expect(axios.get).not.toHaveBeenCalled();
  });
});
