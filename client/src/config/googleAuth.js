const splitCsv = (value) =>
  (value || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

const isValidOrigin = (value) => {
  if (!value) {
    return false;
  }

  try {
    const parsed = new URL(value);
    return Boolean(parsed.protocol && parsed.host);
  } catch {
    return false;
  }
};

const parseClientIdMap = (value) => {
  if (!value) {
    return {};
  }

  try {
    const parsed = JSON.parse(value);

    if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsed)
        .filter(([origin, clientId]) => typeof origin === 'string' && typeof clientId === 'string')
        .map(([origin, clientId]) => [origin.trim(), clientId.trim()])
        .filter(([origin, clientId]) => origin && clientId)
    );
  } catch {
    return {};
  }
};

const isIpv4Address = (value) => /^\d{1,3}(\.\d{1,3}){3}$/.test(value || '');

const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
const currentHostname = typeof window !== 'undefined' ? window.location.hostname : '';

const clientIdByOrigin = parseClientIdMap(import.meta.env.VITE_GOOGLE_CLIENT_IDS);
const defaultClientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim();
const localhostClientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID_LOCALHOST || '').trim();
const lanClientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID_LAN || '').trim();
const publicClientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID_PUBLIC || '').trim();
const configuredOrigins = splitCsv(import.meta.env.VITE_GOOGLE_ALLOWED_ORIGINS).filter(isValidOrigin);

const currentHostScopedClientId =
  currentHostname === 'localhost' || currentHostname === '127.0.0.1'
    ? localhostClientId
    : isIpv4Address(currentHostname)
      ? lanClientId
      : publicClientId;

const resolvedClientId =
  clientIdByOrigin[currentOrigin] || currentHostScopedClientId || defaultClientId;

const allowedOrigins = Array.from(
  new Set(
    [
      ...configuredOrigins,
      'http://localhost:5173',
      'http://localhost:5000',
      currentOrigin
    ].filter(isValidOrigin)
  )
);

export const googleAuthConfig = {
  allowedOrigins,
  clientId: resolvedClientId,
  currentHostname,
  currentOrigin,
  hasClientId: Boolean(resolvedClientId),
  isLanOrigin: isIpv4Address(currentHostname)
};
