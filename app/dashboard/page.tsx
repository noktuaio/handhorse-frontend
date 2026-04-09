"use client";

import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
} from "react";
import {
  Activity,
  Check,
  ChevronDown,
  CreditCard,
  HeartPulse,
  Sparkles,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useTheme } from "@/shared/ui/theme-context";
import { mapApiAnimalToHorse } from "@/shared/domain/dashboard/map-api-animal";
import type { Transaction } from "@/shared/domain/dashboard/index";
import {
  listAnimalsApi,
  listExamTypesApi,
} from "@/shared/infrastructure/animals/animals-api";
import { listFinancialTransactionsApi } from "@/shared/infrastructure/finance/finance-api";
import {
  loadExamRowsForHorses,
  pickUpcomingExamRows,
  type ExamRowWithHorse,
} from "@/shared/infrastructure/animals/exams-aggregate";
import styles from "./shell.module.css";

// ── helpers ─────────────────────────────────────────────────────────────────

function formatK(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  return `${sign}R$ ${(abs / 1000).toFixed(1)}k`;
}

function sumByType(transactions: Transaction[], type: Transaction["type"]): number {
  return transactions.filter((t) => t.type === type).reduce((s, t) => s + t.amount, 0);
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function parseTransactionDay(dateStr: string): Date | null {
  const day = dateStr.split("T")[0] ?? dateStr;
  const parts = day.split("-").map(Number);
  const y = parts[0];
  const m = parts[1];
  const dd = parts[2];
  if (y === undefined || m === undefined || dd === undefined || !y || !m || !dd) return null;
  const t = new Date(y, m - 1, dd, 12, 0, 0, 0);
  return Number.isNaN(t.getTime()) ? null : t;
}

function transactionInRange(t: Transaction, start: Date, end: Date): boolean {
  const d = parseTransactionDay(t.date);
  if (!d) return false;
  return d >= start && d <= end;
}

type FinancePeriodPreset = "last12" | "currentYear" | "currentMonth" | "last30" | "last7";

const FINANCE_PERIOD_OPTIONS: { id: FinancePeriodPreset; label: string }[] = [
  { id: "last12", label: "Últimos 12 meses" },
  { id: "currentYear", label: "Ano corrente" },
  { id: "currentMonth", label: "Mês corrente" },
  { id: "last30", label: "Últimos 30 dias" },
  { id: "last7", label: "Últimos 7 dias" },
];

function getFinancePeriodBounds(preset: FinancePeriodPreset, now: Date): { start: Date; end: Date } {
  const end = endOfDay(now);
  switch (preset) {
    case "last7": {
      const start = startOfDay(new Date(now));
      start.setDate(start.getDate() - 6);
      return { start, end };
    }
    case "last30": {
      const start = startOfDay(new Date(now));
      start.setDate(start.getDate() - 29);
      return { start, end };
    }
    case "currentMonth": {
      const y = now.getFullYear();
      const m = now.getMonth();
      return {
        start: startOfDay(new Date(y, m, 1)),
        end: endOfDay(new Date(y, m + 1, 0)),
      };
    }
    case "currentYear": {
      const y = now.getFullYear();
      return {
        start: startOfDay(new Date(y, 0, 1)),
        end: endOfDay(new Date(y, 11, 31)),
      };
    }
    case "last12": {
      const start = startOfDay(new Date(now));
      start.setMonth(start.getMonth() - 12);
      return { start, end };
    }
    default:
      return { start: startOfDay(now), end };
  }
}

function periodIndicatorLabel(preset: FinancePeriodPreset, now: Date): string {
  const y = now.getFullYear();
  const m = now.getMonth();
  switch (preset) {
    case "last12":
      return "12 meses";
    case "currentYear":
      return String(y);
    case "currentMonth":
      return new Date(y, m, 1).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
    case "last30":
      return "30 dias";
    case "last7":
      return "7 dias";
    default:
      return "";
  }
}

function chartGranularity(preset: FinancePeriodPreset): "day" | "month" {
  if (preset === "last7" || preset === "last30" || preset === "currentMonth") return "day";
  return "month";
}

/** Pontos do gráfico: saldo (receita − despesas) por dia ou por mês. */
function buildPerformanceChartData(
  transactions: Transaction[],
  granularity: "day" | "month",
): { name: string; value: number }[] {
  const buckets: Record<string, { sortKey: string; name: string; income: number; expense: number }> = {};
  for (const t of transactions) {
    const d = parseTransactionDay(t.date);
    if (!d) continue;
    let sortKey: string;
    let name: string;
    if (granularity === "day") {
      sortKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      name = d.toLocaleDateString("pt-BR", { day: "numeric", month: "short" });
    } else {
      sortKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      name = d.toLocaleDateString("pt-BR", { month: "short" });
    }
    if (!buckets[sortKey]) buckets[sortKey] = { sortKey, name, income: 0, expense: 0 };
    if (t.type === "Income") buckets[sortKey].income += t.amount;
    else buckets[sortKey].expense += t.amount;
  }
  return Object.values(buckets)
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
    .map((b) => ({ name: b.name, value: b.income - b.expense }));
}

function formatDate(iso: string): string {
  if (!iso) return "—";
  const day = iso.split("T")[0] ?? iso;
  return new Date(`${day}T12:00:00`).toLocaleDateString("pt-BR");
}

function BirthRegistrationIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 4.5H14L18 8.5V18.5C18 19.0523 17.5523 19.5 17 19.5H7C6.44772 19.5 6 19.0523 6 18.5V5.5C6 4.94772 6.44772 4.5 7 4.5Z" stroke="#f59e0b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M14 4.5V8.5H18" stroke="#f59e0b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M9 12H15" stroke="#f59e0b" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M12 9V15" stroke="#f59e0b" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}

// ── component ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [horseCount, setHorseCount] = useState<number | null>(null);
  const [agendaLoading, setAgendaLoading] = useState(true);
  const [agendaExams, setAgendaExams] = useState<ExamRowWithHorse[]>([]);
  const [financeLoading, setFinanceLoading] = useState(true);
  const [financeTransactions, setFinanceTransactions] = useState<Transaction[]>([]);
  const [financePeriodPreset, setFinancePeriodPreset] = useState<FinancePeriodPreset>("currentYear");
  const [periodMenu, setPeriodMenu] = useState<{
    top: number;
    left: number;
    anchor: "finance" | "chart";
  } | null>(null);
  const periodMenuRef = useRef<HTMLDivElement | null>(null);
  const financePeriodBtnRef = useRef<HTMLButtonElement | null>(null);
  const chartPeriodBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setAgendaLoading(true);
        const [animalRows, types] = await Promise.all([listAnimalsApi(), listExamTypesApi()]);
        if (cancelled) return;
        const horses = animalRows.map(mapApiAnimalToHorse);
        const typeMap = new Map(types.map((t) => [t.id, t.name]));
        const allExams = await loadExamRowsForHorses(horses, typeMap);
        const upcoming = pickUpcomingExamRows(allExams, 3);
        setHorseCount(horses.length);
        setAgendaExams(upcoming);
      } catch {
        if (!cancelled) {
          setHorseCount(null);
          setAgendaExams([]);
        }
      } finally {
        if (!cancelled) setAgendaLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setFinanceLoading(true);
        const rows = await listFinancialTransactionsApi();
        if (!cancelled) setFinanceTransactions(rows);
      } catch {
        if (!cancelled) setFinanceTransactions([]);
      } finally {
        if (!cancelled) setFinanceLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /** Recalcula limites do período em cada render para “hoje” atualizar após meia-noite / troca de mês. */
  const periodBounds = useMemo(
    () => getFinancePeriodBounds(financePeriodPreset, new Date()),
    [financePeriodPreset],
  );

  const financeFiltered = useMemo(
    () => financeTransactions.filter((t) => transactionInRange(t, periodBounds.start, periodBounds.end)),
    [financeTransactions, periodBounds.start, periodBounds.end],
  );

  const totalIncome = sumByType(financeFiltered, "Income");
  const totalExpense = sumByType(financeFiltered, "Expense");
  const balance = totalIncome - totalExpense;
  const granularity = chartGranularity(financePeriodPreset);
  const chartData = buildPerformanceChartData(financeFiltered, granularity);
  const periodPillLabel = periodIndicatorLabel(financePeriodPreset, new Date());

  const openOrTogglePeriodMenu = useCallback(
    (anchor: "finance" | "chart") => (e: ReactMouseEvent<HTMLButtonElement>) => {
      const r = e.currentTarget.getBoundingClientRect();
      const menuWidth = 240;
      let left = r.left;
      if (left + menuWidth > window.innerWidth - 8) left = Math.max(8, window.innerWidth - menuWidth - 8);
      const next = { top: r.bottom + 6, left, anchor };
      setPeriodMenu((prev) => (prev?.anchor === anchor ? null : next));
    },
    [],
  );

  useEffect(() => {
    if (!periodMenu) return;
    const onKey = (ev: globalThis.KeyboardEvent) => {
      if (ev.key === "Escape") setPeriodMenu(null);
    };
    document.addEventListener("keydown", onKey);
    let onDown: ((ev: globalThis.MouseEvent) => void) | undefined;
    const t = window.setTimeout(() => {
      onDown = (ev: globalThis.MouseEvent) => {
        const t = ev.target as Node;
        if (periodMenuRef.current?.contains(t)) return;
        if (financePeriodBtnRef.current?.contains(t)) return;
        if (chartPeriodBtnRef.current?.contains(t)) return;
        setPeriodMenu(null);
      };
      document.addEventListener("mousedown", onDown);
    }, 0);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("keydown", onKey);
      if (onDown) document.removeEventListener("mousedown", onDown);
    };
  }, [periodMenu]);

  // Styles
  const glass: CSSProperties = {
    background: isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.75)",
    border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(148,163,184,0.2)"}`,
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    boxShadow: isDark
      ? "0 4px 32px rgba(0,0,0,0.5)"
      : "0 4px 32px rgba(15,23,42,0.08)",
    borderRadius: "24px",
  };

  const periodPillStyle: CSSProperties = {
    ...glass,
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "4px 10px",
    borderRadius: "999px",
    fontSize: "0.7rem",
    fontWeight: 700,
    color: "#3b82f6",
    cursor: "pointer",
    border: "none",
    fontFamily: "inherit",
    boxSizing: "border-box",
  };

  const textColor = isDark ? "#E5E7EB" : "#0f172a";
  const mutedColor = isDark ? "#9CA3AF" : "#64748b";
  const subBg = isDark ? "rgba(255,255,255,0.05)" : "rgba(15,23,42,0.04)";

  const financials = [
    { label: "Receita", value: formatK(totalIncome), color: "#10b981" },
    { label: "Gastos", value: formatK(totalExpense), color: "#f43f5e" },
    { label: "Lucro", value: formatK(balance), color: "#8b5cf6" },
  ];

  // Chart tooltip style
  const tooltipStyle: CSSProperties = {
    backgroundColor: isDark ? "rgba(15,23,42,0.95)" : "rgba(255,255,255,0.95)",
    border: "none",
    borderRadius: "16px",
    boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
    color: textColor,
    fontWeight: 700,
    fontSize: "0.85rem",
  };

  const agendaItems = [
    {
      id: "birth-registration",
      title: "Registro de nascimento na associação",
      subtitle: "Potro Aurora · Prazo até 25/06/2026",
      iconBg: "rgba(245,158,11,0.14)",
      icon: <BirthRegistrationIcon />,
    },
    ...(agendaLoading
      ? []
      : agendaExams.map((rec) => {
          const ref = rec.validUntil?.trim() || rec.examDate;
          return {
            id: `exam-${rec.id}`,
            title: rec.horseName,
            subtitle: `${rec.examTypeName} · ${formatDate(ref)}`,
            iconBg: "rgba(244,63,94,0.12)",
            icon: <HeartPulse size={18} color="#f43f5e" />,
          };
        })),
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "32px", paddingBottom: "48px" }}>
      {/* ── Page heading ── */}
      <div>
        <h2 style={{ margin: 0, fontSize: "1.75rem", fontWeight: 900, letterSpacing: "-0.03em", color: textColor }}>
          Painel de Controle
        </h2>
        <p style={{ margin: "4px 0 0", fontSize: "0.9rem", color: mutedColor }}>
          Visão geral do haras HandHorse
        </p>
      </div>

      {/* ── Agendas e Compromissos (primeiro card) ── */}
      <div style={{ ...glass, padding: "22px" }}>
        <p
          style={{
            margin: "0 0 18px",
            fontSize: "0.65rem",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.14em",
            color: mutedColor,
          }}
        >
          Agendas e Compromissos
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {agendaItems.map((item) => {
            return (
              <div
                key={item.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "10px 12px",
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
                    backgroundColor: item.iconBg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {item.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      margin: "0 0 2px",
                      fontSize: "0.85rem",
                      fontWeight: 700,
                      color: textColor,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {item.title}
                  </p>
                  <p style={{ margin: 0, fontSize: "0.72rem", color: mutedColor }}>
                    {item.subtitle}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className={styles.topStatsGrid}>
        {/* Cavalos */}
        <div style={{ ...glass, padding: "20px" }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "14px",
              backgroundColor: "rgba(59,130,246,0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "14px",
            }}
          >
            <Activity size={20} color="#3b82f6" />
          </div>
          <p style={{ margin: "0 0 2px", fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: mutedColor }}>
            Cavalos
          </p>
          <p style={{ margin: 0, fontSize: "1.3rem", fontWeight: 900, color: textColor }}>
            {agendaLoading ? "…" : horseCount ?? "—"}
          </p>
        </div>

        {/* Financeiro — combined card */}
        <div style={{ ...glass, padding: "16px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "8px",
              marginBottom: "14px",
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "10px",
                  backgroundColor: "rgba(139,92,246,0.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <CreditCard size={16} color="#8b5cf6" />
              </div>
              <p style={{ margin: 0, fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: mutedColor }}>
                Financeiro
              </p>
            </div>
            <button
              ref={financePeriodBtnRef}
              type="button"
              style={periodPillStyle}
              onClick={openOrTogglePeriodMenu("finance")}
              aria-haspopup="menu"
              aria-expanded={periodMenu !== null}
              aria-label="Período financeiro"
            >
              {financeLoading ? "…" : periodPillLabel}
              <ChevronDown size={14} color="#3b82f6" aria-hidden />
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "4px" }}>
            {financials.map(({ label, value, color }, idx) => (
              <div
                key={label}
                style={{
                  paddingLeft: idx > 0 ? "8px" : 0,
                  borderLeft: idx > 0 ? `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(148,163,184,0.2)"}` : "none",
                }}
              >
                <p style={{
                  margin: "0 0 4px",
                  fontSize: "0.52rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color,
                  lineHeight: 1.3,
                }}>
                  {label}
                </p>
                <p style={{ margin: 0, fontSize: "0.85rem", fontWeight: 900, color: textColor, whiteSpace: "nowrap" }}>
                  {financeLoading ? "…" : value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Chart + Right column ── */}
      <div className={styles.contentGrid}>
        {/* Financial chart */}
        <div style={{ ...glass, padding: "28px 24px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "24px",
            }}
          >
            <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: textColor }}>
              Performance Financeira
            </h3>
            <button
              ref={chartPeriodBtnRef}
              type="button"
              style={periodPillStyle}
              onClick={openOrTogglePeriodMenu("chart")}
              aria-haspopup="menu"
              aria-expanded={periodMenu !== null}
              aria-label="Período financeiro"
            >
              {financeLoading ? "…" : periodPillLabel}
              <ChevronDown size={14} color="#3b82f6" aria-hidden />
            </button>
          </div>

          <div style={{ height: "280px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke={isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}
                />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: mutedColor, fontSize: 12, fontWeight: 600 }}
                  dy={10}
                />
                <YAxis hide />
                <Tooltip
                  contentStyle={tooltipStyle}
                  itemStyle={{ color: textColor }}
                  formatter={(value) => {
                    const label = granularity === "day" ? "Saldo no dia" : "Saldo no mês";
                    return typeof value === "number"
                      ? [`R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, label]
                      : [String(value), label];
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorValue)"
                  dot={false}
                  activeDot={{ r: 6, fill: "#3b82f6", stroke: "#fff", strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* AI Insights */}
          <div
            style={{
              padding: "24px",
              borderRadius: "24px",
              background: "linear-gradient(135deg, #1d4ed8 0%, #1e3a8a 100%)",
              border: "1px solid rgba(255,255,255,0.12)",
              boxShadow: "0 8px 32px rgba(37,99,235,0.35)",
            }}
          >
            <Sparkles size={28} color="#93c5fd" style={{ marginBottom: "12px" }} />
            <h4 style={{ margin: "0 0 8px", fontSize: "1.1rem", fontWeight: 900, color: "#fff" }}>
              HandHorse Insights
            </h4>
            <p style={{ margin: "0 0 20px", fontSize: "0.85rem", color: "#bfdbfe", lineHeight: 1.6 }}>
              Descubra tendências de manejo e sugestões de pedigree para sua criação.
            </p>
            <button
              type="button"
              style={{
                width: "100%",
                padding: "11px 0",
                borderRadius: "16px",
                border: "none",
                backgroundColor: "#fff",
                color: "#1d4ed8",
                fontWeight: 700,
                fontSize: "0.85rem",
                cursor: "pointer",
                transition: "background 0.15s",
                boxSizing: "border-box",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#dbeafe";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#fff";
              }}
            >
              Abrir Insights
            </button>
          </div>
        </div>
      </div>

      {periodMenu ? (
        <div
          ref={periodMenuRef}
          role="menu"
          style={{
            position: "fixed",
            top: periodMenu.top,
            left: periodMenu.left,
            zIndex: 200,
            minWidth: 240,
            maxWidth: "min(280px, calc(100vw - 16px))",
            padding: "8px",
            borderRadius: "16px",
            background: isDark ? "rgba(15,23,42,0.98)" : "rgba(255,255,255,0.98)",
            border: `1px solid ${isDark ? "rgba(255,255,255,0.12)" : "rgba(148,163,184,0.25)"}`,
            boxShadow: isDark ? "0 16px 48px rgba(0,0,0,0.55)" : "0 16px 48px rgba(15,23,42,0.12)",
            backdropFilter: "blur(12px)",
          }}
        >
          {FINANCE_PERIOD_OPTIONS.map((opt) => {
            const selected = financePeriodPreset === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                role="menuitem"
                onClick={() => {
                  setFinancePeriodPreset(opt.id);
                  setPeriodMenu(null);
                }}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "10px",
                  padding: "10px 12px",
                  margin: 0,
                  border: "none",
                  borderRadius: "12px",
                  background: selected ? (isDark ? "rgba(59,130,246,0.2)" : "rgba(59,130,246,0.1)") : "transparent",
                  color: textColor,
                  fontSize: "0.82rem",
                  fontWeight: selected ? 700 : 500,
                  cursor: "pointer",
                  textAlign: "left",
                  fontFamily: "inherit",
                  boxSizing: "border-box",
                }}
              >
                <span>{opt.label}</span>
                {selected ? <Check size={16} color="#3b82f6" aria-hidden /> : <span style={{ width: 16 }} />}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
