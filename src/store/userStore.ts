"use client";

import { create } from "zustand";
import { User } from "@/types";

interface UserState {
  user: User | null;
  isLoggedIn: boolean;
  setUser: (user: User) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  isLoggedIn: false,

  setUser: (user: User) => {
    set({ user, isLoggedIn: true });
  },

  logout: () => {
    set({ user: null, isLoggedIn: false });
  },

  updateUser: (updatedUser: Partial<User>) => {
    set((state) => ({
      user: state.user ? { ...state.user, ...updatedUser } : null,
    }));
  },
}));
