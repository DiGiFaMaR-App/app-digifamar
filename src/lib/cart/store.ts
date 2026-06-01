/**
 * Cart state, persisted to localStorage.
 *
 * The cart is an external store (read/write + subscribe) so React components
 * can bind to it with useSyncExternalStore (see src/hooks/use-cart.ts) and any
 * number of mounted components — header badge, cart page, checkout — stay in
 * sync, including across browser tabs via the native `storage` event.
 *
 * Line items snapshot the product's name/price/image at add-time so the cart
 * renders without re-reading the catalog and the checkout total is stable.
 */
import { dollarsToCents } from "./fees";

export const CART_STORAGE_KEY = "digifamar.cart.v1";
const CART_EVENT = "digifamar:cart";
const MAX_QTY = 99;

export type CartItem = {
  productId: string;
  name: string;
  /** Unit price in whole dollars, as stored in the catalog. */
  unitPrice: number;
  unit: string;
  image: string;
  farmId: string;
  quantity: number;
};

const isBrowser = typeof window !== "undefined";
let memory: CartItem[] = [];

// Snapshot cache: useSyncExternalStore requires getSnapshot to return a stable
// reference when nothing changed, or it loops forever. We key the parsed array
// on the raw localStorage string and only re-parse when that string changes.
let cachedRaw: string | null | undefined;
let cachedItems: CartItem[] = [];

function isValid(item: unknown): item is CartItem {
  if (!item || typeof item !== "object") return false;
  const i = item as Record<string, unknown>;
  return (
    typeof i.productId === "string" &&
    typeof i.name === "string" &&
    typeof i.unitPrice === "number" &&
    typeof i.quantity === "number" &&
    i.quantity > 0
  );
}

function clampQty(qty: number): number {
  if (!Number.isFinite(qty)) return 1;
  return Math.min(MAX_QTY, Math.max(1, Math.floor(qty)));
}

function read(): CartItem[] {
  if (!isBrowser) return memory;
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(CART_STORAGE_KEY);
  } catch {
    return cachedItems;
  }
  if (raw === cachedRaw) return cachedItems; // unchanged → same reference
  cachedRaw = raw;
  try {
    const parsed = raw ? JSON.parse(raw) : [];
    cachedItems = Array.isArray(parsed) ? parsed.filter(isValid) : [];
  } catch {
    cachedItems = [];
  }
  return cachedItems;
}

function write(items: CartItem[]) {
  memory = items;
  if (!isBrowser) return;
  try {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore quota / private-mode failures — in-memory copy still works
  }
  // Notify same-tab subscribers (the native `storage` event only fires
  // in *other* tabs, so we emit our own event for the current one).
  window.dispatchEvent(new Event(CART_EVENT));
}

export const cartStore = {
  getItems(): CartItem[] {
    return read();
  },

  subscribe(listener: () => void): () => void {
    if (!isBrowser) return () => {};
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === CART_STORAGE_KEY) listener();
    };
    window.addEventListener(CART_EVENT, listener);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(CART_EVENT, listener);
      window.removeEventListener("storage", onStorage);
    };
  },

  /** Add a product (or increment its quantity if already in the cart). */
  add(item: Omit<CartItem, "quantity">, quantity = 1): void {
    const items = read();
    const existing = items.find((i) => i.productId === item.productId);
    if (existing) {
      const next = items.map((i) =>
        i.productId === item.productId
          ? { ...i, quantity: clampQty(i.quantity + quantity) }
          : i,
      );
      write(next);
    } else {
      write([...items, { ...item, quantity: clampQty(quantity) }]);
    }
  },

  setQuantity(productId: string, quantity: number): void {
    const qty = clampQty(quantity);
    write(read().map((i) => (i.productId === productId ? { ...i, quantity: qty } : i)));
  },

  remove(productId: string): void {
    write(read().filter((i) => i.productId !== productId));
  },

  clear(): void {
    write([]);
  },
};

/** Total item count (sum of quantities). */
export function cartCount(items: CartItem[]): number {
  return items.reduce((n, i) => n + i.quantity, 0);
}

/** Item subtotal in integer cents (before fees). */
export function cartSubtotalCents(items: CartItem[]): number {
  return items.reduce((c, i) => c + dollarsToCents(i.unitPrice) * i.quantity, 0);
}
