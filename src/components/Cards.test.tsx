import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProductCard, FarmCard } from "./Cards";
import { products, farms, getFarm } from "@/lib/mock-data";

describe("ProductCard", () => {
  const product = products[0]; // heirloom tomatoes — organic, 24h
  const farm = getFarm(product.farmId)!;

  it("renders name, price, unit, and farm name", () => {
    render(<ProductCard product={product} />);
    expect(screen.getByText(product.name)).toBeInTheDocument();
    expect(screen.getByText(`$${product.price.toFixed(2)}`, { exact: false })).toBeInTheDocument();
    expect(screen.getByText(`/${product.unit}`, { exact: false })).toBeInTheDocument();
    expect(screen.getByText(farm.name)).toBeInTheDocument();
  });

  it("shows an Organic badge for organic products", () => {
    render(<ProductCard product={product} />);
    expect(screen.getByText(/organic/i)).toBeInTheDocument();
  });

  it("links the image and title to the product detail page", () => {
    render(<ProductCard product={product} />);
    const links = screen
      .getAllByRole("link")
      .filter((a) => a.getAttribute("href") === "/product/$id");
    expect(links.length).toBeGreaterThanOrEqual(2);
  });

  it("displays the freshness grade and delivery window", () => {
    render(<ProductCard product={product} />);
    expect(screen.getByText(/grade a/i)).toBeInTheDocument();
    expect(screen.getByText(product.delivery)).toBeInTheDocument();
  });

  it("hides the Organic badge for non-organic products", () => {
    const nonOrganic = products.find((p) => !p.organic)!;
    render(<ProductCard product={nonOrganic} />);
    expect(screen.queryByText(/^organic$/i)).not.toBeInTheDocument();
  });
});

describe("FarmCard", () => {
  const farm = farms[0];

  it("renders farm name, location, and rating", () => {
    render(<FarmCard farm={farm} />);
    expect(screen.getByRole("heading", { name: farm.name })).toBeInTheDocument();
    expect(screen.getByText(farm.location, { exact: false })).toBeInTheDocument();
    expect(screen.getByText(String(farm.rating))).toBeInTheDocument();
  });

  it("shows Top Seller and Verified badges when applicable", () => {
    render(<FarmCard farm={farm} />);
    expect(screen.getByText(/top seller/i)).toBeInTheDocument();
    expect(screen.getByText(/verified/i)).toBeInTheDocument();
  });

  it("renders up to 2 certifications", () => {
    render(<FarmCard farm={farm} />);
    farm.certifications.slice(0, 2).forEach((c) => {
      expect(screen.getByText(c)).toBeInTheDocument();
    });
  });

  it("links to the farm detail page", () => {
    render(<FarmCard farm={farm} />);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/farm/$id");
  });
});
