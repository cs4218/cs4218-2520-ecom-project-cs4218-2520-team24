import React from "react";
import { render, screen, act } from "@testing-library/react";
import { MemoryRouter, useNavigate, useLocation } from "react-router-dom";
import Spinner from "./Spinner";

// Mock react-router-dom hooks
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: jest.fn(),
  useLocation: jest.fn(),
}));

describe("Spinner Component", () => {
  let mockNavigate;
  let mockLocation;

  beforeEach(() => {
    jest.useFakeTimers();
    mockNavigate = jest.fn();
    mockLocation = { pathname: "/current-path" };
    
    useNavigate.mockReturnValue(mockNavigate);
    useLocation.mockReturnValue(mockLocation);
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it("renders the spinner and initial countdown text", () => {
    render(
      <MemoryRouter>
        <Spinner />
      </MemoryRouter>
    );

    expect(screen.getByText(/redirecting to you in 3 second/i)).toBeInTheDocument();
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("decrements the countdown every second", () => {
    render(
      <MemoryRouter>
        <Spinner />
      </MemoryRouter>
    );

    expect(screen.getByText(/redirecting to you in 3 second/i)).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(screen.getByText(/redirecting to you in 2 second/i)).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(screen.getByText(/redirecting to you in 1 second/i)).toBeInTheDocument();
  });

  it("navigates to the default path ('login') when countdown reaches 0", () => {
    render(
      <MemoryRouter>
        <Spinner />
      </MemoryRouter>
    );

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(mockNavigate).toHaveBeenCalledWith("/login", {
      state: "/current-path",
    });
  });

  it("navigates to a custom path when provided", () => {
    render(
      <MemoryRouter>
        <Spinner path="custom-path" />
      </MemoryRouter>
    );

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(mockNavigate).toHaveBeenCalledWith("/custom-path", {
      state: "/current-path",
    });
  });

  it("clears the interval on unmount", () => {
    const clearIntervalSpy = jest.spyOn(global, "clearInterval");
    
    const { unmount } = render(
      <MemoryRouter>
        <Spinner />
      </MemoryRouter>
    );

    unmount();
    
    expect(clearIntervalSpy).toHaveBeenCalled();
    clearIntervalSpy.mockRestore();
  });
});
