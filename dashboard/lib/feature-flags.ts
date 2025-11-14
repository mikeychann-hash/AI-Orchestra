import { useState, useEffect } from 'react';
import { api } from './api';

/**
 * Feature flag hook for gradual rollout
 *
 * Usage:
 * const visualCanvasEnabled = useFeatureFlag('visualCanvas');
 *
 * if (visualCanvasEnabled) {
 *   return <WorkflowCanvas />;
 * }
 * return <TraditionalDashboard />;
 */
export function useFeatureFlag(flagName: string): boolean {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchFlag() {
      try {
        const result = await api.getFeatureFlag(flagName);
        setEnabled(result.enabled);
      } catch (error) {
        console.error(`[FeatureFlags] Failed to fetch flag "${flagName}":`, error);
        // Default to disabled on error
        setEnabled(false);
      } finally {
        setLoading(false);
      }
    }

    fetchFlag();
  }, [flagName]);

  return enabled;
}

/**
 * Feature flag configuration
 * Maps to backend config/settings.json
 */
export const FEATURE_FLAGS = {
  VISUAL_CANVAS: 'visualCanvas',
  WORKTREE_MANAGEMENT: 'worktreeManagement',
  ZONE_AUTOMATION: 'zoneAutomation',
  GITHUB_INTEGRATION: 'githubIntegration',
} as const;

/**
 * Check if feature flag is enabled (synchronous, local-only)
 * For client-side feature toggles without API call
 */
export function isFeatureEnabled(flagName: string): boolean {
  // Check localStorage for local overrides (development only)
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    const override = localStorage.getItem(`feature_${flagName}`);
    if (override !== null) {
      return override === 'true';
    }
  }

  // Default states (can be overridden by API)
  const defaults: Record<string, boolean> = {
    visualCanvas: false,
    worktreeManagement: false,
    zoneAutomation: false,
    githubIntegration: false,
  };

  return defaults[flagName] ?? false;
}

/**
 * Enable/disable feature flag locally (development only)
 */
export function setFeatureFlagOverride(flagName: string, enabled: boolean): void {
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    localStorage.setItem(`feature_${flagName}`, String(enabled));
    console.log(`[FeatureFlags] Local override: ${flagName} = ${enabled}`);
  } else {
    console.warn('[FeatureFlags] Local overrides only work in development mode');
  }
}

/**
 * Clear all local feature flag overrides
 */
export function clearFeatureFlagOverrides(): void {
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    Object.keys(localStorage)
      .filter(key => key.startsWith('feature_'))
      .forEach(key => localStorage.removeItem(key));
    console.log('[FeatureFlags] Cleared all local overrides');
  }
}
