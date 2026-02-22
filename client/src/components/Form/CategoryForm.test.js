import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/extend-expect";
import CategoryForm from "./CategoryForm";

describe("CategoryForm Component", () => {
  it("renders the form with input and submit button", () => {
    render(<CategoryForm handleSubmit={jest.fn()} value="" setValue={jest.fn()} />);
    
    expect(screen.getByPlaceholderText("Enter new category")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /submit/i })).toBeInTheDocument();
  });

  it("calls setValue on input change", () => {
    const setValueMock = jest.fn();
    render(<CategoryForm handleSubmit={jest.fn()} value="" setValue={setValueMock} />);
    
    const input = screen.getByPlaceholderText("Enter new category");
    fireEvent.change(input, { target: { value: "Electronics" } });
    
    expect(setValueMock).toHaveBeenCalledWith("Electronics");
  });

  it("calls handleSubmit on form submission", () => {
    const handleSubmitMock = jest.fn((e) => e.preventDefault());
    render(<CategoryForm handleSubmit={handleSubmitMock} value="Books" setValue={jest.fn()} />);
    
    const button = screen.getByRole("button", { name: /submit/i });
    fireEvent.click(button);
    
    expect(handleSubmitMock).toHaveBeenCalled();
  });

  it("displays the correct value in the input field", () => {
    render(<CategoryForm handleSubmit={jest.fn()} value="Clothing" setValue={jest.fn()} />);
    
    const input = screen.getByPlaceholderText("Enter new category");
    expect(input).toHaveValue("Clothing");
  });
});
