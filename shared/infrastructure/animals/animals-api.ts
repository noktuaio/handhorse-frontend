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

export type SessionMeResponse = {
  user: {
    id: string;
    name: string;
    email: string;
    profilePhotoS3Key?: string | null;
    active?: boolean;
    profileCode: string;
  };
  owner: Record<string, unknown> & { id: string; name: string; harasSetupCompleted?: boolean };
  profilePhotoUrl: string | null;
  ownerLogoUrl: string | null;
};

export async function getSessionMeApi(): Promise<SessionMeResponse> {
  const res = await animalsFetch("/session/me", { method: "GET" });
  const data = await parseResponse<SessionMeResponse>(res);
  const u = data?.user as { id?: string; name?: string; email?: string; profileCode?: string } | undefined;
  const o = data?.owner as { id?: string } | undefined;
  if (!u?.id || !u?.profileCode || !o?.id) {
    throw new Error("Resposta de sessão inválida. Verifica se a API animals está atualizada (GET /session/me).");
  }
  return data;
}

export async function presignUserProfilePhotoApi(contentType: string): Promise<PresignS3UploadResponse> {
  const res = await animalsFetch("/users/me/profile-photo/presign", {
    method: "POST",
    body: JSON.stringify({ contentType }),
  });
  return parseResponse<PresignS3UploadResponse>(res);
}

export async function presignOwnerLogoApi(ownerId: string, contentType: string): Promise<PresignS3UploadResponse> {
  const res = await animalsFetch(`/owners/${encodeURIComponent(ownerId)}/logo/presign`, {
    method: "POST",
    body: JSON.stringify({ contentType }),
  });
  return parseResponse<PresignS3UploadResponse>(res);
}

export async function updateOwnerApi(ownerId: string, body: Record<string, unknown>): Promise<unknown> {
  const res = await animalsFetch(`/owners/${encodeURIComponent(ownerId)}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
  return parseResponse<unknown>(res);
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

/** Ocorrência de lembrete regulatório (associação × animal). */
export type ApiReminderOccurrenceRow = {
  id: string;
  ruleId: string;
  animalId: string;
  associationId: string;
  dueDate: string;
  status: "pending" | "done" | "skipped";
  completedAt: string | null;
  completedByEmail: string | null;
  proofS3Key: string | null;
  sourceAnimalExamId: string | null;
  notes: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  ruleTitle: string;
  ruleTriggerKind: string;
  animalName: string;
};

export type ListReminderOccurrencesParams = {
  status?: "pending" | "done" | "skipped";
  dueFrom?: string;
  dueTo?: string;
  animalId?: string;
  limit?: number;
};

export async function listReminderOccurrencesApi(
  params: ListReminderOccurrencesParams = {},
): Promise<ApiReminderOccurrenceRow[]> {
  const sp = new URLSearchParams();
  if (params.status) sp.set("status", params.status);
  if (params.dueFrom) sp.set("dueFrom", params.dueFrom);
  if (params.dueTo) sp.set("dueTo", params.dueTo);
  if (params.animalId) sp.set("animalId", params.animalId);
  if (params.limit != null) sp.set("limit", String(params.limit));
  const qs = sp.toString();
  const res = await animalsFetch(`/reminder-occurrences${qs ? `?${qs}` : ""}`, { method: "GET" });
  return parseResponse<ApiReminderOccurrenceRow[]>(res);
}

export async function patchReminderOccurrenceApi(
  id: string,
  body: { status?: "pending" | "done" | "skipped"; notes?: string | null; proofS3Key?: string | null },
): Promise<ApiReminderOccurrenceRow> {
  const res = await animalsFetch(`/reminder-occurrences/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  return parseResponse<ApiReminderOccurrenceRow>(res);
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

export type PresignS3UploadResponse = {
  uploadUrl: string;
  key: string;
  contentType: string;
};

export async function presignExamAttachmentApi(
  animalId: string,
  contentType: string,
): Promise<PresignS3UploadResponse> {
  const res = await animalsFetch(
    `/animals/${encodeURIComponent(animalId)}/exams/attachment/presign`,
    {
      method: "POST",
      body: JSON.stringify({ contentType }),
    },
  );
  return parseResponse<PresignS3UploadResponse>(res);
}

export async function presignReminderProofApi(
  occurrenceId: string,
  contentType: string,
): Promise<PresignS3UploadResponse> {
  const res = await animalsFetch(
    `/reminder-occurrences/${encodeURIComponent(occurrenceId)}/proof/presign`,
    {
      method: "POST",
      body: JSON.stringify({ contentType }),
    },
  );
  return parseResponse<PresignS3UploadResponse>(res);
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

/** Safari/iOS por vezes deixam `file.type` vazio; o presign e o PUT ao S3 precisam do mesmo content-type. */
export function imageContentTypeFromFile(file: File): string {
  const t = file.type?.trim().toLowerCase();
  if (t === "image/jpeg" || t === "image/png" || t === "image/webp" || t === "image/gif") {
    return t;
  }
  const n = file.name.toLowerCase();
  if (n.endsWith(".jpg") || n.endsWith(".jpeg")) return "image/jpeg";
  if (n.endsWith(".png")) return "image/png";
  if (n.endsWith(".webp")) return "image/webp";
  if (n.endsWith(".gif")) return "image/gif";
  return "image/jpeg";
}

const PHOTO_IO_HINT =
  "Guarde a imagem como ficheiro no disco (ex.: Transferências) e volte a escolher; evite abrir só a pré-visualização da Fototeca/iCloud.";

/**
 * Safari/WebKit: ficheiros da Fototeca/iCloud falham com "The I/O read operation failed".
 * FileReader primeiro; depois slice (novo Blob); por último arrayBuffer no File.
 */
async function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  const tryFileReader = () =>
    new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        if (result instanceof ArrayBuffer) {
          resolve(result);
          return;
        }
        reject(new Error("Leitura da imagem inválida."));
      };
      reader.onerror = () => {
        reject(reader.error ?? new Error("FileReader falhou ao ler o ficheiro."));
      };
      reader.readAsArrayBuffer(file);
    });

  const attempts: Array<() => Promise<ArrayBuffer>> = [
    tryFileReader,
    () => file.slice(0, file.size).arrayBuffer(),
    () => file.arrayBuffer(),
  ];

  let last: unknown;
  for (const run of attempts) {
    try {
      return await run();
    } catch (e) {
      last = e;
    }
  }
  const msg = last instanceof Error ? last.message : String(last);
  throw new Error(`${msg} ${PHOTO_IO_HINT}`);
}

/** Cópia em memória: o Safari por vezes falha no PUT se o buffer ainda estiver ligado ao Blob/File. */
function copyFileBytes(ab: ArrayBuffer): ArrayBuffer {
  const src = new Uint8Array(ab);
  const dst = new Uint8Array(src.byteLength);
  dst.set(src);
  return dst.buffer;
}

/** Safari (macOS/iOS) tem bugs com `fetch`+corpo binário em PUT cross-origin para S3; XHR é mais fiável. */
function preferXhrForPresignedPut(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /safari/i.test(ua) && !/chrome|chromium|crios|fxios|edgios|edg\//i.test(ua);
}

function putPresignedUrlWithXHR(
  uploadUrl: string,
  body: ArrayBuffer,
  contentType: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
        return;
      }
      const snippet = (xhr.responseText ?? "").trim().slice(0, 400);
      reject(
        new Error(
          snippet
            ? `Falha no upload da imagem (${xhr.status}): ${snippet}`
            : `Falha no upload da imagem (${xhr.status}). Verifique CORS do bucket e permissões S3.`,
        ),
      );
    };
    xhr.onerror = () => {
      reject(new Error(`Falha de rede no upload. ${PHOTO_IO_HINT}`));
    };
    xhr.send(body);
  });
}

/** Upload direto para URL pré-assinada do S3 (sem Authorization do nosso API). */
export async function putImageToPresignedUrl(
  uploadUrl: string,
  file: File,
  contentType: string,
): Promise<void> {
  const raw = await readFileAsArrayBuffer(file);
  const body = copyFileBytes(raw);

  if (preferXhrForPresignedPut() && typeof XMLHttpRequest !== "undefined") {
    await putPresignedUrlWithXHR(uploadUrl, body, contentType);
    return;
  }

  const runFetch = () =>
    fetch(uploadUrl, {
      method: "PUT",
      body,
      headers: { "Content-Type": contentType },
      cache: "no-store",
    });

  let res: Response;
  try {
    res = await runFetch();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const looksLikeIo =
      /I\/O read operation failed|stream exhausted|Load failed|network error/i.test(msg);
    if (looksLikeIo && typeof XMLHttpRequest !== "undefined") {
      await putPresignedUrlWithXHR(uploadUrl, body, contentType);
      return;
    }
    if (/I\/O|stream|read operation/i.test(msg)) {
      throw new Error(`${msg} ${PHOTO_IO_HINT}`);
    }
    throw err instanceof Error ? err : new Error(msg);
  }

  if (!res.ok) {
    const detail = (await res.text().catch(() => "")).trim().slice(0, 400);
    throw new Error(
      detail
        ? `Falha no upload da imagem (${res.status}): ${detail}`
        : `Falha no upload da imagem (${res.status}). Verifique CORS do bucket e permissões S3.`,
    );
  }
}

export type PresignAnimalImageResponse = {
  uploadUrl: string;
  fileUrl: string;
  key: string;
  contentType: string;
};

export type AnimalGalleryItem = { key: string; url: string };

export async function presignAnimalMainPhotoApi(
  animalId: string,
  contentType: string,
): Promise<PresignAnimalImageResponse> {
  const res = await animalsFetch(`/animals/${encodeURIComponent(animalId)}/photo/presign`, {
    method: "POST",
    body: JSON.stringify({ contentType }),
  });
  return parseResponse<PresignAnimalImageResponse>(res);
}

export async function presignAnimalGalleryPhotoApi(
  animalId: string,
  contentType: string,
): Promise<PresignAnimalImageResponse> {
  const res = await animalsFetch(`/animals/${encodeURIComponent(animalId)}/gallery/presign`, {
    method: "POST",
    body: JSON.stringify({ contentType }),
  });
  return parseResponse<PresignAnimalImageResponse>(res);
}

export async function listAnimalGalleryApi(animalId: string): Promise<{ items: AnimalGalleryItem[] }> {
  const res = await animalsFetch(`/animals/${encodeURIComponent(animalId)}/gallery`, { method: "GET" });
  return parseResponse<{ items: AnimalGalleryItem[] }>(res);
}
