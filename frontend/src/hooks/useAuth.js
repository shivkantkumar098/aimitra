import { useState, useCallback } from "react";

const AUTH_KEY = "qa_auth_v1";
const API_BASE =
  process.env.REACT_APP_API_URL ||
  (process.env.NODE_ENV === "development" ? "http://localhost:8000" : "");

function loadAuth() {
  try {
    return JSON.parse(localStorage.getItem(AUTH_KEY)) || null;
  } catch {
    return null;
  }
}

function saveAuth(data) {
  localStorage.setItem(AUTH_KEY, JSON.stringify(data));
}

async function callAuth(path, body, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}/api/auth${path}`, {
    method: body !== undefined ? "POST" : "GET",
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Request failed");
  return data;
}

export function useAuth() {
  const [authState, setAuthState] = useState(loadAuth);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const signup = useCallback(async (email, password) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await callAuth("/signup", { email, password });
      if (data.email_confirmation_required) {
        return { confirmationRequired: true };
      }
      const auth = { access_token: data.access_token, refresh_token: data.refresh_token, user: data.user };
      saveAuth(auth);
      setAuthState(auth);
      return { ok: true };
    } catch (err) {
      setError(err.message);
      return { error: err.message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (email, password) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await callAuth("/login", { email, password });
      const auth = { access_token: data.access_token, refresh_token: data.refresh_token, user: data.user };
      saveAuth(auth);
      setAuthState(auth);
      return { ok: true };
    } catch (err) {
      setError(err.message);
      return { error: err.message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      if (authState?.access_token) {
        await callAuth("/logout", {}, authState.access_token);
      }
    } catch { /* ignore */ } finally {
      localStorage.removeItem(AUTH_KEY);
      setAuthState(null);
      setError(null);
    }
  }, [authState]);

  const clearError = useCallback(() => setError(null), []);

  return {
    isLoggedIn: !!authState?.access_token,
    user: authState?.user || null,
    accessToken: authState?.access_token || null,
    isLoading,
    error,
    login,
    signup,
    logout,
    clearError,
  };
}
