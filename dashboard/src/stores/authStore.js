import { create } from "zustand";

// Access token (and the user object that came with it) live here, in memory,
// ONLY — never localStorage/sessionStorage. Per docs/09_SECURITY_RULES.md:
// the refresh token is the only thing allowed to persist across page loads,
// and it lives in an httpOnly cookie the JS layer never touches directly.
// A hard refresh resets this store; useAuth's bootstrap effect re-derives it
// by calling POST /api/auth/refresh (cookie-based) then GET /api/auth/me.
export const useAuthStore = create((set) => ({
  accessToken: null,
  user: null,
  // True until the initial silent-refresh-on-load attempt has resolved one
  // way or the other. Lets the app avoid flashing a "signed out" state for
  // a user who actually still has a valid refresh cookie.
  isBootstrapping: true,

  setAccessToken: (accessToken) => set({ accessToken }),

  setUser: (user) => set({ user }),

  setAuth: ({ accessToken, user }) => set({ accessToken, user }),

  clearAuth: () => set({ accessToken: null, user: null }),

  finishBootstrapping: () => set({ isBootstrapping: false }),
}));

export const getAccessToken = () => useAuthStore.getState().accessToken;
