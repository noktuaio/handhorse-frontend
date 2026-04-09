import type { AwardRecord } from "@/shared/domain/dashboard/index";
import {
  listAnimalAwardsApi,
  type ApiAnimalAwardRow,
  type ApiAwardCatalogRow,
} from "./animals-api";

/** Metadados de prêmio / anexo embutidos em `animal_awards.notes` (sem colunas dedicadas na API). */
const PRIZE_TAG = "__HH_PRIZE_BRL__:";

export function encodeAwardNotes(
  prizeValue: number | undefined,
  attachmentUrl: string | undefined,
  userNotes: string,
): string | null {
  const parts: string[] = [];
  if (prizeValue != null && prizeValue > 0 && !Number.isNaN(prizeValue)) {
    parts.push(`${PRIZE_TAG}${prizeValue}`);
  }
  const att = attachmentUrl?.trim();
  if (att) parts.push(`Anexo: ${att}`);
  const n = userNotes?.trim();
  if (n) parts.push(n);
  if (parts.length === 0) return null;
  return parts.join("\n\n");
}

export function decodeAwardNotes(raw: string | null): {
  prizeValue: number;
  attachmentUrl: string;
  userNotes: string;
} {
  if (!raw?.trim()) return { prizeValue: 0, attachmentUrl: "", userNotes: "" };
  const lines = raw.split(/\n\n+/);
  let prizeValue = 0;
  let attachmentUrl = "";
  const rest: string[] = [];
  for (const block of lines) {
    const t = block.trim();
    if (t.startsWith(PRIZE_TAG)) {
      const n = parseFloat(t.slice(PRIZE_TAG.length).replace(",", "."));
      if (!Number.isNaN(n)) prizeValue = n;
    } else if (t.toLowerCase().startsWith("anexo:")) {
      attachmentUrl = t.slice(6).trim();
    } else {
      rest.push(t);
    }
  }
  return { prizeValue, attachmentUrl, userNotes: rest.join("\n\n") };
}

const VALID_CATEGORIES: AwardRecord["category"][] = [
  "Race",
  "Morphology",
  "Endurance",
  "Team Penning",
  "Breeding",
];

const VALID_PLACEMENTS: AwardRecord["placement"][] = ["1st", "2nd", "3rd", "Honorable Mention"];

export function parseAwardCategory(s: string | null): AwardRecord["category"] {
  if (s && VALID_CATEGORIES.includes(s as AwardRecord["category"])) {
    return s as AwardRecord["category"];
  }
  return "Morphology";
}

export function parseAwardPlacement(s: string | null): AwardRecord["placement"] | null {
  if (s && VALID_PLACEMENTS.includes(s as AwardRecord["placement"])) {
    return s as AwardRecord["placement"];
  }
  return null;
}

export type AwardListItem = {
  recordId: string;
  animalId: string;
  awardId: string;
  horseName: string;
  title: string;
  organization: string;
  date: string;
  category: AwardRecord["category"];
  placement: AwardRecord["placement"] | null;
  prizeValue: number;
  userNotes: string;
  attachmentUrl: string;
};

export async function loadAwardListItems(
  horses: { id: string; name: string }[],
  catalogById: Map<string, ApiAwardCatalogRow>,
): Promise<AwardListItem[]> {
  const parts = await Promise.all(
    horses.map(async (h) => {
      const rows = await listAnimalAwardsApi(h.id).catch(() => [] as ApiAnimalAwardRow[]);
      return rows.map((r) => {
        const aw = catalogById.get(r.awardId);
        const dec = decodeAwardNotes(r.notes);
        const eventD = aw?.eventDate ? (String(aw.eventDate).split("T")[0] ?? "") : "";
        const createdD = r.createdAt ? (String(r.createdAt).split("T")[0] ?? "") : "";
        return {
          recordId: r.id,
          animalId: r.animalId,
          awardId: r.awardId,
          horseName: h.name,
          title: aw?.name ?? "(Prémio removido)",
          organization: aw?.eventName ?? "—",
          date: eventD || createdD,
          category: parseAwardCategory(r.category),
          placement: parseAwardPlacement(r.ranking),
          prizeValue: dec.prizeValue,
          userNotes: dec.userNotes,
          attachmentUrl: dec.attachmentUrl,
        };
      });
    }),
  );
  return parts.flat();
}
