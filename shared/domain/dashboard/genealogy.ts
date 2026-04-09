import type { Horse } from "./index";
import { MOCK_HORSES } from "./mock-data";

const EXTENDED_GENEALOGY_HORSES: Horse[] = [
  {
    id: "gp1",
    name: "Eagle's Pride",
    breed: "Quarter Horse",
    birthDate: "2010-03-15",
    gender: "Stallion",
    photoUrl: "https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?auto=format&fit=crop&q=80&w=400",
    status: "Retired",
  },
  {
    id: "gp2",
    name: "Prairie Rose",
    breed: "Quarter Horse",
    birthDate: "2011-07-20",
    gender: "Mare",
    photoUrl: "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&q=80&w=400",
    status: "Retired",
  },
  {
    id: "gp3",
    name: "Desert Wind",
    breed: "Arabian",
    birthDate: "2009-05-10",
    gender: "Stallion",
    photoUrl: "https://images.unsplash.com/photo-1598974357801-cbca100e65d3?auto=format&fit=crop&q=80&w=400",
    status: "Retired",
  },
  {
    id: "gp4",
    name: "Arabian Moon",
    breed: "Arabian",
    birthDate: "2012-09-01",
    gender: "Mare",
    photoUrl: "https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?auto=format&fit=crop&q=80&w=400",
    status: "Retired",
  },
  {
    id: "off1",
    name: "Starlight Echo",
    breed: "Thoroughbred Mix",
    birthDate: "2023-06-14",
    gender: "Mare",
    photoUrl: "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&q=80&w=400",
    status: "Active",
    sireId: "3",
  },
];

export const ALL_GENEALOGY_HORSES: Horse[] = [
  { ...MOCK_HORSES[0], sireId: "gp1", damId: "gp2" },
  { ...MOCK_HORSES[1], sireId: "gp3", damId: "gp4" },
  ...MOCK_HORSES.slice(2),
  ...EXTENDED_GENEALOGY_HORSES,
];

export function getGenealogySnapshot(selectedHorse: Horse) {
  const sourceHorse = ALL_GENEALOGY_HORSES.find((horse) => horse.id === selectedHorse.id) ?? selectedHorse;
  const sire = ALL_GENEALOGY_HORSES.find((horse) => horse.id === sourceHorse.sireId);
  const dam = ALL_GENEALOGY_HORSES.find((horse) => horse.id === sourceHorse.damId);
  const gpSS = ALL_GENEALOGY_HORSES.find((horse) => horse.id === sire?.sireId);
  const gpSD = ALL_GENEALOGY_HORSES.find((horse) => horse.id === sire?.damId);
  const gpDS = ALL_GENEALOGY_HORSES.find((horse) => horse.id === dam?.sireId);
  const gpDD = ALL_GENEALOGY_HORSES.find((horse) => horse.id === dam?.damId);
  const offspring = ALL_GENEALOGY_HORSES.filter((horse) => horse.sireId === sourceHorse.id || horse.damId === sourceHorse.id);

  return {
    selectedHorse: sourceHorse,
    sire,
    dam,
    gpSS,
    gpSD,
    gpDS,
    gpDD,
    offspring,
  };
}

/** Pedigree a partir da lista real de animais (ex.: API / registo). */
export function getGenealogySnapshotFromHorses(selectedHorse: Horse, allHorses: Horse[]) {
  const byId = new Map(allHorses.map((h) => [h.id, h]));
  const sourceHorse = byId.get(selectedHorse.id) ?? selectedHorse;
  const sire = sourceHorse.sireId ? byId.get(sourceHorse.sireId) : undefined;
  const dam = sourceHorse.damId ? byId.get(sourceHorse.damId) : undefined;
  const gpSS = sire?.sireId ? byId.get(sire.sireId) : undefined;
  const gpSD = sire?.damId ? byId.get(sire.damId) : undefined;
  const gpDS = dam?.sireId ? byId.get(dam.sireId) : undefined;
  const gpDD = dam?.damId ? byId.get(dam.damId) : undefined;
  const offspring = allHorses.filter((h) => h.sireId === sourceHorse.id || h.damId === sourceHorse.id);

  return {
    selectedHorse: sourceHorse,
    sire,
    dam,
    gpSS,
    gpSD,
    gpDS,
    gpDD,
    offspring,
  };
}
