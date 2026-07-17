import { create } from 'zustand';
import { api } from '../lib/api';

interface AuthUser {
  id: string;
  email: string;
  name?: string;
  role: string;
  status: string;
  companyId: string;
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  setAuth: (token: string, user: AuthUser | null) => Promise<void>;
  logout: () => void;
}

export const useAuth = create<AuthState>((set) => ({
  token: localStorage.getItem('accessToken'),
  user: null,
  setAuth: async (token, user) => {
    localStorage.setItem('accessToken', token);
    // Load the current user's profile so the UI can show role / enforce gating.
    if (!user) {
      try {
        const { data } = await api.get('/auth/me');
        user = data;
      } catch {
        user = null;
      }
    }
    set({ token, user });
  },
  logout: () => {
    localStorage.removeItem('accessToken');
    set({ token: null, user: null });
  },
}));
