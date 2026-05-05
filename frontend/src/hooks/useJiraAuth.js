/**
 * useJiraAuth — manages JIRA authentication state.
 *
 * Stores credentials (domain, email, token) in localStorage.
 * Exposes connect() which calls the backend /api/jira/connect endpoint
 * to verify credentials before saving.
 *
 * Note: API tokens are stored in localStorage — acceptable for internal
 * tools but remind users not to use personal tokens on shared machines.
 *
 * Exposed API:
 *   jiraAuth        — { domain, email, token, user, connected }
 *   connect(creds)  — verifies + saves credentials
 *   disconnect()    — clears all stored credentials
 *   isConnecting    — true while verifying
 *   authError       — error string or null
 */

import { useState, useCallback } from "react";
import axios from "axios";

const STORAGE_KEY = "qa_jira_auth";
const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:8000";

const defaultAuth = { domain: "", email: "", token: "", user: null, connected: false };

export function useJiraAuth() {
  const [jiraAuth, setJiraAuth] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? { ...defaultAuth, ...JSON.parse(saved) } : defaultAuth;
    } catch { return defaultAuth; }
  });

  const [isConnecting, setIsConnecting] = useState(false);
  const [authError, setAuthError] = useState(null);

  /** Builds headers used by all JIRA API calls. */
  const getHeaders = useCallback(() => ({
    "x-jira-domain": jiraAuth.domain,
    "x-jira-email": jiraAuth.email,
    "x-jira-token": jiraAuth.token,
  }), [jiraAuth]);

  /** Verifies credentials against JIRA /myself, then saves on success. */
  const connect = useCallback(async ({ domain, email, token }) => {
    setIsConnecting(true);
    setAuthError(null);
    try {
      const res = await axios.post(
        `${API_BASE}/api/jira/connect`,
        {},
        { headers: { "x-jira-domain": domain, "x-jira-email": email, "x-jira-token": token } }
      );
      const next = { domain, email, token, user: res.data.user, connected: true };
      setJiraAuth(next);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      return true;
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || "Connection failed";
      setAuthError(msg);
      return false;
    } finally {
      setIsConnecting(false);
    }
  }, []);

  /** Clears all JIRA credentials from state and localStorage. */
  const disconnect = useCallback(() => {
    setJiraAuth(defaultAuth);
    setAuthError(null);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  }, []);

  return { jiraAuth, connect, disconnect, isConnecting, authError, getHeaders };
}
