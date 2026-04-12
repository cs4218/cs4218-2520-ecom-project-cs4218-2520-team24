// Leong Yu Jun Nicholas A0257284W
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/extend-expect";
import CategoryForm from "./CategoryForm";

describe("CategoryForm Component", () => {
  let handleSubmitMock;
  let setValueMock;

  beforeEach(() => {
    handleSubmitMock = jest.fn((e) => e?.preventDefault());
    setValueMock = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("renders the form with input and submit button", () => {
    render(<CategoryForm handleSubmit={handleSubmitMock} value="" setValue={setValueMock} />);
    
    expect(screen.getByPlaceholderText("Enter new category")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /submit/i })).toBeInTheDocument();
  });

  it("calls setValue on input change", () => {
    render(<CategoryForm handleSubmit={handleSubmitMock} value="" setValue={setValueMock} />);
    const input = screen.getByPlaceholderText("Enter new category");
    
    fireEvent.change(input, { target: { value: "Electronics" } });
    
    expect(setValueMock).toHaveBeenCalledWith("Electronics");
  });

  it("calls handleSubmit on form submission", () => {
    render(<CategoryForm handleSubmit={handleSubmitMock} value="Books" setValue={setValueMock} />);
    const button = screen.getByRole("button", { name: /submit/i });
    
    fireEvent.click(button);
    
    expect(handleSubmitMock).toHaveBeenCalled();
  });

  it("displays the correct value in the input field", () => {
    render(<CategoryForm handleSubmit={handleSubmitMock} value="Clothing" setValue={setValueMock} />);
    
    const input = screen.getByPlaceholderText("Enter new category");
    
    expect(input).toHaveValue("Clothing");
  });

  it("renders with empty initial value if not provided", () => {
    render(<CategoryForm handleSubmit={handleSubmitMock} value="" setValue={setValueMock} />);
    const input = screen.getByPlaceholderText("Enter new category");
    expect(input).toHaveValue("");
  });

  it("has correct placeholder text", () => {
    render(<CategoryForm handleSubmit={handleSubmitMock} value="" setValue={setValueMock} />);
    expect(screen.getByPlaceholderText("Enter new category")).toBeInTheDocument();
  });

  it("button has correct Submit text", () => {
    render(<CategoryForm handleSubmit={handleSubmitMock} value="" setValue={setValueMock} />);
    expect(screen.getByRole("button")).toHaveTextContent("Submit");
  });

  it("does not call handleSubmit if button is not clicked", () => {
    render(<CategoryForm handleSubmit={handleSubmitMock} value="Books" setValue={setValueMock} />);
    expect(handleSubmitMock).not.toHaveBeenCalled();
  });
});
