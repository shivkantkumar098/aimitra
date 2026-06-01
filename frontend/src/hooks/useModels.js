import { useState, useEffect, useCallback } from "react";
import { MODELS } from "../utils/capabilities";

const CACHE_TTL = 60 * 60 * 1000; // 1 hour

function cacheKey(provider, apiKey) {
  // Use last 8 chars of key so we don't store the full key in localStorage
  return `aimitra_models_${provider}_${(apiKey || "").slice(-8)}`;
}

function staticFallback(provider) {
  return MODELS.filter((m) => m.provider === provider);
}

export function useModels(provider, apiKey) {
  const [models, setModels]   = useState(() => staticFallback(provider));
  const [loading, setLoading] = useState(false);
  const [isAuto, setIsAuto]   = useState(false);
  const [error, setError]     = useState(null);

  const fetchModels = useCallback(
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
