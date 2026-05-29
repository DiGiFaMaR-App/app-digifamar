import { useEffect, useState } from "react";

export interface CartItem {
  productId: string;
  name: string;
  farmName: string;
  price: number;
  unit: string;
  quantity: number;
  imageUrl: string;
}

const STORAGE_KEY = "dfm_cart";
const CART_EVENT = "dfm_cart_updated";

function readCart(): CartItem[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function writeCart(items: CartItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent(CART_EVENT));
}

export function useCart() {
  const [cartItems, setCartItems] = useState<CartItem[]>(() => readCart());

  useEffect(() => {
    const sync = () => setCartItems(readCart());
    window.addEventListener(CART_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CART_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const addToCart = (item: Omit<CartItem, "quantity">) => {
    const current = readCart();
    const idx = current.findIndex((i) => i.productId === item.productId);
    if (idx >= 0) {
      current[idx].quantity += 1;
    } else {
      current.push({ ...item, quantity: 1 });
    }
    writeCart(current);
  };

  const removeFromCart = (productId: string) => {
    writeCart(readCart().filter((i) => i.productId !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    const current = readCart();
    const idx = current.findIndex((i) => i.productId === productId);
    if (idx >= 0) {
      current[idx].quantity = quantity;
      writeCart(current);
    }
  };

  const clearCart = () => writeCart([]);

  const cartTotal = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return {
    cartItems,
    cartTotal,
    cartCount,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
  };
}
