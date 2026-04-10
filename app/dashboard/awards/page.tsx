"use client";

import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  type CSSProperties,
  type FormEvent,
} from "react";
import {
  Trophy,
  Plus,
  Filter,
  Calendar,
  Activity,
  X,
  Medal,
  Award,
  ChevronDown,
  Check,
  Pencil,
  Trash2,
  Building2,
  ArrowLeft,
} from "lucide-react";
import { useTheme } from "@/shared/ui/theme-context";
import { mapApiAnimalToHorse } from "@/shared/domain/dashboard/map-api-animal";
import type { Horse } from "@/shared/domain/dashboard/index";
import { AWARD_CATEGORY_PT, AWARD_PLACEMENT_PT } from "@/shared/domain/dashboard/index";
import type { AwardRecord } from "@/shared/domain/dashboard/index";
import {
  createAnimalAwardApi,
  createAwardCatalogApi,
  deleteAnimalAwardApi,
  listAnimalsApi,
  listAwardCatalogApi,
  updateAnimalAwardApi,
  updateAwardCatalogApi,
} from "@/shared/infrastructure/animals/animals-api";
import {
  encodeAwardNotes,
  loadAwardListItems,
  type AwardListItem,
} from "@/shared/infrastructure/animals/awards-mappers";
import { useNavLoadingSetter } from "../nav-loading-context";
import { useScrollLock } from "@/shared/ui/use-scroll-lock";
import styles from "../shell.module.css";

const CATEGORY_ICON = {
  Race: Trophy,
  Morphology: Award,
  Endurance: Activity,
  "Team Penning": Medal,
  Breeding: Building2,
} satisfies Record<AwardRecord["category"], typeof Trophy>;

const CATEGORY_COLOR = {
  Race: "#f59e0b",
  Morphology: "#8b5cf6",
  Endurance: "#10b981",
  "Team Penning": "#3b82f6",
  Breeding: "#ec4899",
} satisfies Record<AwardRecord["category"], string>;

const PLACEMENT_COLOR = {
  "1st": "#f59e0b",
  "2nd": "#94a3b8",
  "3rd": "#b45309",
  "Honorable Mention": "#3b82f6",
} satisfies Record<AwardRecord["placement"], string>;

const ALL_AWARD_CATEGORIES = Object.keys(AWARD_CATEGORY_PT) as AwardRecord["category"][];
const ALL_AWARD_PLACEMENTS = Object.keys(AWARD_PLACEMENT_PT) as AwardRecord["placement"][];

function normalizeDateInput(iso: string): string {
  if (!iso) return "";
  return iso.split("T")[0] ?? iso;
}

function formatDate(iso: string) {
  const d = normalizeDateInput(iso);
  if (!d) return "—";
  return new Date(d + "T12:00:00").toLocaleDateString("pt-BR");
}

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Nome no catálogo quando o usuário deixa o título em branco (API exige `name`). */
const DEFAULT_AWARD_CATALOG_NAME = "Premiação (sem título)";

const MAX_PRIZE_DIGITS = 14;

/** Dígitos = centavos acumulados (ex.: "1234" → R$ 12,34). */
function brlMaskDisplayFromDigits(digits: string): string {
  if (!digits) return "";
  const cents = parseInt(digits, 10);
  if (Number.isNaN(cents)) return "";
  const reais = cents / 100;
  return reais.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function prizeReaisFromDigits(digits: string): number {
  if (!digits) return 0;
  const cents = parseInt(digits, 10);
  return Number.isNaN(cents) ? 0 : cents / 100;
}

function digitsFromPrizeReais(value: number): string {
  if (value == null || value <= 0 || Number.isNaN(value)) return "";
  const cents = Math.round(value * 100);
  if (!Number.isFinite(cents) || cents <= 0) return "";
  return String(Math.min(Number.MAX_SAFE_INTEGER, cents));
}

type AwardFormPlacement = "" | AwardRecord["placement"];

type AwardFormState = {
  horseId: string;
  title: string;
  organization: string;
  date: string;
  category: AwardRecord["category"];
  placement: AwardFormPlacement;
  prizeDigits: string;
  userNotes: string;
  attachmentUrl: string;
};

function emptyAwardForm(defaultHorseId: string): AwardFormState {
  const today = new Date().toISOString().split("T")[0] ?? "";
  return {
    horseId: defaultHorseId,
    title: "",
    organization: "",
    date: today,
    category: "Race",
    placement: "",
    prizeDigits: "",
    userNotes: "",
    attachmentUrl: "",
  };
}

function formFromItem(item: AwardListItem): AwardFormState {
  const rawTitle = item.title === "(Prémio removido)" ? "" : item.title;
  const title =
    rawTitle === DEFAULT_AWARD_CATALOG_NAME ? "" : rawTitle;
  return {
    horseId: item.animalId,
    title,
    organization: item.organization === "—" ? "" : item.organization,
    date:
      normalizeDateInput(item.date) || (new Date().toISOString().split("T")[0] ?? ""),
    category: item.category,
    placement: (item.placement ?? "") as AwardFormPlacement,
    prizeDigits: digitsFromPrizeReais(item.prizeValue),
    userNotes: item.userNotes,
    attachmentUrl: item.attachmentUrl,
  };
}

export default function AwardsPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [horses, setHorses] = useState<Horse[]>([]);
  const [records, setRecords] = useState<AwardListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [filterHorse, setFilterHorse] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [showModal, setShowModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AwardListItem | null>(null);
  const [form, setForm] = useState<AwardFormState>(() => emptyAwardForm(""));

  const [showFilter, setShowFilter] = useState(false);
  const setNavLoading = useNavLoadingSetter();

  useScrollLock(showFilter);

  useEffect(() => {
    if (!showModal) return;
    const id = requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    });
    return () => cancelAnimationFrame(id);
  }, [showModal]);

  const refreshRecords = useCallback(async () => {
    const cat = await listAwardCatalogApi();
    const map = new Map(cat.map((a) => [a.id, a]));
    const items = await loadAwardListItems(
      horses.map((h) => ({ id: h.id, name: h.name })),
      map,
    );
    items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setRecords(items);
  }, [horses]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoadError(null);
        setLoading(true);
        const [animalRows, cat] = await Promise.all([listAnimalsApi(), listAwardCatalogApi()]);
        if (cancelled) return;
        const mapped = animalRows.map(mapApiAnimalToHorse);
        const map = new Map(cat.map((a) => [a.id, a]));
        const items = await loadAwardListItems(
          mapped.map((h) => ({ id: h.id, name: h.name })),
          map,
        );
        items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setHorses(mapped);
        setRecords(items);
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : "Não foi possível carregar os dados.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (loading) {
      setNavLoading({ message: "Estamos carregando as premiações para você" });
    } else {
      setNavLoading(null);
    }
    return () => setNavLoading(null);
  }, [loading, setNavLoading]);

  const filtered = records
    .filter((r) => filterHorse === "all" || r.animalId === filterHorse)
    .filter((r) => filterCategory === "all" || r.category === filterCategory);

  const topAnimalsByAwards = useMemo(() => {
    const byId = new Map<string, { animalId: string; name: string; count: number }>();
    for (const r of records) {
      const prev = byId.get(r.animalId);
      if (prev) prev.count += 1;
      else byId.set(r.animalId, { animalId: r.animalId, name: r.horseName, count: 1 });
    }
    return [...byId.values()].sort((a, b) => b.count - a.count).slice(0, 3);
  }, [records]);

  const activeCount = (filterHorse !== "all" ? 1 : 0) + (filterCategory !== "all" ? 1 : 0);

  const glass: CSSProperties = {
    background: isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.75)",
    border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(148,163,184,0.2)"}`,
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    boxShadow: isDark ? "0 4px 32px rgba(0,0,0,0.5)" : "0 4px 32px rgba(15,23,42,0.08)",
    borderRadius: "24px",
  };

  const glassDark: CSSProperties = {
    background: isDark ? "rgba(2,6,23,0.97)" : "rgba(255,255,255,0.97)",
    border: `1px solid ${isDark ? "rgba(255,255,255,0.12)" : "rgba(148,163,184,0.25)"}`,
    backdropFilter: "blur(24px)",
    WebkitBackdropFilter: "blur(24px)",
    boxShadow: isDark ? "0 24px 60px rgba(0,0,0,0.8)" : "0 24px 60px rgba(15,23,42,0.18)",
  };

  const popoverBg: CSSProperties = {
    background: isDark ? "rgba(8,14,40,0.98)" : "rgba(255,255,255,0.99)",
    border: `1px solid ${isDark ? "rgba(255,255,255,0.12)" : "rgba(148,163,184,0.22)"}`,
    backdropFilter: "blur(24px)",
    WebkitBackdropFilter: "blur(24px)",
    boxShadow: isDark ? "0 16px 48px rgba(0,0,0,0.7)" : "0 16px 48px rgba(15,23,42,0.14)",
    borderRadius: "20px",
  };

  const inputStyle: CSSProperties = {
    width: "100%",
    padding: "12px 14px",
    borderRadius: "14px",
    border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(148,163,184,0.3)"}`,
    background: isDark ? "rgba(255,255,255,0.06)" : "rgba(248,250,252,1)",
    color: isDark ? "#E5E7EB" : "#0f172a",
    fontSize: "0.9rem",
    outline: "none",
    boxSizing: "border-box",
  };

  const textColor = isDark ? "#E5E7EB" : "#0f172a";
  const mutedColor = isDark ? "#9CA3AF" : "#64748b";
  const dividerColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(148,163,184,0.18)";

  function openNewModal() {
    setSaveError(null);
    setEditingRecord(null);
    setForm(emptyAwardForm(horses[0]?.id ?? ""));
    setShowModal(true);
  }

  function openEditModal(rec: AwardListItem) {
    setSaveError(null);
    setEditingRecord(rec);
    setForm(formFromItem(rec));
    setShowModal(true);
  }

  function patchForm(fields: Partial<AwardFormState>) {
    setForm((prev) => ({ ...prev, ...fields }));
  }

  function resetFilters() {
    setFilterHorse("all");
    setFilterCategory("all");
    setShowFilter(false);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaveError(null);
    if (!form.horseId) {
      setSaveError("Selecione o animal.");
      return;
    }
    if (!form.date?.trim()) {
      setSaveError("Informe a data.");
      return;
    }
    const catalogName = form.title.trim() || DEFAULT_AWARD_CATALOG_NAME;
    const rankingPayload = form.placement === "" ? null : form.placement;
    const prizeValue = prizeReaisFromDigits(form.prizeDigits);
    const notesPayload = encodeAwardNotes(
      prizeValue,
      form.attachmentUrl,
      form.userNotes,
    );

    setSaving(true);
    try {
      if (editingRecord) {
        await updateAwardCatalogApi(editingRecord.awardId, {
          name: catalogName,
          eventName: form.organization.trim() || null,
          eventDate: form.date.trim() || null,
        });
        await updateAnimalAwardApi(editingRecord.animalId, editingRecord.recordId, {
          awardId: editingRecord.awardId,
          ranking: rankingPayload,
          category: form.category,
          notes: notesPayload,
        });
      } else {
        const aw = await createAwardCatalogApi({
          name: catalogName,
          description: null,
          eventName: form.organization.trim() || null,
          eventDate: form.date.trim() || null,
        });
        await createAnimalAwardApi(form.horseId, {
          awardId: aw.id,
          ranking: rankingPayload,
          category: form.category,
          notes: notesPayload,
        });
      }
      await refreshRecords();
      setShowModal(false);
      setEditingRecord(null);
      setForm(emptyAwardForm(horses[0]?.id ?? ""));
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(rec: AwardListItem) {
    if (!window.confirm(`Excluir esta premiação (${rec.title} — ${rec.horseName})?`)) {
      return;
    }
    try {
      await deleteAnimalAwardApi(rec.animalId, rec.recordId);
      await refreshRecords();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Não foi possível excluir.");
    }
  }

  function closeAwardForm() {
    if (saving) return;
    setShowModal(false);
    setEditingRecord(null);
  }

  return (
    <>
      {!showModal && (
      <div style={{ display: "flex", flexDirection: "column", gap: "28px", paddingBottom: "48px" }}>
        {loadError && !loading && (
          <p style={{ margin: 0, fontSize: "0.9rem", color: "#f87171" }} role="alert">
            {loadError}
          </p>
        )}

        <div className={styles.registryHeader}>
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: "1.75rem",
                fontWeight: 900,
                letterSpacing: "-0.03em",
                color: textColor,
              }}
            >
              Premiações
            </h2>
            <p style={{ margin: "4px 0 0", fontSize: "0.9rem", color: mutedColor }}>
              Títulos e prémios por animal (dados da API).
            </p>
          </div>
          <button
            type="button"
            onClick={openNewModal}
            disabled={loading || horses.length === 0}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "12px 22px",
              borderRadius: "16px",
              border: "none",
              backgroundColor: horses.length ? "#f59e0b" : "#64748b",
              color: "#fff",
              fontWeight: 700,
              fontSize: "0.9rem",
              cursor: horses.length ? "pointer" : "not-allowed",
              boxShadow: "0 4px 16px rgba(245,158,11,0.35)",
              flexShrink: 0,
              whiteSpace: "nowrap",
            }}
          >
            <Plus size={18} />
            Registrar premiação
          </button>
        </div>

        {!loading && horses.length === 0 && (
          <p style={{ margin: 0, fontSize: "0.9rem", color: mutedColor }}>
            Cadastre animais no registro para registrar premiações.
          </p>
        )}

        <div
          style={{
            ...glass,
            padding: "16px 14px",
            width: "100%",
            maxWidth: "100%",
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
          }}
        >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "10px",
                  backgroundColor: "rgba(16,185,129,0.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Medal size={16} color="#10b981" />
              </div>
              <div style={{ minWidth: 0 }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.55rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    color: mutedColor,
                  }}
                >
                  Mais premiados
                </p>
                <p style={{ margin: "2px 0 0", fontSize: "0.78rem", fontWeight: 600, color: textColor }}>
                  Top 3 animais
                </p>
              </div>
            </div>
            {topAnimalsByAwards.length === 0 ? (
              <p style={{ margin: 0, fontSize: "0.82rem", color: mutedColor, lineHeight: 1.4 }}>
                Ainda não há premiações registadas por animal.
              </p>
            ) : (
              <ul
                style={{
                  margin: 0,
                  padding: 0,
                  listStyle: "none",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0",
                }}
              >
                {topAnimalsByAwards.map((row, index) => (
                  <li
                    key={row.animalId}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "10px 0",
                      borderTop: index === 0 ? "none" : `1px solid ${dividerColor}`,
                    }}
                  >
                    <span
                      style={{
                        fontSize: "0.85rem",
                        fontWeight: 900,
                        color: index === 0 ? "#f59e0b" : index === 1 ? "#94a3b8" : "#b45309",
                        width: "22px",
                        flexShrink: 0,
                      }}
                      aria-hidden
                    >
                      {index + 1}º
                    </span>
                    <span
                      style={{
                        flex: 1,
                        minWidth: 0,
                        fontSize: "0.88rem",
                        fontWeight: 700,
                        color: textColor,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {row.name}
                    </span>
                    <span
                      style={{
                        fontSize: "0.78rem",
                        fontWeight: 700,
                        color: mutedColor,
                        flexShrink: 0,
                      }}
                    >
                      {row.count} {row.count === 1 ? "premiação" : "premiações"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          {filterHorse !== "all" && (
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "7px 12px",
                borderRadius: "999px",
                backgroundColor: "rgba(59,130,246,0.12)",
                border: "1px solid rgba(59,130,246,0.3)",
                fontSize: "0.72rem",
                fontWeight: 700,
                color: "#3b82f6",
              }}
            >
              {horses.find((horse) => horse.id === filterHorse)?.name}
              <button
                type="button"
                onClick={() => setFilterHorse("all")}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  display: "flex",
                  color: "#3b82f6",
                }}
                aria-label="Limpar filtro"
              >
                <X size={12} />
              </button>
            </span>
          )}
          {filterCategory !== "all" && (
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "7px 12px",
                borderRadius: "999px",
                backgroundColor: `${CATEGORY_COLOR[filterCategory as AwardRecord["category"]]}1a`,
                border: `1px solid ${CATEGORY_COLOR[filterCategory as AwardRecord["category"]]}4d`,
                fontSize: "0.72rem",
                fontWeight: 700,
                color: CATEGORY_COLOR[filterCategory as AwardRecord["category"]],
              }}
            >
              {AWARD_CATEGORY_PT[filterCategory as AwardRecord["category"]]}
              <button
                type="button"
                onClick={() => setFilterCategory("all")}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  display: "flex",
                  color: CATEGORY_COLOR[filterCategory as AwardRecord["category"]],
                }}
                aria-label="Limpar filtro"
              >
                <X size={12} />
              </button>
            </span>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0", position: "relative", zIndex: 2 }}>
          <div
            style={{
              ...glass,
              borderRadius: "24px 24px 0 0",
              padding: "18px 20px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              borderBottom: `1px solid ${dividerColor}`,
              position: "relative",
              zIndex: 3,
            }}
          >
            <Trophy size={18} color="#f59e0b" style={{ flexShrink: 0 }} />
            <h3
              style={{
                margin: 0,
                fontSize: "0.9rem",
                fontWeight: 700,
                color: textColor,
                flex: 1,
                minWidth: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              Premiações registradas
            </h3>
            <div
              style={{
                marginLeft: "auto",
                display: "flex",
                alignItems: "center",
                gap: "18px",
                flexShrink: 0,
                paddingLeft: "12px",
              }}
            >
              <div style={{ position: "relative", zIndex: 4, flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={() => setShowFilter((c) => !c)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "8px 12px",
                    borderRadius: "12px",
                    border: `1px solid ${
                      activeCount > 0
                        ? "rgba(59,130,246,0.5)"
                        : isDark
                          ? "rgba(255,255,255,0.12)"
                          : "rgba(148,163,184,0.25)"
                    }`,
                    background:
                      activeCount > 0
                        ? isDark
                          ? "rgba(59,130,246,0.18)"
                          : "rgba(59,130,246,0.1)"
                        : isDark
                          ? "rgba(255,255,255,0.04)"
                          : "#ffffff",
                    color: activeCount > 0 ? "#3b82f6" : textColor,
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  <Filter size={14} />
                  Filtrar
                  {activeCount > 0 && (
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "18px",
                        height: "18px",
                        borderRadius: "50%",
                        backgroundColor: "#2563eb",
                        color: "#fff",
                        fontSize: "0.62rem",
                        fontWeight: 800,
                        lineHeight: 1,
                      }}
                    >
                      {activeCount}
                    </span>
                  )}
                  <ChevronDown
                    size={14}
                    style={{
                      transition: "transform 0.2s",
                      transform: showFilter ? "rotate(180deg)" : "rotate(0deg)",
                    }}
                  />
                </button>

                {showFilter && (
                  <div
                    style={{
                      position: "fixed",
                      inset: 0,
                      zIndex: 80,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "16px",
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        backgroundColor: "rgba(0,0,0,0.45)",
                        backdropFilter: "blur(4px)",
                        WebkitBackdropFilter: "blur(4px)",
                      }}
                      onClick={() => setShowFilter(false)}
                    />
                    <div
                      style={{
                        ...popoverBg,
                        position: "relative",
                        zIndex: 81,
                        width: "100%",
                        maxWidth: "320px",
                        maxHeight: "min(80vh, 640px)",
                        overflowY: "auto",
                        padding: "20px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginBottom: "18px",
                        }}
                      >
                        <p
                          style={{
                            margin: 0,
                            fontSize: "0.75rem",
                            fontWeight: 800,
                            textTransform: "uppercase",
                            letterSpacing: "0.1em",
                            color: mutedColor,
                          }}
                        >
                          Filtros
                        </p>
                        {activeCount > 0 && (
                          <button
                            type="button"
                            onClick={resetFilters}
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              fontSize: "0.72rem",
                              fontWeight: 700,
                              color: "#f43f5e",
                              padding: "2px 6px",
                              borderRadius: "8px",
                            }}
                          >
                            Limpar tudo
                          </button>
                        )}
                      </div>

                      <p
                        style={{
                          margin: "0 0 8px",
                          fontSize: "0.65rem",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.09em",
                          color: mutedColor,
                        }}
                      >
                        Animal
                      </p>
                      <div style={{ display: "flex", flexDirection: "column", gap: "2px", marginBottom: "18px" }}>
                        {[{ id: "all", name: "Todos os animais" }, ...horses].map((horse) => {
                          const isActive = filterHorse === horse.id;
                          return (
                            <button
                              key={horse.id}
                              type="button"
                              onClick={() => setFilterHorse(horse.id)}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                width: "100%",
                                textAlign: "left",
                                padding: "9px 12px",
                                borderRadius: "12px",
                                border: "none",
                                cursor: "pointer",
                                fontSize: "0.85rem",
                                fontWeight: isActive ? 700 : 500,
                                backgroundColor: isActive
                                  ? isDark
                                    ? "rgba(59,130,246,0.18)"
                                    : "rgba(59,130,246,0.1)"
                                  : "transparent",
                                color: isActive ? "#3b82f6" : isDark ? "#E5E7EB" : "#374151",
                              }}
                            >
                              {horse.name}
                              {isActive && <Check size={14} color="#3b82f6" />}
                            </button>
                          );
                        })}
                      </div>

                      <div style={{ height: "1px", backgroundColor: dividerColor, marginBottom: "18px" }} />

                      <p
                        style={{
                          margin: "0 0 8px",
                          fontSize: "0.65rem",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.09em",
                          color: mutedColor,
                        }}
                      >
                        Categoria
                      </p>
                      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                        {(["all", ...ALL_AWARD_CATEGORIES] as const).map((category) => {
                          const isActive = filterCategory === category;
                          const color = category === "all" ? "#3b82f6" : CATEGORY_COLOR[category];
                          const label =
                            category === "all" ? "Todas as categorias" : AWARD_CATEGORY_PT[category];
                          return (
                            <button
                              key={category}
                              type="button"
                              onClick={() => setFilterCategory(category)}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                width: "100%",
                                textAlign: "left",
                                padding: "9px 12px",
                                borderRadius: "12px",
                                border: "none",
                                cursor: "pointer",
                                fontSize: "0.85rem",
                                fontWeight: isActive ? 700 : 500,
                                backgroundColor: isActive ? `${color}1a` : "transparent",
                                color: isActive ? color : isDark ? "#E5E7EB" : "#374151",
                              }}
                            >
                              {label}
                              {isActive && <Check size={14} color={color} />}
                            </button>
                          );
                        })}
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowFilter(false)}
                        style={{
                          marginTop: "18px",
                          width: "100%",
                          padding: "11px 0",
                          borderRadius: "13px",
                          border: "none",
                          backgroundColor: "#2563eb",
                          color: "#fff",
                          fontWeight: 700,
                          fontSize: "0.85rem",
                          cursor: "pointer",
                          boxShadow: "0 4px 14px rgba(37,99,235,0.35)",
                          boxSizing: "border-box",
                        }}
                      >
                        Aplicar filtros
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <span
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  color: mutedColor,
                  flexShrink: 0,
                  whiteSpace: "nowrap",
                  paddingLeft: "16px",
                  borderLeft: `1px solid ${dividerColor}`,
                  lineHeight: 1.3,
                }}
              >
                {filtered.length} registros
              </span>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px", paddingTop: "12px" }}>
            {filtered.length === 0 ? (
              <div style={{ ...glass, padding: "48px", textAlign: "center" }}>
                <Trophy size={36} color={mutedColor} style={{ marginBottom: "12px", opacity: 0.5 }} />
                <p style={{ margin: 0, color: mutedColor, fontSize: "0.95rem", fontWeight: 600 }}>
                  Nenhuma premiação registrada.
                </p>
              </div>
            ) : (
              filtered.map((award) => {
                const IconComp = CATEGORY_ICON[award.category];
                const categoryColor = CATEGORY_COLOR[award.category];
                const placementColor = award.placement
                  ? PLACEMENT_COLOR[award.placement]
                  : mutedColor;

                const footerBtn: CSSProperties = {
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "8px 14px",
                  borderRadius: "12px",
                  border: `1px solid ${dividerColor}`,
                  background: "transparent",
                  cursor: "pointer",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                };

                return (
                  <div
                    key={award.recordId}
                    style={{
                      ...glass,
                      padding: 0,
                      display: "flex",
                      flexDirection: "column",
                      overflow: "hidden",
                    }}
                    className={styles.healthCard}
                  >
                    <div
                      style={{
                        display: "flex",
                        gap: "16px",
                        alignItems: "flex-start",
                        padding: "20px",
                      }}
                    >
                      <div
                        style={{
                          width: "48px",
                          height: "48px",
                          borderRadius: "16px",
                          backgroundColor: `${categoryColor}1a`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <IconComp size={22} color={categoryColor} />
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: "8px",
                            marginBottom: "6px",
                            flexWrap: "wrap",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                            <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 800, color: textColor }}>
                              {award.title === DEFAULT_AWARD_CATALOG_NAME ? "—" : award.title}
                            </h4>
                            {award.placement ? (
                              <span
                                style={{
                                  padding: "2px 10px",
                                  borderRadius: "999px",
                                  fontSize: "0.6rem",
                                  fontWeight: 700,
                                  textTransform: "uppercase",
                                  letterSpacing: "0.06em",
                                  backgroundColor: `${placementColor}1a`,
                                  color: placementColor,
                                  border: `1px solid ${placementColor}33`,
                                }}
                              >
                                {AWARD_PLACEMENT_PT[award.placement]}
                              </span>
                            ) : null}
                          </div>
                          {award.prizeValue ? (
                            <span
                              style={{
                                fontSize: "0.9rem",
                                fontWeight: 900,
                                color: "#10b981",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {formatBRL(award.prizeValue)}
                            </span>
                          ) : null}
                        </div>

                      <p style={{ margin: "0 0 10px", fontSize: "0.83rem", color: mutedColor, lineHeight: 1.5 }}>
                        {award.organization}
                      </p>

                      {award.userNotes ? (
                        <div style={{ marginBottom: "10px", fontSize: "0.75rem", color: mutedColor }}>
                          <strong style={{ color: textColor }}>Observações:</strong> {award.userNotes}
                        </div>
                      ) : null}

                      {award.attachmentUrl ? (
                        <div style={{ marginBottom: "10px", fontSize: "0.75rem" }}>
                          <strong style={{ color: textColor }}>Anexo:</strong>{" "}
                          <a
                            href={award.attachmentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: "#3b82f6" }}
                          >
                            {award.attachmentUrl}
                          </a>
                        </div>
                      ) : null}

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "16px",
                          flexWrap: "wrap",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "5px",
                            fontSize: "0.75rem",
                            color: mutedColor,
                          }}
                        >
                          <Activity size={12} color={mutedColor} />
                          {award.horseName}
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "5px",
                            fontSize: "0.75rem",
                            color: mutedColor,
                          }}
                        >
                          <Calendar size={12} color={mutedColor} />
                          {formatDate(award.date)}
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "5px",
                            fontSize: "0.75rem",
                            color: mutedColor,
                          }}
                        >
                          <Medal size={12} color={mutedColor} />
                          {AWARD_CATEGORY_PT[award.category]}
                        </div>
                      </div>
                    </div>
                    </div>

                    <div
                      style={{
                        borderTop: `1px solid ${dividerColor}`,
                        padding: "12px 20px",
                        display: "flex",
                        justifyContent: "flex-end",
                        alignItems: "center",
                        gap: "8px",
                        flexWrap: "wrap",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => openEditModal(award)}
                        style={{ ...footerBtn, color: mutedColor }}
                      >
                        <Pencil size={16} aria-hidden />
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(award)}
                        style={{ ...footerBtn, color: "#f87171", borderColor: "rgba(248,113,113,0.35)" }}
                      >
                        <Trash2 size={16} aria-hidden />
                        Excluir
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
      )}

      {showModal && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "20px",
            paddingBottom: "48px",
            maxWidth: "520px",
            margin: "0 auto",
            width: "100%",
            boxSizing: "border-box",
          }}
        >
          <button
            type="button"
            disabled={saving}
            onClick={closeAwardForm}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              alignSelf: "flex-start",
              padding: "10px 14px",
              borderRadius: "14px",
              border: `1px solid ${dividerColor}`,
              background: isDark ? "rgba(255,255,255,0.04)" : "#ffffff",
              color: textColor,
              fontSize: "0.85rem",
              fontWeight: 700,
              cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.7 : 1,
            }}
          >
            <ArrowLeft size={18} aria-hidden />
            Voltar à lista
          </button>

          <div
            style={{
              ...glassDark,
              position: "relative",
              width: "100%",
              borderRadius: "28px",
              padding: "32px",
              boxSizing: "border-box",
            }}
          >
            <h3 style={{ margin: "0 0 24px", fontSize: "1.4rem", fontWeight: 900, color: textColor }}>
              {editingRecord ? "Editar premiação" : "Nova premiação"}
            </h3>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: mutedColor,
                    marginBottom: "6px",
                  }}
                >
                  Cavalo
                </label>
                <select
                  required
                  disabled={!!editingRecord}
                  value={form.horseId}
                  onChange={(ev) => patchForm({ horseId: ev.target.value })}
                  style={inputStyle}
                >
                  {horses.map((horse) => (
                    <option key={horse.id} value={horse.id}>
                      {horse.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: mutedColor,
                    marginBottom: "6px",
                  }}
                >
                  Categoria
                </label>
                <select
                  required
                  value={form.category}
                  onChange={(ev) => patchForm({ category: ev.target.value as AwardRecord["category"] })}
                  style={inputStyle}
                >
                  {ALL_AWARD_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {AWARD_CATEGORY_PT[category]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: mutedColor,
                    marginBottom: "6px",
                  }}
                >
                  Título da premiação (opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex.: Grande Prêmio Nacional"
                  value={form.title}
                  onChange={(ev) => patchForm({ title: ev.target.value })}
                  style={inputStyle}
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: mutedColor,
                    marginBottom: "6px",
                  }}
                >
                  Organização
                </label>
                <input
                  type="text"
                  placeholder="Associação ou evento"
                  value={form.organization}
                  onChange={(ev) => patchForm({ organization: ev.target.value })}
                  style={inputStyle}
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: mutedColor,
                    marginBottom: "6px",
                  }}
                >
                  Data
                </label>
                <input
                  required
                  type="date"
                  value={form.date}
                  onChange={(ev) => patchForm({ date: ev.target.value })}
                  style={inputStyle}
                />
              </div>

              <textarea
                placeholder="Observações sobre a conquista"
                value={form.userNotes}
                onChange={(ev) => patchForm({ userNotes: ev.target.value })}
                style={{ ...inputStyle, minHeight: "100px", resize: "vertical" }}
              />
              <input
                type="url"
                placeholder="URL do certificado ou anexo"
                value={form.attachmentUrl}
                onChange={(ev) => patchForm({ attachmentUrl: ev.target.value })}
                style={inputStyle}
              />

              <div
                style={{
                  marginTop: "4px",
                  paddingTop: "14px",
                  borderTop: `1px solid ${dividerColor}`,
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                  width: "100%",
                  boxSizing: "border-box",
                }}
              >
                <div style={{ width: "100%" }}>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "12px",
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      color: mutedColor,
                      marginBottom: "6px",
                    }}
                  >
                    <span>Colocação</span>
                    <span
                      style={{
                        fontSize: "0.62rem",
                        fontWeight: 600,
                        textTransform: "none",
                        letterSpacing: "0.04em",
                        color: mutedColor,
                        opacity: 0.85,
                        flexShrink: 0,
                      }}
                    >
                      opcional
                    </span>
                  </label>
                  <select
                    value={form.placement}
                    onChange={(ev) => {
                      const v = ev.target.value;
                      patchForm({
                        placement: (v === "" ? "" : v) as AwardFormPlacement,
                      });
                    }}
                    style={inputStyle}
                  >
                    <option value="">Sem colocação</option>
                    {ALL_AWARD_PLACEMENTS.map((placement) => (
                      <option key={placement} value={placement}>
                        {AWARD_PLACEMENT_PT[placement]}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ width: "100%" }}>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "12px",
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      color: mutedColor,
                      marginBottom: "6px",
                    }}
                  >
                    <span>Valor do prêmio</span>
                    <span
                      style={{
                        fontSize: "0.62rem",
                        fontWeight: 600,
                        textTransform: "none",
                        letterSpacing: "0.04em",
                        color: mutedColor,
                        opacity: 0.85,
                        flexShrink: 0,
                      }}
                    >
                      opcional
                    </span>
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="R$ 0,00"
                    value={brlMaskDisplayFromDigits(form.prizeDigits)}
                    onChange={(ev) => {
                      const d = ev.target.value.replace(/\D/g, "").slice(0, MAX_PRIZE_DIGITS);
                      patchForm({ prizeDigits: d });
                    }}
                    style={inputStyle}
                  />
                </div>
              </div>

              {saveError && (
                <p style={{ margin: 0, fontSize: "0.85rem", color: "#f87171" }} role="alert">
                  {saveError}
                </p>
              )}

              <button
                type="submit"
                disabled={saving}
                style={{
                  marginTop: "8px",
                  width: "100%",
                  padding: "14px 0",
                  borderRadius: "16px",
                  border: "none",
                  backgroundColor: saving ? "#64748b" : "#f59e0b",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: "0.95rem",
                  cursor: saving ? "not-allowed" : "pointer",
                  boxShadow: "0 4px 16px rgba(245,158,11,0.35)",
                  boxSizing: "border-box",
                }}
              >
                {saving ? "Salvando…" : editingRecord ? "Atualizar" : "Salvar premiação"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
