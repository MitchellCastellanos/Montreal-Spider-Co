"use client";

/* One-time hydration from localStorage must happen in an effect (localStorage
   is unavailable during SSR), so the set-state-in-effect rule is expected here. */
/* eslint-disable react-hooks/set-state-in-effect */

import { createContext, useContext, useEffect, useState, useCallback } from "react";

export interface SavedCard {
  id: string;
  brand: string;
  last4: string;
  exp: string;
  name: string;
  isDefault?: boolean;
}

export interface SavedAddress {
  id: string;
  label: string;
  line1: string;
  city: string;
  postal: string;
  isDefault?: boolean;
}

export interface OrderItem {
  name: string;
  size: string;
  qty: number;
  price: number;
}

export interface Order {
  id: string;
  date: string;
  total: number;
  status: "processing" | "delivered" | "ready";
  method: "delivery" | "pickup";
  items: OrderItem[];
}

export interface User {
  email: string;
  name: string;
  phone: string;
  cards: SavedCard[];
  addresses: SavedAddress[];
  orders: Order[];
}

interface AuthCtx {
  user: User | null;
  ready: boolean;
  accountExists: (email: string) => boolean;
  signIn: (email: string, name?: string, phone?: string) => void;
  trySignIn: (email: string) => boolean;
  signOut: () => void;
  updateProfile: (patch: Partial<Pick<User, "name" | "phone">>) => void;
  addCard: (card: Omit<SavedCard, "id">) => void;
  removeCard: (id: string) => void;
  addAddress: (addr: Omit<SavedAddress, "id">) => void;
  removeAddress: (id: string) => void;
  addOrder: (order: Order) => void;
}

const KEY_PREFIX = "msc.user.";
const SESSION_KEY = "msc.session";
const AuthContext = createContext<AuthCtx | null>(null);

function loadUser(email: string): User | null {
  try {
    const raw = localStorage.getItem(KEY_PREFIX + email.toLowerCase());
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

function persist(user: User) {
  try {
    localStorage.setItem(KEY_PREFIX + user.email.toLowerCase(), JSON.stringify(user));
  } catch {
    /* ignore */
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const email = localStorage.getItem(SESSION_KEY);
      if (email) {
        const u = loadUser(email);
        if (u) setUser(u);
      }
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  const signIn = useCallback((email: string, name?: string, phone?: string) => {
    const normalized = email.trim().toLowerCase();
    const existing = loadUser(normalized);
    const u: User =
      existing ??
      {
        email: normalized,
        name: name?.trim() || normalized.split("@")[0],
        phone: phone?.trim() || "",
        cards: [],
        addresses: [],
        orders: [],
      };
    if (name?.trim()) u.name = name.trim();
    if (phone?.trim()) u.phone = phone.trim();
    persist(u);
    try {
      localStorage.setItem(SESSION_KEY, normalized);
    } catch {
      /* ignore */
    }
    setUser(u);
  }, []);

  const accountExists = useCallback((email: string) => loadUser(email.trim().toLowerCase()) !== null, []);

  const trySignIn = useCallback((email: string) => {
    const normalized = email.trim().toLowerCase();
    const existing = loadUser(normalized);
    if (!existing) return false;
    try {
      localStorage.setItem(SESSION_KEY, normalized);
    } catch {
      /* ignore */
    }
    setUser(existing);
    return true;
  }, []);

  const signOut = useCallback(() => {
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch {
      /* ignore */
    }
    setUser(null);
  }, []);

  const updateProfile = useCallback(
    (patch: Partial<Pick<User, "name" | "phone">>) => {
      setUser((u) => {
        if (!u) return u;
        const next = { ...u, ...patch };
        persist(next);
        return next;
      });
    },
    []
  );

  const addCard = useCallback((card: Omit<SavedCard, "id">) => {
    setUser((u) => {
      if (!u) return u;
      const newCard: SavedCard = { ...card, id: `card_${Date.now()}` };
      const cards = u.cards.length === 0 ? [{ ...newCard, isDefault: true }] : [...u.cards, newCard];
      const next = { ...u, cards };
      persist(next);
      return next;
    });
  }, []);

  const removeCard = useCallback((id: string) => {
    setUser((u) => {
      if (!u) return u;
      const next = { ...u, cards: u.cards.filter((c) => c.id !== id) };
      persist(next);
      return next;
    });
  }, []);

  const addAddress = useCallback((addr: Omit<SavedAddress, "id">) => {
    setUser((u) => {
      if (!u) return u;
      const newAddr: SavedAddress = { ...addr, id: `addr_${Date.now()}` };
      const addresses =
        u.addresses.length === 0 ? [{ ...newAddr, isDefault: true }] : [...u.addresses, newAddr];
      const next = { ...u, addresses };
      persist(next);
      return next;
    });
  }, []);

  const removeAddress = useCallback((id: string) => {
    setUser((u) => {
      if (!u) return u;
      const next = { ...u, addresses: u.addresses.filter((a) => a.id !== id) };
      persist(next);
      return next;
    });
  }, []);

  const addOrder = useCallback((order: Order) => {
    setUser((u) => {
      if (!u) return u;
      const next = { ...u, orders: [order, ...u.orders] };
      persist(next);
      return next;
    });
  }, []);

  const value: AuthCtx = {
    user,
    ready,
    accountExists,
    signIn,
    trySignIn,
    signOut,
    updateProfile,
    addCard,
    removeCard,
    addAddress,
    removeAddress,
    addOrder,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthCtx {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
