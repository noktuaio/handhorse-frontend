export type LocalOnboardingData = {
  name: string;
  email: string;
  phone?: string;
  document?: string;
  address?: string;
  zipcode?: string;
  state?: string;
  city?: string;
  neighborhood?: string;
};

const ONBOARDING_STORAGE_KEY = "handhorse:onboarding-data";

function isBrowserEnvironment() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readStorageMap(): Record<string, LocalOnboardingData> {
  if (!isBrowserEnvironment()) {
    return {};
  }

  const rawValue = window.localStorage.getItem(ONBOARDING_STORAGE_KEY);

  if (!rawValue) {
    return {};
  }

  try {
    const parsed = JSON.parse(rawValue) as Record<string, LocalOnboardingData>;
    return parsed ?? {};
  } catch {
    return {};
  }
}

function writeStorageMap(storageMap: Record<string, LocalOnboardingData>) {
  if (!isBrowserEnvironment()) {
    return;
  }

  window.localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(storageMap));
}

export function saveLocalOnboardingData(payload: LocalOnboardingData) {
  if (!payload.email) {
    return;
  }

  const normalizedEmail = payload.email.trim().toLowerCase();
  const storageMap = readStorageMap();

  writeStorageMap({
    ...storageMap,
    [normalizedEmail]: {
      ...payload,
      email: normalizedEmail,
    },
  });
}

export function getLocalOnboardingData(email: string) {
  if (!email) {
    return null;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const storageMap = readStorageMap();

  return storageMap[normalizedEmail] ?? null;
}

export function clearLocalOnboardingData(email: string) {
  if (!email || !isBrowserEnvironment()) {
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const storageMap = readStorageMap();

  if (!storageMap[normalizedEmail]) {
    return;
  }

  const { [normalizedEmail]: _, ...remainingEntries } = storageMap;
  writeStorageMap(remainingEntries);
}
