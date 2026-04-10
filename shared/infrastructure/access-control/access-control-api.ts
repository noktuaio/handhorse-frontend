import { HANDHORSE_API_BASE_URL } from "@/shared/config/api-config";
import {
  getAccessToken,
  getIdToken,
  clearAuthTokens,
} from "@/shared/infrastructure/auth/token-storage";

async function parseResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  let data: unknown = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    /* ignore */
  }
  if (!res.ok) {
    const msg =
      typeof (data as { message?: string }).message === "string"
        ? (data as { message: string }).message
        : `Falha na requisição (código ${res.status}).`;
    throw new Error(msg);
  }
  return data as T;
}

async function accessFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = getIdToken() ?? getAccessToken();
  const headers = new Headers(init.headers);
  if (init.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(`${HANDHORSE_API_BASE_URL}${path}`, { ...init, headers });

  if (res.status === 401) {
    clearAuthTokens();
    if (typeof window !== "undefined") {
      window.location.assign("/auth/login");
    }
  }

  return res;
}

export type ApiMeUser = {
  id: string;
  name: string;
  email: string;
  ownerId: string;
  profilePhotoS3Key?: string | null;
  active?: boolean;
  profileCode: string;
};

export type ApiMeOwner = Record<string, unknown> & {
  id: string;
  name: string;
  harasSetupCompleted?: boolean;
};

export type GetMeResponse = {
  user: ApiMeUser;
  owner: ApiMeOwner;
};

export async function getMeApi(): Promise<GetMeResponse> {
  const res = await accessFetch("/me", { method: "GET" });
  return parseResponse<GetMeResponse>(res);
}

export async function patchMeApi(body: { name?: string; profilePhotoS3Key?: string | null }): Promise<void> {
  const res = await accessFetch("/me", { method: "PATCH", body: JSON.stringify(body) });
  await parseResponse<{ ok?: boolean }>(res);
}

export type ApiAccessProfileRow = { id: string; code: string; name: string };

export async function listAccessProfilesApi(): Promise<ApiAccessProfileRow[]> {
  const res = await accessFetch("/access-profiles", { method: "GET" });
  return parseResponse<ApiAccessProfileRow[]>(res);
}

export type ApiHarasUserRow = {
  id: string;
  ownerId: string;
  profileId: string;
  name: string;
  email: string;
  active: boolean;
  profileCode: string;
};

export async function listHarasUsersApi(ownerId: string): Promise<ApiHarasUserRow[]> {
  const res = await accessFetch(`/owners/${encodeURIComponent(ownerId)}/users`, { method: "GET" });
  return parseResponse<ApiHarasUserRow[]>(res);
}

export async function inviteHarasUserApi(
  ownerId: string,
  body: {
    name: string;
    email: string;
    phone?: string;
    profileCode: "admin" | "staff";
  },
): Promise<void> {
  const res = await accessFetch(`/owners/${encodeURIComponent(ownerId)}/users/invite`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  await parseResponse<{ message?: string }>(res);
}

export async function updateHarasUserApi(
  userId: string,
  body: { profileId?: string; name?: string; email?: string; active?: boolean },
): Promise<ApiHarasUserRow> {
  const res = await accessFetch(`/users/${encodeURIComponent(userId)}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
  return parseResponse<ApiHarasUserRow>(res);
}

export async function deleteHarasUserApi(userId: string): Promise<void> {
  const res = await accessFetch(`/users/${encodeURIComponent(userId)}`, { method: "DELETE" });
  if (res.status === 204) return;
  await parseResponse<unknown>(res);
}
