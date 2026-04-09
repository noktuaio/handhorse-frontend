import type { AwardRecord, HealthRecord, Transaction } from "@/shared/domain/dashboard/index";
import {
  listAnimalAwardsApi,
  listAnimalExamsApi,
  listAwardCatalogApi,
  listExamTypesApi,
  type ApiAnimalAwardRow,
  type ApiAnimalExamRow,
  type ApiAwardCatalogRow,
} from "@/shared/infrastructure/animals/animals-api";
import {
  decodeAwardNotes,
  parseAwardCategory,
  parseAwardPlacement,
} from "@/shared/infrastructure/animals/awards-mappers";
import { listFinancialTransactionsApi } from "@/shared/infrastructure/finance/finance-api";

const RECENT_ITEMS_LIMIT = 10;

function examTypeNameToHealthType(name: string): HealthRecord["type"] {
  const n = name.toLowerCase();
  if (n.includes("vacin")) return "Vaccination";
  if (n.includes("vermif")) return "Deworming";
  if (n.includes("cirurg")) return "Surgery";
  if (n.includes("medic")) return "Medication";
  return "Vet Visit";
}

function mapExamToHealthRecord(row: ApiAnimalExamRow, examTypeName: string): HealthRecord {
  const date = row.examDate?.split("T")[0] ?? row.examDate ?? "";
  const parts = [examTypeName, row.result?.trim()].filter(Boolean);
  return {
    id: row.id,
    horseId: row.animalId,
    date,
    type: examTypeNameToHealthType(examTypeName),
    description: parts.join(" — ") || examTypeName,
    cost: 0,
    result: row.result ?? undefined,
    labName: row.labName ?? undefined,
    validUntil: row.validUntil ?? undefined,
    attachmentUrl: row.attachmentUrl ?? undefined,
  };
}

function mapAwardRowToRecord(r: ApiAnimalAwardRow, catalog: ApiAwardCatalogRow | undefined): AwardRecord {
  const dec = decodeAwardNotes(r.notes);
  const eventD = catalog?.eventDate ? (String(catalog.eventDate).split("T")[0] ?? "") : "";
  const createdD = r.createdAt ? (String(r.createdAt).split("T")[0] ?? "") : "";
  return {
    id: r.id,
    horseId: r.animalId,
    date: eventD || createdD,
    category: parseAwardCategory(r.category),
    title: catalog?.name ?? "(Prémio)",
    organization: catalog?.eventName ?? "—",
    placement: parseAwardPlacement(r.ranking) ?? "Honorable Mention",
    prizeValue: dec.prizeValue > 0 ? dec.prizeValue : undefined,
    notes: dec.userNotes || undefined,
    attachmentUrl: dec.attachmentUrl || undefined,
  };
}

/** Saúde (exames), financeiro e premiações para um animal — dados reais da API. */
export async function fetchAnimalHistoryDataset(horseId: string): Promise<{
  healthRecords: HealthRecord[];
  transactions: Transaction[];
  awards: AwardRecord[];
}> {
  const [types, exams, transactions, catalogRows, awardRows] = await Promise.all([
    listExamTypesApi(),
    listAnimalExamsApi(horseId).catch(() => [] as ApiAnimalExamRow[]),
    listFinancialTransactionsApi({ animalId: horseId }).catch(() => [] as Transaction[]),
    listAwardCatalogApi().catch(() => [] as ApiAwardCatalogRow[]),
    listAnimalAwardsApi(horseId).catch(() => [] as ApiAnimalAwardRow[]),
  ]);

  const typeMap = new Map(types.map((t) => [t.id, t.name]));
  const catalogById = new Map(catalogRows.map((c) => [c.id, c]));

  const healthRecords = exams
    .map((r) => mapExamToHealthRecord(r, typeMap.get(r.examTypeId) ?? "Procedimento"))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, RECENT_ITEMS_LIMIT);

  const txsSorted = [...transactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, RECENT_ITEMS_LIMIT);

  const awards = awardRows
    .map((r) => mapAwardRowToRecord(r, catalogById.get(r.awardId)))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, RECENT_ITEMS_LIMIT);

  return { healthRecords, transactions: txsSorted, awards };
}
