import { HANDHORSE_FINANCE_API_BASE_URL } from "@/shared/config/api-config";
import {
  getAccessToken,
  getIdToken,
  clearAuthTokens,
} from "@/shared/infrastructure/auth/token-storage";
import type { Transaction } from "@/shared/domain/dashboard/index";

export type ApiFinancialTransactionRow = {
  id: string;
  ownerId: string;
  entryType: "income" | "expense";
  category: string;
  description: string;
  amountCents: number;
  occurredOn: string;
  animalId: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  linkedAnimalExamIds: string[];
  linkedAnimalAwardIds: string[];
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

async function financeFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = getIdToken() ?? getAccessToken();
  const headers = new Headers(init.headers);
  if (init.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  } else {
    clearAuthTokens();
  }
  const url = `${HANDHORSE_FINANCE_API_BASE_URL.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
  return fetch(url, { ...init, headers });
}

export function mapApiFinancialRowToTransaction(row: ApiFinancialTransactionRow): Transaction {
  return {
    id: row.id,
    date: row.occurredOn,
    type: row.entryType === "income" ? "Income" : "Expense",
    category: row.category,
    description: row.description,
    amount: row.amountCents / 100,
    horseId: row.animalId ?? undefined,
    linkedAnimalExamIds: row.linkedAnimalExamIds?.length ? row.linkedAnimalExamIds : undefined,
    linkedAnimalAwardIds: row.linkedAnimalAwardIds?.length ? row.linkedAnimalAwardIds : undefined,
  };
}

export type FinancialTransactionWritePayload = {
  entryType: "income" | "expense";
  category: string;
  description: string;
  amountCents: number;
  occurredOn: string;
  animalId?: string | null;
  notes?: string | null;
  linkedAnimalExamIds?: string[];
  linkedAnimalAwardIds?: string[];
};

export function transactionToCreatePayload(t: Partial<Transaction>): FinancialTransactionWritePayload {
  const type = t.type === "Income" ? "income" : "expense";
  const amount = Number(t.amount);
  const amountCents = Math.max(0, Math.round(Number.isFinite(amount) ? amount * 100 : 0));
  return {
    entryType: type,
    category: String(t.category ?? "").trim() || "Outro",
    description: String(t.description ?? "").trim(),
    amountCents,
    occurredOn: String(t.date ?? "").trim() || new Date().toISOString().split("T")[0]!,
    animalId: t.horseId?.trim() || null,
    notes: null,
    linkedAnimalExamIds: t.linkedAnimalExamIds ?? [],
    linkedAnimalAwardIds: t.linkedAnimalAwardIds ?? [],
  };
}

export async function listFinancialTransactionsApi(params?: {
  animalId?: string;
  entryType?: "income" | "expense";
  dateFrom?: string;
  dateTo?: string;
}): Promise<Transaction[]> {
  const sp = new URLSearchParams();
  if (params?.animalId) sp.set("animalId", params.animalId);
  if (params?.entryType) sp.set("entryType", params.entryType);
  if (params?.dateFrom) sp.set("dateFrom", params.dateFrom);
  if (params?.dateTo) sp.set("dateTo", params.dateTo);
  const q = sp.toString();
  const res = await financeFetch(`/financial-transactions${q ? `?${q}` : ""}`, { method: "GET" });
  const rows = await parseResponse<ApiFinancialTransactionRow[]>(res);
  return rows.map(mapApiFinancialRowToTransaction);
}

export async function getFinancialTransactionApi(id: string): Promise<Transaction> {
  const res = await financeFetch(`/financial-transactions/${encodeURIComponent(id)}`, { method: "GET" });
  const row = await parseResponse<ApiFinancialTransactionRow>(res);
  return mapApiFinancialRowToTransaction(row);
}

export async function createFinancialTransactionApi(
  payload: FinancialTransactionWritePayload,
): Promise<Transaction> {
  const res = await financeFetch("/financial-transactions", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  const row = await parseResponse<ApiFinancialTransactionRow>(res);
  return mapApiFinancialRowToTransaction(row);
}

export async function updateFinancialTransactionApi(
  id: string,
  payload: Partial<FinancialTransactionWritePayload>,
): Promise<Transaction> {
  const res = await financeFetch(`/financial-transactions/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  const row = await parseResponse<ApiFinancialTransactionRow>(res);
  return mapApiFinancialRowToTransaction(row);
}

export async function deleteFinancialTransactionApi(id: string): Promise<void> {
  const res = await financeFetch(`/financial-transactions/${encodeURIComponent(id)}`, { method: "DELETE" });
  if (res.status === 204) return;
  await parseResponse<unknown>(res);
}
