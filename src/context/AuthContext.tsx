"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";

export interface SavedAddress {
  id: string;
  label: string;
  line1: string;
  city: string;
  postal: string;
  isDefault?: boolean;
}

export interface OrderItem {
  productId?: string;
  name: string;
  size: string;
  unitKey?: string | null;
  qty: number;
  price: number;
}

export interface OrderMessage {
  id: string;
  author: "customer" | "staff";
  body: string;
  date: string;
}

export interface Order {
  id: string;
  date: string;
  total: number;
  status: "processing" | "delivered" | "ready" | "cancelled";
  statusDetail?: string;
  method: "delivery" | "pickup";
  discountAmount?: number;
  couponCode?: string | null;
  items: OrderItem[];
  messages?: OrderMessage[];
}

export interface CustomerPreferences {
  prefMethod: string | null;
  prefPickupId: string | null;
  prefPickupSubtype: string | null;
  prefMetroStationId: string | null;
  prefMetroLine: string | null;
  prefMeetupZoneId: string | null;
  prefMeetupAvailability: string | null;
  prefCustomMeetup: string | null;
  prefOrderNotes: string;
  notifyStock: boolean;
  notifyPromos: boolean;
  notifyCare: boolean;
}

export interface UserCoupon {
  code: string;
  type: "percent" | "fixed";
  value: number;
  expiresAt: string | null;
}

export interface User {
  id: string;
  email: string;
  name: string;
  phone: string;
  experience?: string | null;
  referralCode?: string;
  referralCount?: number;
  preferences?: CustomerPreferences;
  counts?: { wishlist: number; alerts: number; guides: number };
  coupons?: UserCoupon[];
  addresses: SavedAddress[];
  orders: Order[];
}

interface AuthCtx {
  user: User | null;
  ready: boolean;
  refresh: () => Promise<void>;
  login: (email: string, password: string) => Promise<string | null>;
  register: (input: {
    email: string;
    password: string;
    name: string;
    phone?: string;
    referralCode?: string;
  }) => Promise<string | null>;
  signOut: () => Promise<void>;
  updateProfile: (patch: Partial<Pick<User, "name" | "phone" | "experience">> & {
    preferences?: Partial<CustomerPreferences>;
  }) => Promise<void>;
  addAddress: (addr: Omit<SavedAddress, "id">) => Promise<void>;
  removeAddress: (id: string) => Promise<void>;
}

const AuthContext = createContext<AuthCtx | null>(null);

async function readJson<T>(res: Response): Promise<T> {
  return res.json() as Promise<T>;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/session", { cache: "no-store" });
      if (res.ok) {
        const data = await readJson<{ user: User | null }>(res);
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await readJson<{ user?: User; error?: string }>(res);
    if (!res.ok) return data.error ?? "Login failed.";
    setUser(data.user ?? null);
    return null;
  }, []);

  const register = useCallback(
    async (input: {
      email: string;
      password: string;
      name: string;
      phone?: string;
      referralCode?: string;
    }) => {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = await readJson<{ user?: User; error?: string }>(res);
      if (!res.ok) return data.error ?? "Registration failed.";
      setUser(data.user ?? null);
      return null;
    },
    [],
  );

  const signOut = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
  }, []);

  const updateProfile = useCallback(
    async (patch: Partial<Pick<User, "name" | "phone" | "experience">> & {
      preferences?: Partial<CustomerPreferences>;
    }) => {
      const { preferences, ...profile } = patch;
      if (Object.keys(profile).length > 0) {
        await fetch("/api/account/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(profile),
        });
      }
      if (preferences) {
        await fetch("/api/account/preferences", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(preferences),
        });
      }
      setUser((u) => {
        if (!u) return u;
        return {
          ...u,
          ...profile,
          preferences: preferences ? { ...u.preferences!, ...preferences } : u.preferences,
        };
      });
      await refresh();
    },
    [refresh],
  );

  const addAddress = useCallback(async (addr: Omit<SavedAddress, "id">) => {
    const res = await fetch("/api/account/addresses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(addr),
    });
    if (!res.ok) return;
    const data = await readJson<{ address: SavedAddress }>(res);
    setUser((u) => (u ? { ...u, addresses: [...u.addresses, data.address] } : u));
  }, []);

  const removeAddress = useCallback(async (id: string) => {
    const res = await fetch(`/api/account/addresses/${id}`, { method: "DELETE" });
    if (!res.ok) return;
    setUser((u) => (u ? { ...u, addresses: u.addresses.filter((a) => a.id !== id) } : u));
  }, []);

  const value: AuthCtx = {
    user,
    ready,
    refresh,
    login,
    register,
    signOut,
    updateProfile,
    addAddress,
    removeAddress,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthCtx {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
