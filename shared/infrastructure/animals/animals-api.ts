import { HANDHORSE_ANIMALS_API_BASE_URL } from "@/shared/config/api-config";
import {
  getAccessToken,
  getIdToken,
  clearAuthTokens,
} from "@/shared/infrastructure/auth/token-storage";

export type ApiAnimalRow = {
  id: string;
  name: string;
  registry: string | null;
  sex: string | null;
  birthDate: string | null;
  coatColor: string | null;
  microchip: string | null;
  breed: string | null;
  breedId?: string | null;
  photoUrl: string | null;
  breederId: string | null;
  currentOwnerId: string | null;
  bookId: string | null;
  fatherId: string | null;
  motherId: string | null;
  alive: boolean | null;
  blocked: boolean | null;
  notes: string | null;
};

export type ApiBreederRow = { id: string; name: string; document?: string | null; email?: string | null };
export type ApiOwnerRow = { id: string; name: string; email?: string | null };
export type ApiBookRow = { id: string; code: string; description: string | null; sexRestriction: string | null };

/** Associações que regulam criação, comércio e exposições */
export type ApiAssociationRow = {
  id: string;
  name: string;
  acronym: string | null;
  description: string | null;
  active: boolean;
};

/** Raça cadastrada; `associationIds` = vínculos N:N */
export type ApiBreedRow = {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  active: boolean;
  associationIds: string[];
};

/** Tabela `statuses` (cadastro de estados) */
export type ApiStatusRow = {
  id: string;
  code: string;
  name: string;
  group: string;
  description: string | null;
  displayOrder: number | null;
};

export type ApiExamTypeRow = {
  id: string;
  name: string;
  description: string | null;
};

/** Catálogo `awards` (eventos / prêmios) */
export type ApiAwardCatalogRow = {
  id: string;
  name: string;
  description: string | null;
  eventName: string | null;
  eventDate: string | null;
};

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

async function animalsFetch(path: string, init: RequestInit = {}): Promise<Response> {
  // ID token inclui `email`; o access token do Cognito muitas vezes não — o backend faz match por email na BD.
  const token = getIdToken() ?? getAccessToken();
  const headers = new Headers(init.headers);
  if (init.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(`${HANDHORSE_ANIMALS_API_BASE_URL}${path}`, { ...init, headers });

  if (res.status === 401) {
    clearAuthTokens();
    if (typeof window !== "undefined") {
      window.location.assign("/auth/login");
    }
  }

  return res;
}

export async function listAnimalsApi(q?: string): Promise<ApiAnimalRow[]> {
  const qs = q?.trim() ? `?q=${encodeURIComponent(q.trim())}` : "";
  const res = await animalsFetch(`/animals${qs}`, { method: "GET" });
  return parseResponse<ApiAnimalRow[]>(res);
}

export async function createAnimalApi(body: Record<string, unknown>): Promise<ApiAnimalRow> {
  const res = await animalsFetch("/animals", { method: "POST", body: JSON.stringify(body) });
  return parseResponse<ApiAnimalRow>(res);
}

export async function updateAnimalApi(id: string, body: Record<string, unknown>): Promise<ApiAnimalRow> {
  const res = await animalsFetch(`/animals/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
  return parseResponse<ApiAnimalRow>(res);
}

export async function deleteAnimalApi(id: string): Promise<void> {
  const res = await animalsFetch(`/animals/${encodeURIComponent(id)}`, { method: "DELETE" });
  if (res.ok) return;
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
}

export async function listBreedersApi(): Promise<ApiBreederRow[]> {
  const res = await animalsFetch("/breeders", { method: "GET" });
  return parseResponse<ApiBreederRow[]>(res);
}

export async function listOwnersApi(): Promise<ApiOwnerRow[]> {
  const res = await animalsFetch("/owners", { method: "GET" });
  return parseResponse<ApiOwnerRow[]>(res);
}

export async function listBooksApi(): Promise<ApiBookRow[]> {
  const res = await animalsFetch("/books", { method: "GET" });
  return parseResponse<ApiBookRow[]>(res);
}

export async function listAssociationsApi(): Promise<ApiAssociationRow[]> {
  const res = await animalsFetch("/associations", { method: "GET" });
  return parseResponse<ApiAssociationRow[]>(res);
}

export async function listBreedsApi(associationId?: string): Promise<ApiBreedRow[]> {
  const trimmed = associationId?.trim();
  const qs = trimmed ? `?associationId=${encodeURIComponent(trimmed)}` : "";
  const res = await animalsFetch(`/breeds${qs}`, { method: "GET" });
  return parseResponse<ApiBreedRow[]>(res);
}

export async function listStatusesApi(): Promise<ApiStatusRow[]> {
  const res = await animalsFetch("/statuses", { method: "GET" });
  return parseResponse<ApiStatusRow[]>(res);
}

export async function listExamTypesApi(): Promise<ApiExamTypeRow[]> {
  const res = await animalsFetch("/exam-types", { method: "GET" });
  return parseResponse<ApiExamTypeRow[]>(res);
}

/** Linha `animal_exams` (resposta camelCase). */
export type ApiAnimalExamRow = {
  id: string;
  animalId: string;
  examTypeId: string;
  examDate: string;
  result: string | null;
  labName: string | null;
  validUntil: string | null;
  attachmentUrl: string | null;
  createdAt?: string | null;
};

export async function listAnimalExamsApi(animalId: string): Promise<ApiAnimalExamRow[]> {
  const res = await animalsFetch(`/animals/${encodeURIComponent(animalId)}/exams`, { method: "GET" });
  return parseResponse<ApiAnimalExamRow[]>(res);
}

export async function createAnimalExamApi(
  animalId: string,
  body: Record<string, unknown>,
): Promise<ApiAnimalExamRow> {
  const res = await animalsFetch(`/animals/${encodeURIComponent(animalId)}/exams`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  return parseResponse<ApiAnimalExamRow>(res);
}

export async function updateAnimalExamApi(
  animalId: string,
  recordId: string,
  body: Record<string, unknown>,
): Promise<ApiAnimalExamRow> {
  const res = await animalsFetch(
    `/animals/${encodeURIComponent(animalId)}/exams/${encodeURIComponent(recordId)}`,
    { method: "PUT", body: JSON.stringify(body) },
  );
  return parseResponse<ApiAnimalExamRow>(res);
}

export async function deleteAnimalExamApi(animalId: string, recordId: string): Promise<void> {
  const res = await animalsFetch(
    `/animals/${encodeURIComponent(animalId)}/exams/${encodeURIComponent(recordId)}`,
    { method: "DELETE" },
  );
  if (res.ok) return;
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
}

export async function listAwardCatalogApi(): Promise<ApiAwardCatalogRow[]> {
  const res = await animalsFetch("/award-catalog", { method: "GET" });
  return parseResponse<ApiAwardCatalogRow[]>(res);
}

/** Ligação `animal_awards` (resposta camelCase). */
export type ApiAnimalAwardRow = {
  id: string;
  animalId: string;
  awardId: string;
  ranking: string | null;
  category: string | null;
  judge: string | null;
  notes: string | null;
  createdAt?: string | null;
};

export async function listAnimalAwardsApi(animalId: string): Promise<ApiAnimalAwardRow[]> {
  const res = await animalsFetch(`/animals/${encodeURIComponent(animalId)}/animal-awards`, {
    method: "GET",
  });
  return parseResponse<ApiAnimalAwardRow[]>(res);
}

export async function createAwardCatalogApi(body: {
  name: string;
  description?: string | null;
  eventName?: string | null;
  eventDate?: string | null;
}): Promise<ApiAwardCatalogRow> {
  const res = await animalsFetch("/award-catalog", {
    method: "POST",
    body: JSON.stringify({
      name: body.name.trim(),
      description: body.description ?? null,
      eventName: body.eventName?.trim() || null,
      eventDate: body.eventDate?.trim() || null,
    }),
  });
  return parseResponse<ApiAwardCatalogRow>(res);
}

export async function updateAwardCatalogApi(
  id: string,
  body: {
    name?: string;
    description?: string | null;
    eventName?: string | null;
    eventDate?: string | null;
  },
): Promise<ApiAwardCatalogRow> {
  const res = await animalsFetch(`/award-catalog/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
  return parseResponse<ApiAwardCatalogRow>(res);
}

export async function createAnimalAwardApi(
  animalId: string,
  body: {
    awardId: string;
    ranking?: string | null;
    category?: string | null;
    judge?: string | null;
    notes?: string | null;
  },
): Promise<ApiAnimalAwardRow> {
  const res = await animalsFetch(`/animals/${encodeURIComponent(animalId)}/animal-awards`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  return parseResponse<ApiAnimalAwardRow>(res);
}

export async function updateAnimalAwardApi(
  animalId: string,
  recordId: string,
  body: {
    awardId?: string;
    ranking?: string | null;
    category?: string | null;
    judge?: string | null;
    notes?: string | null;
  },
): Promise<ApiAnimalAwardRow> {
  const res = await animalsFetch(
    `/animals/${encodeURIComponent(animalId)}/animal-awards/${encodeURIComponent(recordId)}`,
    { method: "PUT", body: JSON.stringify(body) },
  );
  return parseResponse<ApiAnimalAwardRow>(res);
}

export async function deleteAnimalAwardApi(animalId: string, recordId: string): Promise<void> {
  const res = await animalsFetch(
    `/animals/${encodeURIComponent(animalId)}/animal-awards/${encodeURIComponent(recordId)}`,
    { method: "DELETE" },
  );
  if (res.ok) return;
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
}
