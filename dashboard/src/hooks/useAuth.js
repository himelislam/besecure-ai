import { useCallback } from "react";
import { useAuthStore } from "../stores/authStore";
import * as authService from "../services/authService";
import { connectSocket, disconnectSocket } from "../lib/socketClient";
import { isPremiumAccess } from "../lib/subscriptionRules";

export function useAuth() {
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const isBootstrapping = useAuthStore((state) => state.isBootstrapping);
  const setAuth = useAuthStore((state) => state.setAuth);
  const setUser = useAuthStore((state) => state.setUser);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  const isAuthenticated = Boolean(accessToken);
  const isPremium = isPremiumAccess(user?.subscription);

  const login = useCallback(
    async (credentials) => {
      const { accessToken: token, user: loggedInUser } = await authService.login(credentials);
      setAuth({ accessToken: token, user: loggedInUser });
      connectSocket();
      return loggedInUser;
    },
    [setAuth]
  );

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      // Clear local state even if the network call fails — there's no
      // scenario where staying "logged in" client-side is the right call.
      clearAuth();
      disconnectSocket();
    }
  }, [clearAuth]);

  const refreshMe = useCallback(async () => {
    const { user: freshUser } = await authService.getMe();
    setUser(freshUser);
    return freshUser;
  }, [setUser]);

  const updateProfile = useCallback(
    async (patch) => {
      const { user: updatedUser } = await authService.updateMe(patch);
      setUser(updatedUser);
      return updatedUser;
    },
    [setUser]
  );

  // Merges a fresh GET /api/billing/subscription result into the cached
  // user — that endpoint is the authoritative read for the billing page,
  // but the rest of the app's tier-gated UI reads user.subscription off
  // this same store, so this keeps everyone looking at one source of truth
  // instead of the billing page holding its own separate copy.
  const updateSubscription = useCallback(
    (subscription) => {
      if (!user) return;
      setUser({ ...user, subscription });
    },
    [user, setUser]
  );

  return {
    user,
    accessToken,
    isAuthenticated,
    isPremium,
    isBootstrapping,
    login,
    logout,
    refreshMe,
    updateProfile,
    updateSubscription,
  };
}

// Not a hook — called once outside render (App.jsx's mount effect) to
// silently re-establish a session after a hard page reload, since the
// access token itself never survives one (in-memory only, by design).
export async function initializeAuth() {
  const { setAuth, clearAuth, finishBootstrapping } = useAuthStore.getState();

  try {
    const { accessToken } = await authService.refresh();
    const { user } = await authService.getMe();
    setAuth({ accessToken, user });
    connectSocket();
  } catch {
    // No valid refresh cookie (or it's expired/invalidated) — that's a
    // normal "not logged in" outcome, not an error to surface.
    clearAuth();
  } finally {
    finishBootstrapping();
  }
}
