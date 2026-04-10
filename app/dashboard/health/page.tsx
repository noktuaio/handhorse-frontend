"use client";

import { useState, useRef, useEffect, useCallback, type CSSProperties, type FormEvent } from "react";
import {
  HeartPulse,
  Plus,
  Filter,
  Calendar,
  Activity,
  X,
  Syringe,
  Stethoscope,
  Pill,
  Scissors,
  Bug,
  ChevronDown,
  Check,
  Pencil,
  Trash2,
  ArrowLeft,
} from "lucide-react";
import { useTheme } from "@/shared/ui/theme-context";
import { mapApiAnimalToHorse } from "@/shared/domain/dashboard/map-api-animal";
import type { Horse } from "@/shared/domain/dashboard/index";
import {
  createAnimalExamApi,
  deleteAnimalExamApi,
  listAnimalsApi,
  listExamTypesApi,
  presignExamAttachmentApi,
  putImageToPresignedUrl,
  updateAnimalExamApi,
  type ApiExamTypeRow,
} from "@/shared/infrastructure/animals/animals-api";
import {
  loadExamRowsForHorses,
  type ExamRowWithHorse,
} from "@/shared/infrastructure/animals/exams-aggregate";
import { useNavLoadingSetter } from "../nav-loading-context";
import { useScrollLock } from "@/shared/ui/use-scroll-lock";
import styles from "../shell.module.css";

// ── UI helpers ────────────────────────────────────────────────────────────────

function normalizeDateInput(iso: string): string {
  if (!iso) return "";
  return iso.split("T")[0] ?? iso;
}

function formatDate(iso: string) {
  const d = normalizeDateInput(iso);
  if (!d) return "—";
  return new Date(d + "T12:00:00").toLocaleDateString("pt-BR");
}

function examIconAndColor(examTypeName: string): { Icon: typeof HeartPulse; color: string } {
  const n = examTypeName.toLowerCase();
  if (n.includes("vacin")) return { Icon: Syringe, color: "#10b981" };
  if (n.includes("consult") || n.includes("clín") || n.includes("veterin")) {
    return { Icon: Stethoscope, color: "#3b82f6" };
  }
  if (n.includes("vermif")) return { Icon: Bug, color: "#f59e0b" };
  if (n.includes("medic")) return { Icon: Pill, color: "#8b5cf6" };
  if (n.includes("cirurg")) return { Icon: Scissors, color: "#f43f5e" };
  return { Icon: HeartPulse, color: "#64748b" };
}

type ExamFormState = {
  horseId: string;
  examTypeId: string;
  examDate: string;
  result: string;
  labName: string;
  validUntil: string;
};

function emptyExamForm(defaultHorseId: string): ExamFormState {
  const today = new Date().toISOString().split("T")[0] ?? "";
  return {
    horseId: defaultHorseId,
    examTypeId: "",
    examDate: today,
    result: "",
    labName: "",
    validUntil: "",
  };
}

// ── component ─────────────────────────────────────────────────────────────────

export default function HealthPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [horses, setHorses] = useState<Horse[]>([]);
  const [examTypes, setExamTypes] = useState<ApiExamTypeRow[]>([]);
  const [records, setRecords] = useState<ExamRowWithHorse[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [filterHorse, setFilterHorse] = useState<string>("all");
  const [filterExamTypeId, setFilterExamTypeId] = useState<string>("all");
  const [showModal, setShowModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ExamRowWithHorse | null>(null);
  const [form, setForm] = useState<ExamFormState>(() => emptyExamForm(""));

  const [showFilter, setShowFilter] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [removeAttachment, setRemoveAttachment] = useState(false);
  const [hadAttachmentWhenEdit, setHadAttachmentWhenEdit] = useState(false);
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
    const typeMap = new Map(examTypes.map((t) => [t.id, t.name]));
    const items = await loadExamRowsForHorses(horses, typeMap);
    items.sort((a, b) => new Date(b.examDate).getTime() - new Date(a.examDate).getTime());
    setRecords(items);
  }, [horses, examTypes]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoadError(null);
        setLoading(true);
        const [animalRows, types] = await Promise.all([listAnimalsApi(), listExamTypesApi()]);
        if (cancelled) return;
        const mappedHorses = animalRows.map(mapApiAnimalToHorse);
        const typeMap = new Map(types.map((t) => [t.id, t.name]));
        const items = await loadExamRowsForHorses(mappedHorses, typeMap);
        items.sort((a, b) => new Date(b.examDate).getTime() - new Date(a.examDate).getTime());
        setHorses(mappedHorses);
        setExamTypes(types);
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
      setNavLoading({ message: "Estamos carregando os registros de saúde para você" });
    } else {
      setNavLoading(null);
    }
    return () => setNavLoading(null);
  }, [loading, setNavLoading]);

  useEffect(() => {
    if (!showFilter) return;
    function onDown(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setShowFilter(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [showFilter]);

  const filtered = records
    .filter((r) => filterHorse === "all" || r.animalId === filterHorse)
    .filter((r) => filterExamTypeId === "all" || r.examTypeId === filterExamTypeId);

  const activeCount = (filterHorse !== "all" ? 1 : 0) + (filterExamTypeId !== "all" ? 1 : 0);

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
    boxSizing: "border-box" as const,
  };

  const textColor = isDark ? "#E5E7EB" : "#0f172a";
  const mutedColor = isDark ? "#9CA3AF" : "#64748b";
  const dividerColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(148,163,184,0.18)";

  const cardFooterBtn: CSSProperties = {
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

  function openNewModal() {
    setSaveError(null);
    setEditingRecord(null);
    setForm(emptyExamForm(horses[0]?.id ?? ""));
    setAttachmentFile(null);
    setRemoveAttachment(false);
    setHadAttachmentWhenEdit(false);
    if (attachmentInputRef.current) attachmentInputRef.current.value = "";
    setShowModal(true);
  }

  function openEditModal(rec: ExamRowWithHorse) {
    setSaveError(null);
    setEditingRecord(rec);
    setForm({
      horseId: rec.animalId,
      examTypeId: rec.examTypeId,
      examDate: normalizeDateInput(rec.examDate),
      result: rec.result ?? "",
      labName: rec.labName ?? "",
      validUntil: rec.validUntil ? normalizeDateInput(rec.validUntil) : "",
    });
    setAttachmentFile(null);
    setRemoveAttachment(false);
    setHadAttachmentWhenEdit(Boolean(rec.attachmentUrl?.trim()));
    if (attachmentInputRef.current) attachmentInputRef.current.value = "";
    setShowModal(true);
  }

  function patchForm(fields: Partial<ExamFormState>) {
    setForm((prev) => ({ ...prev, ...fields }));
  }

  function resetFilters() {
    setFilterHorse("all");
    setFilterExamTypeId("all");
    setShowFilter(false);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaveError(null);
    if (!form.horseId) {
      setSaveError("Selecione o animal.");
      return;
    }
    if (!form.examTypeId) {
      setSaveError("Selecione o tipo de exame.");
      return;
    }
    if (!form.examDate?.trim()) {
      setSaveError("Informe a data do exame.");
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        examTypeId: form.examTypeId,
        examDate: form.examDate,
        result: form.result.trim() || null,
        labName: form.labName.trim() || null,
        validUntil: form.validUntil.trim() || null,
      };
      const targetAnimalId = editingRecord ? editingRecord.animalId : form.horseId;
      if (removeAttachment) {
        payload.attachmentS3Key = null;
        payload.attachmentUrl = null;
      } else if (attachmentFile) {
        const { uploadUrl, key } = await presignExamAttachmentApi(targetAnimalId, attachmentFile.type);
        await putImageToPresignedUrl(uploadUrl, attachmentFile, attachmentFile.type);
        payload.attachmentS3Key = key;
        payload.attachmentUrl = null;
      }
      if (editingRecord) {
        await updateAnimalExamApi(editingRecord.animalId, editingRecord.id, payload);
      } else {
        await createAnimalExamApi(form.horseId, payload);
      }
      await refreshRecords();
      setShowModal(false);
      setEditingRecord(null);
      setForm(emptyExamForm(horses[0]?.id ?? ""));
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(rec: ExamRowWithHorse) {
    if (!window.confirm(`Excluir este registro de exame (${rec.examTypeName} — ${rec.horseName})?`)) {
      return;
    }
    try {
      await deleteAnimalExamApi(rec.animalId, rec.id);
      await refreshRecords();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Não foi possível excluir.");
    }
  }

  function closeExamForm() {
    if (saving) return;
    setShowModal(false);
    setEditingRecord(null);
    setAttachmentFile(null);
    setRemoveAttachment(false);
    setHadAttachmentWhenEdit(false);
    if (attachmentInputRef.current) attachmentInputRef.current.value = "";
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
            <h2 style={{ margin: 0, fontSize: "1.75rem", fontWeight: 900, letterSpacing: "-0.03em", color: textColor }}>
              Saúde e bem-estar
            </h2>
            <p style={{ margin: "4px 0 0", fontSize: "0.9rem", color: mutedColor }}>
              Exames e procedimentos por animal (dados da API).
            </p>
          </div>
          <button
            type="button"
            onClick={openNewModal}
            disabled={loading || horses.length === 0 || examTypes.length === 0}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "12px 22px",
              borderRadius: "16px",
              border: "none",
              backgroundColor: horses.length && examTypes.length ? "#f43f5e" : "#64748b",
              color: "#fff",
              fontWeight: 700,
              fontSize: "0.9rem",
              cursor: horses.length && examTypes.length ? "pointer" : "not-allowed",
              boxShadow: "0 4px 16px rgba(244,63,94,0.35)",
              flexShrink: 0,
              whiteSpace: "nowrap",
            }}
          >
            <Plus size={18} />
            Registrar procedimento
          </button>
        </div>

        {!loading && horses.length === 0 && (
          <p style={{ margin: 0, fontSize: "0.9rem", color: mutedColor }}>
            Cadastre animais no registro para passar a registrar exames.
          </p>
        )}
        {!loading && horses.length > 0 && examTypes.length === 0 && (
          <p style={{ margin: 0, fontSize: "0.9rem", color: mutedColor }}>
            Não há tipos de exame no catálogo. Use a API (POST /exam-types) ou rode as migrações com seed de tipos.
          </p>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
          {[
            { label: "Procedimentos", value: String(records.length), color: "#3b82f6", bg: "rgba(59,130,246,0.1)" },
            { label: "Tipos de exame", value: String(examTypes.length), color: "#8b5cf6", bg: "rgba(139,92,246,0.1)" },
            { label: "Exibindo", value: String(filtered.length), color: "#10b981", bg: "rgba(16,185,129,0.1)" },
          ].map(({ label, value, color, bg }) => (
            <div key={label} style={{ ...glass, padding: "16px 14px" }}>
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "10px",
                  backgroundColor: bg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "10px",
                }}
              >
                <HeartPulse size={16} color={color} />
              </div>
              <p
                style={{
                  margin: "0 0 2px",
                  fontSize: "0.55rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: mutedColor,
                }}
              >
                {label}
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: "1rem",
                  fontWeight: 900,
                  color: textColor,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {value}
              </p>
            </div>
          ))}
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
              {horses.find((h) => h.id === filterHorse)?.name}
              <button
                type="button"
                onClick={() => setFilterHorse("all")}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", color: "#3b82f6" }}
                aria-label="Limpar filtro"
              >
                <X size={12} />
              </button>
            </span>
          )}
          {filterExamTypeId !== "all" && (
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "7px 12px",
                borderRadius: "999px",
                backgroundColor: "rgba(139,92,246,0.12)",
                border: "1px solid rgba(139,92,246,0.35)",
                fontSize: "0.72rem",
                fontWeight: 700,
                color: "#8b5cf6",
              }}
            >
              {examTypes.find((t) => t.id === filterExamTypeId)?.name ?? "Tipo"}
              <button
                type="button"
                onClick={() => setFilterExamTypeId("all")}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", color: "#8b5cf6" }}
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
            <HeartPulse size={18} color="#f43f5e" />
            <h3 style={{ margin: 0, fontSize: "0.9rem", fontWeight: 700, color: textColor }}>Procedimentos</h3>
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "10px" }}>
              <div ref={filterRef} style={{ position: "relative", zIndex: 4 }}>
                <button
                  type="button"
                  onClick={() => setShowFilter((v) => !v)}
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
                    style={{ transition: "transform 0.2s", transform: showFilter ? "rotate(180deg)" : "rotate(0deg)" }}
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
                        animation: "slideUp 0.18s cubic-bezier(.22,.8,.34,1) both",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "18px" }}>
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
                        {[{ id: "all", name: "Todos os animais" }, ...horses].map((h) => {
                          const active = filterHorse === h.id;
                          return (
                            <button
                              key={h.id}
                              type="button"
                              onClick={() => setFilterHorse(h.id)}
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
                                fontWeight: active ? 700 : 500,
                                backgroundColor: active
                                  ? isDark
                                    ? "rgba(59,130,246,0.18)"
                                    : "rgba(59,130,246,0.1)"
                                  : "transparent",
                                color: active ? "#3b82f6" : isDark ? "#E5E7EB" : "#374151",
                                transition: "all 0.12s",
                              }}
                            >
                              {h.name}
                              {active && <Check size={14} color="#3b82f6" />}
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
                        Tipo de exame
                      </p>
                      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                        {[{ id: "all", name: "Todos os tipos" }, ...examTypes].map((t) => {
                          const active = filterExamTypeId === t.id;
                          const color = t.id === "all" ? "#8b5cf6" : "#8b5cf6";
                          return (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => setFilterExamTypeId(t.id)}
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
                                fontWeight: active ? 700 : 500,
                                backgroundColor: active ? `${color}1a` : "transparent",
                                color: active ? color : isDark ? "#E5E7EB" : "#374151",
                                transition: "all 0.12s",
                              }}
                            >
                              {t.name}
                              {active && <Check size={14} color={color} />}
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
              <span style={{ fontSize: "0.72rem", fontWeight: 600, color: mutedColor }}>{filtered.length} registros</span>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px", paddingTop: "12px" }}>
            {loading ? (
              <div style={{ ...glass, padding: "48px", textAlign: "center" }}>
                <p style={{ margin: 0, color: mutedColor, fontSize: "0.95rem", fontWeight: 600 }}>Carregando…</p>
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ ...glass, padding: "48px", textAlign: "center" }}>
                <HeartPulse size={36} color={mutedColor} style={{ marginBottom: "12px", opacity: 0.5 }} />
                <p style={{ margin: 0, color: mutedColor, fontSize: "0.95rem", fontWeight: 600 }}>Nenhum registro encontrado.</p>
              </div>
            ) : (
              filtered.map((rec) => {
                const { Icon: IconComp, color } = examIconAndColor(rec.examTypeName);
                return (
                  <div
                    key={rec.id}
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
                          backgroundColor: `${color}1a`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <IconComp size={22} color={color} />
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            marginBottom: "6px",
                            flexWrap: "wrap",
                          }}
                        >
                          <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 800, color: textColor }}>{rec.examTypeName}</h4>
                          <span
                            style={{
                              padding: "2px 10px",
                              borderRadius: "999px",
                              fontSize: "0.6rem",
                              fontWeight: 700,
                              textTransform: "uppercase",
                              letterSpacing: "0.06em",
                              backgroundColor: `${color}1a`,
                              color,
                              border: `1px solid ${color}33`,
                            }}
                          >
                            {rec.horseName}
                          </span>
                        </div>

                        <p style={{ margin: "0 0 10px", fontSize: "0.83rem", color: mutedColor, lineHeight: 1.5 }}>
                          {rec.result?.trim() ? rec.result : "Sem observações registradas."}
                        </p>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "10px" }}>
                          <div style={{ fontSize: "0.75rem", color: mutedColor }}>
                            <strong style={{ color: textColor }}>Laboratório:</strong> {rec.labName || "—"}
                          </div>
                          <div style={{ fontSize: "0.75rem", color: mutedColor }}>
                            <strong style={{ color: textColor }}>Válido até:</strong>{" "}
                            {rec.validUntil ? formatDate(rec.validUntil) : "—"}
                          </div>
                          <div
                            style={{
                              fontSize: "0.75rem",
                              color: mutedColor,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              gridColumn: "1 / -1",
                            }}
                          >
                            <strong style={{ color: textColor }}>Comprovante:</strong>{" "}
                            {rec.attachmentUrl ? (
                              <a
                                href={rec.attachmentUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: "#3b82f6", fontWeight: 600 }}
                              >
                                Ver ficheiro
                              </a>
                            ) : (
                              "—"
                            )}
                          </div>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "0.75rem", color: mutedColor }}>
                            <Activity size={12} color={mutedColor} />
                            {rec.horseBreed || "—"}
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "0.75rem", color: mutedColor }}>
                            <Calendar size={12} color={mutedColor} />
                            {formatDate(rec.examDate)}
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
                        onClick={() => openEditModal(rec)}
                        style={{ ...cardFooterBtn, color: mutedColor }}
                      >
                        <Pencil size={16} aria-hidden />
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(rec)}
                        style={{
                          ...cardFooterBtn,
                          color: "#f87171",
                          borderColor: "rgba(248,113,113,0.35)",
                        }}
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
            onClick={closeExamForm}
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
              {editingRecord ? "Editar exame" : "Novo registro de saúde"}
            </h3>

            <form onSubmit={(e) => void handleSubmit(e)} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
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
                  Animal
                </label>
                <select
                  required
                  disabled={Boolean(editingRecord)}
                  value={form.horseId}
                  onChange={(e) => patchForm({ horseId: e.target.value })}
                  style={{ ...inputStyle, opacity: editingRecord ? 0.7 : 1 }}
                >
                  {horses.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name}
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
                  Tipo de exame
                </label>
                <select
                  required
                  value={form.examTypeId}
                  onChange={(e) => patchForm({ examTypeId: e.target.value })}
                  style={inputStyle}
                >
                  <option value="">Selecione…</option>
                  {examTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
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
                  Data do exame
                </label>
                <input type="date" required value={form.examDate} onChange={(e) => patchForm({ examDate: e.target.value })} style={inputStyle} />
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
                  Resultado / observações
                </label>
                <textarea
                  placeholder="Descreva o resultado ou observações…"
                  value={form.result}
                  onChange={(e) => patchForm({ result: e.target.value })}
                  style={{ ...inputStyle, minHeight: "100px", resize: "vertical" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <input
                  type="text"
                  placeholder="Laboratório / clínica"
                  value={form.labName}
                  onChange={(e) => patchForm({ labName: e.target.value })}
                  style={inputStyle}
                />
                <input
                  type="date"
                  placeholder="Válido até"
                  value={form.validUntil}
                  onChange={(e) => patchForm({ validUntil: e.target.value })}
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
                  Comprovante (opcional)
                </label>
                <input
                  ref={attachmentInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null;
                    setAttachmentFile(f);
                    if (f) setRemoveAttachment(false);
                  }}
                  style={{ ...inputStyle, padding: "10px 14px" }}
                />
                <p style={{ margin: "6px 0 0", fontSize: "0.75rem", color: mutedColor }}>
                  Imagem ou PDF. Se escolher um ficheiro novo, substitui o anterior.
                </p>
                {editingRecord && hadAttachmentWhenEdit && (
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      marginTop: "10px",
                      fontSize: "0.85rem",
                      color: textColor,
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={removeAttachment}
                      onChange={(e) => {
                        setRemoveAttachment(e.target.checked);
                        if (e.target.checked) {
                          setAttachmentFile(null);
                          if (attachmentInputRef.current) attachmentInputRef.current.value = "";
                        }
                      }}
                    />
                    Remover comprovante atual
                  </label>
                )}
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
                  backgroundColor: saving ? "#64748b" : "#f43f5e",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: "0.95rem",
                  cursor: saving ? "not-allowed" : "pointer",
                  boxShadow: "0 4px 16px rgba(244,63,94,0.35)",
                  boxSizing: "border-box",
                }}
              >
                {saving ? "Salvando…" : editingRecord ? "Salvar alterações" : "Salvar registro"}
              </button>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(10px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)    scale(1); }
        }
      `}</style>
    </>
  );
}
