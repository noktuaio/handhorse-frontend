"use client";

import { useState, useEffect, useMemo, useRef, type CSSProperties, type FormEvent } from "react";
import { Bell, Check, X } from "lucide-react";
import { useTheme } from "@/shared/ui/theme-context";
import {
  listReminderOccurrencesApi,
  patchReminderOccurrenceApi,
  presignReminderProofApi,
  putImageToPresignedUrl,
  type ApiReminderOccurrenceRow,
} from "@/shared/infrastructure/animals/animals-api";
import { useNavLoadingSetter } from "../nav-loading-context";
import { useScrollLock } from "@/shared/ui/use-scroll-lock";
function formatDate(iso: string): string {
  const day = iso.split("T")[0] ?? iso;
  return new Date(`${day}T12:00:00`).toLocaleDateString("pt-BR");
}

function isoAddDays(days: number): string {
  const n = new Date();
  n.setDate(n.getDate() + days);
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
}

function reminderTriggerLabel(kind: string): string {
  switch (kind) {
    case "animal_birth":
      return "Comunicação ao nascimento";
    case "animal_registration":
      return "Prazo de registro";
    case "exam_completed":
      return "Após exame";
    default:
      return kind;
  }
}

function reminderStatusLabel(status: string): string {
  switch (status) {
    case "done":
      return "Concluído";
    case "pending":
      return "Pendente";
    case "skipped":
      return "Ignorado";
    default:
      return status;
  }
}

function reminderStatusColor(status: string): string {
  if (status === "done") return "#10b981";
  if (status === "pending") return "#f59e0b";
  return "#94a3b8";
}

function formatCompletedAt(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

type StatusFilter = "pending" | "done" | "skipped";

export default function RemindersPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const setNavLoading = useNavLoadingSetter();
  const [rows, setRows] = useState<ApiReminderOccurrenceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [completeModalRow, setCompleteModalRow] = useState<ApiReminderOccurrenceRow | null>(null);
  const [completeNotes, setCompleteNotes] = useState("");
  const [completeFile, setCompleteFile] = useState<File | null>(null);
  const [completeError, setCompleteError] = useState<string | null>(null);
  const [completeSaving, setCompleteSaving] = useState(false);
  const proofInputRef = useRef<HTMLInputElement>(null);

  useScrollLock(completeModalRow !== null);

  const glass: CSSProperties = {
    background: isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.75)",
    border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(148,163,184,0.2)"}`,
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    boxShadow: isDark ? "0 4px 32px rgba(0,0,0,0.5)" : "0 4px 32px rgba(15,23,42,0.08)",
    borderRadius: "24px",
  };

  const textColor = isDark ? "#E5E7EB" : "#0f172a";
  const mutedColor = isDark ? "#9CA3AF" : "#64748b";
  const subBg = isDark ? "rgba(255,255,255,0.05)" : "rgba(15,23,42,0.04)";

  const query = useMemo(() => {
    const base: Parameters<typeof listReminderOccurrencesApi>[0] = {
      dueFrom: isoAddDays(-730),
      dueTo: isoAddDays(730),
      limit: 200,
      status: statusFilter,
    };
    return base;
  }, [statusFilter]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setNavLoading({ message: "Carregando compromissos…" });
      setLoading(true);
      setErr(null);
      try {
        const data = await listReminderOccurrencesApi(query);
        if (!cancelled) setRows(data);
      } catch (e) {
        if (!cancelled) {
          setErr(e instanceof Error ? e.message : "Erro ao carregar prazos.");
          setRows([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setNavLoading(null);
        }
      }
    })();
    return () => {
      cancelled = true;
      setNavLoading(null);
    };
  }, [query, setNavLoading]);

  function openCompleteModal(row: ApiReminderOccurrenceRow) {
    setCompleteError(null);
    setCompleteNotes("");
    setCompleteFile(null);
    if (proofInputRef.current) proofInputRef.current.value = "";
    setCompleteModalRow(row);
  }

  function resetCompleteModal() {
    setCompleteModalRow(null);
    setCompleteError(null);
    setCompleteNotes("");
    setCompleteFile(null);
    if (proofInputRef.current) proofInputRef.current.value = "";
  }

  function closeCompleteModal() {
    if (completeSaving) return;
    resetCompleteModal();
  }

  async function submitComplete(e: FormEvent) {
    e.preventDefault();
    if (!completeModalRow) return;
    setCompleteError(null);
    setCompleteSaving(true);
    try {
      let proofS3Key: string | undefined;
      if (completeFile) {
        const { uploadUrl, key } = await presignReminderProofApi(completeModalRow.id, completeFile.type);
        await putImageToPresignedUrl(uploadUrl, completeFile, completeFile.type);
        proofS3Key = key;
      }
      const body: Parameters<typeof patchReminderOccurrenceApi>[1] = {
        status: "done",
        notes: completeNotes.trim() || null,
      };
      if (proofS3Key) body.proofS3Key = proofS3Key;
      await patchReminderOccurrenceApi(completeModalRow.id, body);
      setRows((prev) => prev.filter((r) => r.id !== completeModalRow.id));
      resetCompleteModal();
    } catch (err) {
      setCompleteError(err instanceof Error ? err.message : "Não foi possível concluir.");
    } finally {
      setCompleteSaving(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div>
        <h2 style={{ margin: 0, fontSize: "1.75rem", fontWeight: 900, letterSpacing: "-0.03em", color: textColor }}>
          Compromissos
        </h2>
        <p style={{ margin: "4px 0 0", fontSize: "0.9rem", color: mutedColor }}>
          Lembretes gerados pelas regras das associações ligadas à raça do cavalo.
        </p>
      </div>

      <div style={{ ...glass, padding: "14px 16px", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
        {(
          [
            { id: "pending" as const, label: "Pendentes" },
            { id: "done" as const, label: "Concluídos" },
            { id: "skipped" as const, label: "Ignorados" },
          ] as const
        ).map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setStatusFilter(id)}
            style={{
              padding: "6px 12px",
              borderRadius: "999px",
              border: "none",
              fontSize: "0.72rem",
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
              background:
                statusFilter === id
                  ? isDark
                    ? "rgba(59,130,246,0.25)"
                    : "rgba(59,130,246,0.15)"
                  : subBg,
              color: statusFilter === id ? "#3b82f6" : textColor,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {err && (
        <p style={{ margin: 0, fontSize: "0.85rem", color: "#f43f5e" }} role="alert">
          {err}
        </p>
      )}

      <div style={{ ...glass, padding: "22px" }}>
        {loading ? (
          <p style={{ margin: 0, color: mutedColor }}>Carregando…</p>
        ) : rows.length === 0 ? (
          <p style={{ margin: 0, color: mutedColor }}>Nenhum registro neste filtro.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {rows.map((r) => (
              <div
                key={r.id}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "12px",
                  padding: "12px 14px",
                  borderRadius: "16px",
                  backgroundColor: subBg,
                  border: `1px solid ${isDark ? "rgba(255,255,255,0.05)" : "rgba(148,163,184,0.15)"}`,
                }}
              >
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "12px",
                    backgroundColor: "rgba(245,158,11,0.14)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Bell size={18} color="#f59e0b" aria-hidden />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: "0 0 4px", fontSize: "0.9rem", fontWeight: 700, color: textColor }}>{r.ruleTitle}</p>
                  <p style={{ margin: 0, fontSize: "0.78rem", color: mutedColor }}>
                    {r.animalName} · Vence {formatDate(r.dueDate)} · {reminderTriggerLabel(r.ruleTriggerKind)} ·{" "}
                    <span style={{ color: reminderStatusColor(r.status), fontWeight: 700 }}>
                      {reminderStatusLabel(r.status)}
                    </span>
                  </p>
                  {r.status === "done" && (r.completedAt || r.completedByEmail) && (
                    <p style={{ margin: "6px 0 0", fontSize: "0.72rem", color: mutedColor }}>
                      {r.completedAt && <>Concluído em {formatCompletedAt(r.completedAt)}</>}
                      {r.completedAt && r.completedByEmail && " · "}
                      {r.completedByEmail && <>por {r.completedByEmail}</>}
                    </p>
                  )}
                </div>
                {r.status === "pending" && (
                  <button
                    type="button"
                    onClick={() => openCompleteModal(r)}
                    disabled={completeSaving}
                    style={{
                      flexShrink: 0,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      padding: "8px 12px",
                      borderRadius: "12px",
                      border: "none",
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      background: "rgba(16,185,129,0.15)",
                      color: "#10b981",
                    }}
                  >
                    <Check size={14} aria-hidden />
                    Concluir
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {completeModalRow && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="complete-reminder-title"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            background: "rgba(0,0,0,0.45)",
          }}
          onClick={(ev) => {
            if (ev.target === ev.currentTarget) closeCompleteModal();
          }}
        >
          <div
            style={{
              ...glass,
              width: "100%",
              maxWidth: "420px",
              padding: "22px",
              position: "relative",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              aria-label="Fechar"
              onClick={closeCompleteModal}
              disabled={completeSaving}
              style={{
                position: "absolute",
                top: "14px",
                right: "14px",
                border: "none",
                background: "transparent",
                cursor: completeSaving ? "not-allowed" : "pointer",
                color: mutedColor,
                padding: "4px",
              }}
            >
              <X size={20} />
            </button>
            <h3
              id="complete-reminder-title"
              style={{ margin: "0 0 8px", fontSize: "1.1rem", fontWeight: 800, color: textColor }}
            >
              Concluir prazo
            </h3>
            <p style={{ margin: "0 0 16px", fontSize: "0.82rem", color: mutedColor }}>
              {completeModalRow.ruleTitle} · {completeModalRow.animalName}
            </p>
            <form onSubmit={submitComplete} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label
                  htmlFor="complete-notes"
                  style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: mutedColor, marginBottom: "6px" }}
                >
                  Notas (opcional)
                </label>
                <textarea
                  id="complete-notes"
                  value={completeNotes}
                  onChange={(e) => setCompleteNotes(e.target.value)}
                  rows={3}
                  placeholder="Observações sobre a conclusão…"
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    borderRadius: "12px",
                    border: `1px solid ${isDark ? "rgba(255,255,255,0.12)" : "rgba(148,163,184,0.35)"}`,
                    background: isDark ? "rgba(255,255,255,0.06)" : "#fff",
                    color: textColor,
                    padding: "10px 12px",
                    fontSize: "0.9rem",
                    fontFamily: "inherit",
                    resize: "vertical",
                  }}
                />
              </div>
              <div>
                <label
                  htmlFor="complete-proof"
                  style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: mutedColor, marginBottom: "6px" }}
                >
                  Anexo (opcional)
                </label>
                <input
                  ref={proofInputRef}
                  id="complete-proof"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
                  onChange={(e) => setCompleteFile(e.target.files?.[0] ?? null)}
                  disabled={completeSaving}
                  style={{
                    width: "100%",
                    fontSize: "0.85rem",
                    color: textColor,
                  }}
                />
              </div>
              {completeError && (
                <p style={{ margin: 0, fontSize: "0.82rem", color: "#f43f5e" }} role="alert">
                  {completeError}
                </p>
              )}
              <button
                type="submit"
                disabled={completeSaving}
                style={{
                  marginTop: "4px",
                  padding: "12px 16px",
                  borderRadius: "14px",
                  border: "none",
                  fontWeight: 700,
                  fontSize: "0.9rem",
                  cursor: completeSaving ? "wait" : "pointer",
                  fontFamily: "inherit",
                  background: completeSaving ? "#64748b" : "#10b981",
                  color: "#fff",
                }}
              >
                {completeSaving ? "A gravar…" : "Confirmar conclusão"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
