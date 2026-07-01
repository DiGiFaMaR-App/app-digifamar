import { beforeEach, describe, expect, it } from "vitest";
import { CART_STORAGE_KEY, cartCount, cartStore, cartSubtotalCents, type CartItem } from "./store";

const tomato: Omit<CartItem, "quantity"> = {
  productId: "heirloom-tomatoes",
  name: "Heirloom Tomato Mix",
  unitPrice: 5.5,
  unit: "lb",
  image: "tomato.jpg",
  farmId: "river-bend",
};

describe("cart localStorage store", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("starts empty", () => {
    expect(cartStore.getItems()).toEqual([]);
  });

  it("adds an item and persists it to localStorage", () => {
    cartStore.add(tomato);
    expect(cartStore.getItems()).toHaveLength(1);
    expect(window.localStorage.getItem(CART_STORAGE_KEY)).toContain("heirloom-tomatoes");
  });

  it("increments quantity when the same product is added again", () => {
    cartStore.add(tomato);
    cartStore.add(tomato, 2);
    const [item] = cartStore.getItems();
    expect(item.quantity).toBe(3);
  });

  it("clamps quantity between 1 and 99", () => {
    cartStore.add(tomato);
    cartStore.setQuantity("heirloom-tomatoes", 0);
    expect(cartStore.getItems()[0].quantity).toBe(1);
    cartStore.setQuantity("heirloom-tomatoes", 9999);
    expect(cartStore.getItems()[0].quantity).toBe(99);
  });

  it("removes and clears items", () => {
    cartStore.add(tomato);
    cartStore.remove("heirloom-tomatoes");
    expect(cartStore.getItems()).toEqual([]);
    cartStore.add(tomato);
    cartStore.clear();
    expect(cartStore.getItems()).toEqual([]);
  });

  it("notifies subscribers on change", () => {
    let calls = 0;
    const unsub = cartStore.subscribe(() => {
      calls += 1;
    });
    cartStore.add(tomato);
    expect(calls).toBeGreaterThan(0);
    unsub();
  });

  it("computes count and subtotal in cents", () => {
    cartStore.add(tomato, 2); // 2 × $5.50 = $11.00
    const items = cartStore.getItems();
    expect(cartCount(items)).toBe(2);
    expect(cartSubtotalCents(items)).toBe(1100);
  });

  it("ignores malformed persisted data", () => {
    window.localStorage.setItem(CART_STORAGE_KEY, "not json");
    expect(cartStore.getItems()).toEqual([]);
  });
});
