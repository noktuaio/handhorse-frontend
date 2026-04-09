import type { Horse } from "@/shared/domain/dashboard/index";
import type { ApiAnimalRow } from "@/shared/infrastructure/animals/animals-api";

const DEFAULT_PHOTO = "https://picsum.photos/seed/newhorse/400/300";

function toGender(sex: string | null): Horse["gender"] {
  if (sex === "Stallion" || sex === "Mare" || sex === "Gelding") {
    return sex;
  }
  return "Gelding";
}

export function mapApiAnimalToHorse(row: ApiAnimalRow): Horse {
  const birth =
    row.birthDate && typeof row.birthDate === "string"
      ? row.birthDate.split("T")[0] ?? ""
      : "";

  return {
    id: row.id,
    name: row.name,
    breed: row.breed ?? "",
    breedId: row.breedId ?? undefined,
    registry: row.registry ?? undefined,
    birthDate: birth,
    gender: toGender(row.sex),
    coatColor: row.coatColor ?? undefined,
    microchip: row.microchip ?? undefined,
    photoUrl: row.photoUrl || DEFAULT_PHOTO,
    breederId: row.breederId ?? undefined,
    currentOwnerId: row.currentOwnerId ?? undefined,
    bookId: row.bookId ?? undefined,
    sireId: row.fatherId ?? undefined,
    damId: row.motherId ?? undefined,
    status: "Active",
    alive: row.alive ?? true,
    blocked: row.blocked ?? false,
    notes: row.notes ?? undefined,
  };
}
