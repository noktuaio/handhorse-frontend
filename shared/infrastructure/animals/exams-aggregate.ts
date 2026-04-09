import { listAnimalExamsApi, type ApiAnimalExamRow } from "./animals-api";

export type ExamRowWithHorse = ApiAnimalExamRow & {
  examTypeName: string;
  horseName: string;
  horseBreed: string;
};

export type HorseRef = { id: string; name: string; breed: string };

export async function loadExamRowsForHorses(
  horses: HorseRef[],
  typeNameById: Map<string, string>,
): Promise<ExamRowWithHorse[]> {
  const parts = await Promise.all(
    horses.map(async (h) => {
      const rows = await listAnimalExamsApi(h.id).catch(() => [] as ApiAnimalExamRow[]);
      return rows.map((r) => ({
        ...r,
        examTypeName: typeNameById.get(r.examTypeId) ?? "Tipo desconhecido",
        horseName: h.name,
        horseBreed: h.breed,
      }));
    }),
  );
  return parts.flat();
}

function parseAgendaDate(iso: string): Date | null {
  if (!iso) return null;
  const day = iso.split("T")[0];
  if (!day) return null;
  return new Date(`${day}T12:00:00`);
}

/** Exames com data de referência (validUntil ou examDate) hoje ou no futuro, mais próximos primeiro. */
export function pickUpcomingExamRows(rows: ExamRowWithHorse[], limit: number): ExamRowWithHorse[] {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const dated = rows
    .map((row) => {
      const raw = row.validUntil?.trim() || row.examDate;
      const dt = raw ? parseAgendaDate(raw) : null;
      if (!dt || Number.isNaN(dt.getTime())) return null;
      return { row, dt };
    })
    .filter((x): x is { row: ExamRowWithHorse; dt: Date } => x !== null)
    .filter(({ dt }) => dt >= startOfToday)
    .sort((a, b) => a.dt.getTime() - b.dt.getTime())
    .slice(0, limit)
    .map(({ row }) => row);

  return dated;
}
