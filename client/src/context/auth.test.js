import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import axios from "axios";
import { AuthProvider, useAuth } from "./auth";

jest.mock("axios", () => ({
  defaults: {
    headers: {
      common: {},
    },
  },
}));

const AuthConsumer = () => {
  const [auth, setAuth] = useAuth();

  return (
    <>
      <span data-testid="token">{auth.token || "empty"}</span>
      <span data-testid="user">{auth.user?.name || "none"}</span>
      <button onClick={() => setAuth({ user: { name: "Updated" }, token: "updated-token" })}>
        update
      </button>
    </>
  );
};

describe("Auth context", () => {
  beforeEach(() => {
    localStorage.clear();
    axios.defaults.headers.common = {};
    jest.clearAllMocks();
  });

  it("uses default auth state when localStorage is empty", async () => {
    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    );

    expect(screen.getByTestId("token")).toHaveTextContent("empty");
    expect(screen.getByTestId("user")).toHaveTextContent("none");

    await waitFor(() => {
      expect(axios.defaults.headers.common.Authorization).toBe("");
    });
  });

  it("hydrates auth state from localStorage", async () => {
    localStorage.setItem(
      "auth",
      JSON.stringify({ user: { name: "Jane" }, token: "stored-token" })
    );

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("token")).toHaveTextContent("stored-token");
      expect(screen.getByTestId("user")).toHaveTextContent("Jane");
      expect(axios.defaults.headers.common.Authorization).toBe("stored-token");
    });
  });

  it("updates auth state via setAuth", async () => {
    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    );

    fireEvent.click(screen.getByText("update"));

    await waitFor(() => {
      expect(screen.getByTestId("token")).toHaveTextContent("updated-token");
      expect(screen.getByTestId("user")).toHaveTextContent("Updated");
      expect(axios.defaults.headers.common.Authorization).toBe("updated-token");
    });
  });
});