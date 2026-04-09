export type Horse = {
  id: string;
  name: string;
  breed: string;
  /** Raça cadastrada na API (opcional); `breed` mantém o nome para exibição. */
  breedId?: string;
  registry?: string;
  birthDate: string;
  gender: "Stallion" | "Mare" | "Gelding";
  coatColor?: string;
  microchip?: string;
  photoUrl: string;
  breederId?: string;
  currentOwnerId?: string;
  bookId?: string;
  sireId?: string;
  damId?: string;
  status: "Active" | "Sold" | "Retired";
  alive?: boolean;
  blocked?: boolean;
  notes?: string;
};

export type HealthRecord = {
  id: string;
  horseId: string;
  date: string;
  type: "Vaccination" | "Vet Visit" | "Deworming" | "Medication" | "Surgery";
  description: string;
  cost: number;
  result?: string;
  labName?: string;
  validUntil?: string;
  attachmentUrl?: string;
};

export type Transaction = {
  id: string;
  date: string;
  type: "Income" | "Expense";
  category: string;
  description: string;
  amount: number;
  horseId?: string;
  /** IDs de `animal_exams` ligados ao lançamento (API financeira). */
  linkedAnimalExamIds?: string[];
  /** IDs de `animal_awards` ligados ao lançamento (API financeira). */
  linkedAnimalAwardIds?: string[];
};

export type AwardRecord = {
  id: string;
  horseId: string;
  date: string;
  category: "Race" | "Morphology" | "Endurance" | "Team Penning" | "Breeding";
  title: string;
  organization: string;
  placement: "1st" | "2nd" | "3rd" | "Honorable Mention";
  prizeValue?: number;
  notes?: string;
  attachmentUrl?: string;
};

export type ChartDataPoint = {
  name: string;
  value: number;
};

export const HEALTH_TYPE_PT: Record<HealthRecord["type"], string> = {
  Vaccination: "Vacinação",
  "Vet Visit": "Consulta Vet.",
  Deworming: "Vermifugação",
  Medication: "Medicação",
  Surgery: "Cirurgia",
};

export const AWARD_CATEGORY_PT: Record<AwardRecord["category"], string> = {
  Race: "Corrida",
  Morphology: "Morfologia",
  Endurance: "Enduro",
  "Team Penning": "Team Penning",
  Breeding: "Reprodução",
};

export const AWARD_PLACEMENT_PT: Record<AwardRecord["placement"], string> = {
  "1st": "1º lugar",
  "2nd": "2º lugar",
  "3rd": "3º lugar",
  "Honorable Mention": "Menção honrosa",
};
