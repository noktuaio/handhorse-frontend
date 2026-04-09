import type { AuthTokens } from "@/shared/domain/auth";

const PREFIX = "handhorse";

const ACCESS = `${PREFIX}:accessToken`;
const REFRESH = `${PREFIX}:refreshToken`;
const ID_TOKEN = `${PREFIX}:idToken`;

function isBrowser() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function saveAuthTokens(tokens: AuthTokens): void {
  if (!isBrowser()) return;
  localStorage.setItem(ACCESS, tokens.accessToken);
  if (tokens.refreshToken) {
    localStorage.setItem(REFRESH, tokens.refreshToken);
  } else {
    localStorage.removeItem(REFRESH);
  }
  if (tokens.idToken) {
    localStorage.setItem(ID_TOKEN, tokens.idToken);
  } else {
    localStorage.removeItem(ID_TOKEN);
  }
}

export function clearAuthTokens(): void {
  if (!isBrowser()) return;
  localStorage.removeItem(ACCESS);
  localStorage.removeItem(REFRESH);
  localStorage.removeItem(ID_TOKEN);
}

export function getAccessToken(): string | null {
  if (!isBrowser()) return null;
  return localStorage.getItem(ACCESS);
}

/** ID token (claims como `email`); preferir em APIs que resolvem o utilizador pelo JWT. */
export function getIdToken(): string | null {
  if (!isBrowser()) return null;
  return localStorage.getItem(ID_TOKEN);
}
