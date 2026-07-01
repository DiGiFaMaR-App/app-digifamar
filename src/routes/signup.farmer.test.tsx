import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Review } from "./signup.farmer";

const step1 = {
  firstName: "John",
  lastName: "Smith",
  email: "john@example.com",
  phone: "(555) 123-4567",
  password: "secret-password",
};

const step2 = {
  farmName: "Green Acres",
  address: "1234 County Road",
  city: "Fresno",
  state: "CA",
  zip: "93721",
  farmType: "Organic Farm",
  acreage: "50",
  yearsActive: "12",
  usdaNumber: "",
};

describe("Farmer signup — Review step", () => {
  it("summarizes the entered personal and farm details", () => {
    render(
      <Review step1={step1} step2={step2} onEdit={() => {}} onBack={() => {}} onNext={() => {}} />,
    );

    expect(screen.getByText("John Smith")).toBeInTheDocument();
    expect(screen.getByText("john@example.com")).toBeInTheDocument();
    expect(screen.getByText("Green Acres")).toBeInTheDocument();
    // Resolves the state code to its full name in the location line
    expect(screen.getByText("1234 County Road, Fresno, California 93721")).toBeInTheDocument();
    expect(screen.getByText("Organic Farm")).toBeInTheDocument();
    expect(screen.getByText("50 acres")).toBeInTheDocument();
  });

  it("never exposes the password", () => {
    render(
      <Review step1={step1} step2={step2} onEdit={() => {}} onBack={() => {}} onNext={() => {}} />,
    );
    expect(screen.queryByText("secret-password")).not.toBeInTheDocument();
  });

  it("omits optional fields that were left blank", () => {
    render(
      <Review step1={step1} step2={step2} onEdit={() => {}} onBack={() => {}} onNext={() => {}} />,
    );
    expect(screen.queryByText("USDA number")).not.toBeInTheDocument();
  });

  it("edit buttons jump back to the matching step", () => {
    const onEdit = vi.fn();
    render(
      <Review step1={step1} step2={step2} onEdit={onEdit} onBack={() => {}} onNext={() => {}} />,
    );

    const editButtons = screen.getAllByRole("button", { name: /edit/i });
    fireEvent.click(editButtons[0]);
    expect(onEdit).toHaveBeenCalledWith(1);
    fireEvent.click(editButtons[1]);
    expect(onEdit).toHaveBeenCalledWith(2);
  });

  it("continue advances to verification", () => {
    const onNext = vi.fn();
    render(
      <Review step1={step1} step2={step2} onEdit={() => {}} onBack={() => {}} onNext={onNext} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /looks good/i }));
    expect(onNext).toHaveBeenCalledTimes(1);
  });
});
