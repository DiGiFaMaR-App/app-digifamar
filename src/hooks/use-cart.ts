/**
 * React binding for the localStorage cart store. Subscribed components
 * re-render whenever the cart changes — in this tab or another.
 */
import { useSyncExternalStore } from "react";
import { cartCount, cartStore, cartSubtotalCents, type CartItem } from "@/lib/cart/store";
import { computeFees, type FeeBreakdown } from "@/lib/cart/fees";

const EMPTY: CartItem[] = [];

export function useCart() {
  const items = useSyncExternalStore(
    cartStore.subscribe,
    cartStore.getItems,
    () => EMPTY, // server snapshot: cart is empty during SSR
  );

  const subtotalCents = cartSubtotalCents(items);
  const fees: FeeBreakdown = computeFees(subtotalCents);

  return {
    items,
    count: cartCount(items),
    subtotalCents,
    fees,
    isEmpty: items.length === 0,
    add: cartStore.add,
    setQuantity: cartStore.setQuantity,
    remove: cartStore.remove,
    clear: cartStore.clear,
  };
}
