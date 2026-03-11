type ExpoExtraConfig = {
  edgeApi?: {
    baseUrl?: string | null;
    enabled?: boolean;
  };
  edgeApiBaseUrl?: string | null;
  perfValidation?: {
    enabled?: boolean;
  };
};

function readExpoExtraConfig(): ExpoExtraConfig {
  try {
    // Avoid a hard dependency on expo-constants during tests or non-Expo contexts.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Constants = require('expo-constants').default;
    const extra =
      Constants?.expoConfig?.extra ??
      Constants?.manifest?.extra ??
      Constants?.manifest2?.extra;
    return (extra ?? {}) as ExpoExtraConfig;
  } catch {
    return {};
  }
}

function normalizeBaseUrl(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.replace(/\/+$/, '');
}

export function getEdgeApiBaseUrl(): string | null {
  const envBaseUrl = normalizeBaseUrl(process.env.EXPO_PUBLIC_EDGE_API_BASE_URL);
  if (envBaseUrl) return envBaseUrl;

  const extra = readExpoExtraConfig();
  return normalizeBaseUrl(extra.edgeApi?.baseUrl ?? extra.edgeApiBaseUrl ?? null);
}

export function isEdgeApiEnabled(): boolean {
  const baseUrl = getEdgeApiBaseUrl();
  if (!baseUrl) return false;

  const envEnabled = process.env.EXPO_PUBLIC_EDGE_API_ENABLED;
  if (typeof envEnabled === 'string') {
    return envEnabled !== 'false';
  }

  const extra = readExpoExtraConfig();
  return extra.edgeApi?.enabled !== false;
}

export function isPerfValidationEnabled(): boolean {
  const envEnabled = process.env.EXPO_PUBLIC_PERF_VALIDATION_ENABLED;
  if (typeof envEnabled === 'string') {
    return envEnabled === 'true';
  }

  const extra = readExpoExtraConfig();
  return extra.perfValidation?.enabled === true;
}
