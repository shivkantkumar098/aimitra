/**
 * useModels — fetches the live model list for the selected provider.
 *
 * On mount (and when provider or apiKey changes):
 *   1. Immediately sets the static fallback list so the dropdown is never empty.
 *   2. Checks a 1-hour localStorage cache keyed by (provider, last-8-chars-of-apiKey).
 *   3. If the cache is stale or missing, fetches /api/models from the backend.
 *   4. On success, updates state and refreshes the cache.
 *
 * Exposed API:
 *   models   — array of { id, name, provider, logoProvider } model objects
 *   loading  — true while fetching from backend
 *   isAuto   — true when the list comes from the live API (not the static fallback)
 *   error    — error string or null
 *   refresh  — force-bypasses cache and re-fetches immediately
 */
import { useState, useEffect, useCallback } from "react";
import { MODELS } from "../utils/capabilities";

const CACHE_TTL = 60 * 60 * 1000; // 1 hour

/**
 * Builds a localStorage cache key from provider and the last 8 chars of the API key.
 * Using only the key suffix avoids storing credentials in localStorage keys.
 */
function cacheKey(provider, apiKey) {
  return `aimitra_models_${provider}_${(apiKey || "").slice(-8)}`;
}

/**
 * Returns the statically-defined models for a provider from capabilities.js.
 * Used as an immediate fallback so the dropdown is never empty while fetching.
 */
function staticFallback(provider) {
  return MODELS.filter((m) => m.provider === provider);
}

export function useModels(provider, apiKey) {
  const [models, setModels]   = useState(() => staticFallback(provider));
  const [loading, setLoading] = useState(false);
  const [isAuto, setIsAuto]   = useState(false);
  const [error, setError]     = useState(null);

  const fetchModels = useCallback(
    /**
     * Loads the model list for the current provider + apiKey.
     *
     * @param {boolean} [force=false] - when true, skips the localStorage cache
     *   and always calls the backend (used by the refresh button).
     */
    async (force = false) => {
      // Always update static fallback immediately so dropdown is never empty
      setModels(staticFallback(provider));
      setIsAuto(false);
      setError(null);

      if (!apiKey || !provider) return;

      // Try localStorage cache first
      if (!force) {
        try {
          const raw = localStorage.getItem(cacheKey(provider, apiKey));
          if (raw) {
            const { models: cached, ts } = JSON.parse(raw);
            if (Date.now() - ts < CACHE_TTL && cached.length > 0) {
              setModels(cached);
              setIsAuto(true);
              return;
            }
          }
        } catch { /* ignore */ }
      }

      setLoading(true);
      try {
        const res = await fetch(
          `/api/models?provider=${encodeURIComponent(provider)}&api_key=${encodeURIComponent(apiKey)}`
        );
        const data = await res.json();
        if (data.source === "live" && data.models.length > 0) {
          localStorage.setItem(
            cacheKey(provider, apiKey),
            JSON.stringify({ models: data.models, ts: Date.now() })
          );
          setModels(data.models);
          setIsAuto(true);
        } else {
          setError(data.detail || "Could not load live models — using built-in list.");
        }
      } catch {
        setError("Network error — using built-in model list.");
      } finally {
        setLoading(false);
      }
    },
    [provider, apiKey]
  );

  // Re-fetch whenever provider or API key changes
  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  const refresh = useCallback(() => fetchModels(true), [fetchModels]);

  return { models, loading, isAuto, error, refresh };
}
