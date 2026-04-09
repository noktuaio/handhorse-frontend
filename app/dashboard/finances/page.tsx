"use client";

import { useState, useEffect, type CSSProperties, type FormEvent } from "react";
import {
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  Plus,
  DollarSign,
  Filter,
  ChevronDown,
  Check,
  X,
  Wallet,
  Pencil,
  Trash2,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useTheme } from "@/shared/ui/theme-context";
import { useScrollLock } from "@/shared/ui/use-scroll-lock";
import { mapApiAnimalToHorse } from "@/shared/domain/dashboard/map-api-animal";
import type { Horse } from "@/shared/domain/dashboard/index";
import type { Transaction } from "@/shared/domain/dashboard/index";
import { listAnimalsApi } from "@/shared/infrastructure/animals/animals-api";
import {
  createFinancialTransactionApi,
  deleteFinancialTransactionApi,
  listFinancialTransactionsApi,
  transactionToCreatePayload,
  updateFinancialTransactionApi,
} from "@/shared/infrastructure/finance/finance-api";
import { useNavLoadingSetter } from "../nav-loading-context";
import styles from "../shell.module.css";

const CATEGORIES = ["Alimentação", "Saúde", "Venda", "Serviço", "Infraestrutura", "Equipamento", "Outro"];

const EMPTY_TRANS: Partial<Transaction> = {
  type: "Expense",
  category: "Alimentação",
  description: "",
  amount: 0,
  date: new Date().toISOString().split("T")[0],
};

const TRANSACTION_TYPE_OPTIONS = [
  { id: "all", label: "Todos os tipos" },
  { id: "Income", label: "Crédito" },
  { id: "Expense", label: "Débito" },
] as const;

// ── helpers ───────────────────────────────────────────────────────────────────

function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR");
}

function buildChartData(transactions: Transaction[]) {
  const months: Record<string, { month: string; Receita: number; Despesas: number }> = {};
  transactions.forEach((t) => {
    const d = new Date(t.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
    if (!months[key]) months[key] = { month: label, Receita: 0, Despesas: 0 };
    if (t.type === "Income") months[key].Receita += t.amount;
    else months[key].Despesas += t.amount;
  });
  return Object.entries(months)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => v);
}

// ── component ─────────────────────────────────────────────────────────────────

export default function FinancesPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const setNavLoading = useNavLoadingSetter();

  const [horses, setHorses] = useState<Horse[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [txsError, setTxsError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filterHorse, setFilterHorse] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [showModal, setShowModal] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newTrans, setNewTrans] = useState<Partial<Transaction>>(EMPTY_TRANS);

  useScrollLock(showModal || showFilter);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadError(null);
      setTxsError(null);
      setLoading(true);
      try {
        const rows = await listAnimalsApi();
        if (cancelled) return;
        setHorses(rows.map(mapApiAnimalToHorse));
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : "Não foi possível carregar os animais.");
        }
      }
      try {
        const txs = await listFinancialTransactionsApi();
        if (!cancelled) setTransactions(txs);
      } catch (e) {
        if (!cancelled) {
          setTxsError(e instanceof Error ? e.message : "Não foi possível carregar os lançamentos.");
          setTransactions([]);
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
      setNavLoading({ message: "Estamos carregando o financeiro para você" });
    } else {
      setNavLoading(null);
    }
    return () => setNavLoading(null);
  }, [loading, setNavLoading]);

  // Derived
  const filteredTransactions = transactions
    .filter((transaction) => filterHorse === "all" || transaction.horseId === filterHorse)
    .filter((transaction) => filterType === "all" || transaction.type === filterType);
  const sorted = [...filteredTransactions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  const totalIncome  = transactions.filter((t) => t.type === "Income").reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter((t) => t.type === "Expense").reduce((s, t) => s + t.amount, 0);
  const balance      = totalIncome - totalExpense;
  const chartData    = buildChartData(transactions);
  const activeCount = (filterHorse !== "all" ? 1 : 0) + (filterType !== "all" ? 1 : 0);

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

  const glassDark: CSSProperties = {
    background: isDark ? "rgba(2,6,23,0.97)" : "rgba(255,255,255,0.97)",
    border: `1px solid ${isDark ? "rgba(255,255,255,0.12)" : "rgba(148,163,184,0.25)"}`,
    backdropFilter: "blur(24px)",
    WebkitBackdropFilter: "blur(24px)",
    boxShadow: isDark
      ? "0 24px 60px rgba(0,0,0,0.8)"
      : "0 24px 60px rgba(15,23,42,0.18)",
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

  const textColor    = isDark ? "#E5E7EB" : "#0f172a";
  const mutedColor   = isDark ? "#9CA3AF" : "#64748b";
  const dividerColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(148,163,184,0.15)";

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

  const tooltipStyle: CSSProperties = {
    backgroundColor: isDark ? "rgba(15,23,42,0.95)" : "rgba(255,255,255,0.95)",
    border: "none",
    borderRadius: "16px",
    boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
    color: textColor,
    fontWeight: 700,
    fontSize: "0.8rem",
  };

  function openNewModal() {
    setEditingId(null);
    setNewTrans({ ...EMPTY_TRANS, date: new Date().toISOString().split("T")[0] });
    setShowModal(true);
  }

  function openEditModal(t: Transaction) {
    setEditingId(t.id);
    setNewTrans({
      type: t.type,
      category: t.category,
      description: t.description,
      amount: t.amount,
      date: t.date,
      horseId: t.horseId,
      linkedAnimalExamIds: t.linkedAnimalExamIds,
      linkedAnimalAwardIds: t.linkedAnimalAwardIds,
    });
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingId(null);
    setNewTrans({ ...EMPTY_TRANS });
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    void (async () => {
      setSaving(true);
      try {
        const payload = transactionToCreatePayload(newTrans);
        if (editingId) {
          const updated = await updateFinancialTransactionApi(editingId, payload);
          setTransactions((prev) => prev.map((x) => (x.id === editingId ? updated : x)));
        } else {
          const created = await createFinancialTransactionApi(payload);
          setTransactions((prev) => [created, ...prev]);
        }
        closeModal();
      } catch (err) {
        window.alert(err instanceof Error ? err.message : "Não foi possível guardar o lançamento.");
      } finally {
        setSaving(false);
      }
    })();
  }

  function confirmDelete(t: Transaction) {
    if (!window.confirm(`Excluir o lançamento «${t.description}»?`)) return;
    void (async () => {
      try {
        await deleteFinancialTransactionApi(t.id);
        setTransactions((prev) => prev.filter((x) => x.id !== t.id));
      } catch (err) {
        window.alert(err instanceof Error ? err.message : "Não foi possível excluir.");
      }
    })();
  }

  function patch(fields: Partial<Transaction>) {
    setNewTrans((prev) => ({ ...prev, ...fields }));
  }

  function resetFilters() {
    setFilterHorse("all");
    setFilterType("all");
    setShowFilter(false);
  }

  const isIncome = newTrans.type === "Income";

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: "28px", paddingBottom: "48px" }}>
        {loadError && !loading && (
          <p style={{ margin: 0, fontSize: "0.9rem", color: "#f87171" }} role="alert">
            {loadError}
          </p>
        )}
        {txsError && !loading && (
          <p style={{ margin: 0, fontSize: "0.9rem", color: "#f87171" }} role="alert">
            {txsError}
          </p>
        )}

        {/* ── Header ── */}
        <div className={styles.registryHeader}>
          <div>
            <h2 style={{ margin: 0, fontSize: "1.75rem", fontWeight: 900, letterSpacing: "-0.03em", color: textColor }}>
              Gestão Financeira
            </h2>
            <p style={{ margin: "4px 0 0", fontSize: "0.9rem", color: mutedColor }}>
              Lançamentos na API de financeiro (módulo separado). Opcionalmente ligados a exames e premiações (N:N). Animais
              vêm da API de animais.
            </p>
          </div>
          <button
            type="button"
            onClick={openNewModal}
            disabled={loading}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "12px 22px",
              borderRadius: "16px",
              border: "none",
              backgroundColor: loading ? "#64748b" : "#10b981",
              color: "#fff",
              fontWeight: 700,
              fontSize: "0.9rem",
              cursor: loading ? "not-allowed" : "pointer",
              boxShadow: "0 4px 16px rgba(16,185,129,0.35)",
              flexShrink: 0,
              whiteSpace: "nowrap",
            }}
          >
            <Plus size={18} />
            Nova Transação
          </button>
        </div>

        {/* ── Stat cards ── */}
        <div className={styles.financeStatsGrid}>
          {[
            {
              label: "Entradas",
              value: formatBRL(totalIncome),
              color: "#10b981",
              bg: "rgba(16,185,129,0.12)",
              Icon: ArrowUpRight,
              border: "transparent",
            },
            {
              label: "Saídas",
              value: formatBRL(totalExpense),
              color: "#f43f5e",
              bg: "rgba(244,63,94,0.12)",
              Icon: ArrowDownRight,
              border: "transparent",
            },
            {
              label: "Resultado",
              value: formatBRL(balance),
              color: balance >= 0 ? "#3b82f6" : "#f43f5e",
              bg: balance >= 0 ? "rgba(59,130,246,0.12)" : "rgba(244,63,94,0.12)",
              Icon: TrendingUp,
              border: balance >= 0 ? "rgba(16,185,129,0.2)" : "rgba(244,63,94,0.2)",
            },
          ].map(({ label, value, color, bg, Icon, border }) => (
            <div
              key={label}
              style={{
                ...glass,
                padding: "20px",
                border: `1px solid ${border === "transparent" ? (isDark ? "rgba(255,255,255,0.1)" : "rgba(148,163,184,0.2)") : border}`,
              }}
            >
              <div style={{ width: "44px", height: "44px", borderRadius: "14px", backgroundColor: bg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "14px" }}>
                <Icon size={22} color={color} />
              </div>
              <p style={{ margin: "0 0 4px", fontSize: "0.62rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: mutedColor }}>
                {label}
              </p>
              <p style={{ margin: 0, fontSize: "1.2rem", fontWeight: 900, color, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {value}
              </p>
            </div>
          ))}
        </div>

        {/* ── Bar chart ── */}
        <div style={{ ...glass, padding: "28px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px", flexWrap: "wrap", gap: "8px" }}>
            <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: textColor }}>
              Receitas vs Despesas
            </h3>
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              {[{ label: "Receita", color: "#10b981" }, { label: "Despesas", color: "#f43f5e" }].map(({ label, color }) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <div style={{ width: "10px", height: "10px", borderRadius: "3px", backgroundColor: color }} />
                  <span style={{ fontSize: "0.72rem", fontWeight: 600, color: mutedColor }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ height: "260px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"} />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: mutedColor, fontSize: 12, fontWeight: 600 }}
                  dy={10}
                />
                <YAxis
                  hide
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  cursor={{ fill: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)" }}
                  formatter={(value) =>
                    typeof value === "number" ? [formatBRL(value), ""] : [String(value), ""]
                  }
                />
                <Bar dataKey="Receita" fill="#10b981" radius={[8, 8, 0, 0]} maxBarSize={40} />
                <Bar dataKey="Despesas" fill="#f43f5e" radius={[8, 8, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── Transactions card list ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0", position: "relative", zIndex: 2 }}>
          {/* List header */}
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
            <Wallet size={18} color="#8b5cf6" style={{ flexShrink: 0 }} />
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
              Lançamentos
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
                  onClick={() => setShowFilter((current) => !current)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "8px 12px",
                    borderRadius: "12px",
                    border: `1px solid ${activeCount > 0 ? "rgba(59,130,246,0.5)" : (isDark ? "rgba(255,255,255,0.12)" : "rgba(148,163,184,0.25)")}`,
                    background: activeCount > 0
                      ? (isDark ? "rgba(59,130,246,0.18)" : "rgba(59,130,246,0.1)")
                      : (isDark ? "rgba(255,255,255,0.04)" : "#ffffff"),
                    color: activeCount > 0 ? "#3b82f6" : textColor,
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  <Filter size={14} />
                  Filtrar
                  {activeCount > 0 && (
                    <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "18px", height: "18px", borderRadius: "50%", backgroundColor: "#2563eb", color: "#fff", fontSize: "0.62rem", fontWeight: 800, lineHeight: 1 }}>
                      {activeCount}
                    </span>
                  )}
                  <ChevronDown size={14} style={{ transition: "transform 0.2s", transform: showFilter ? "rotate(180deg)" : "rotate(0deg)" }} />
                </button>

                {showFilter && (
                  <div style={{ position: "fixed", inset: 0, zIndex: 80, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
                    <div
                      style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" }}
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
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "18px" }}>
                        <p style={{ margin: 0, fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: mutedColor }}>
                          Filtros
                        </p>
                        {activeCount > 0 && (
                          <button
                            type="button"
                            onClick={resetFilters}
                            style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.72rem", fontWeight: 700, color: "#f43f5e", padding: "2px 6px", borderRadius: "8px" }}
                          >
                            Limpar tudo
                          </button>
                        )}
                      </div>

                      <p style={{ margin: "0 0 8px", fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", color: mutedColor }}>
                        Cavalo
                      </p>
                      <div style={{ display: "flex", flexDirection: "column", gap: "2px", marginBottom: "18px" }}>
                        {[{ id: "all", name: "Todos os cavalos" }, ...horses].map((horse) => {
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
                                backgroundColor: isActive ? (isDark ? "rgba(59,130,246,0.18)" : "rgba(59,130,246,0.1)") : "transparent",
                                color: isActive ? "#3b82f6" : (isDark ? "#E5E7EB" : "#374151"),
                              }}
                            >
                              {horse.name}
                              {isActive && <Check size={14} color="#3b82f6" />}
                            </button>
                          );
                        })}
                      </div>

                      <div style={{ height: "1px", backgroundColor: dividerColor, marginBottom: "18px" }} />

                      <p style={{ margin: "0 0 8px", fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", color: mutedColor }}>
                        Tipo de lançamento
                      </p>
                      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                        {TRANSACTION_TYPE_OPTIONS.map((option) => {
                          const isActive = filterType === option.id;
                          const optionColor = option.id === "Income" ? "#10b981" : option.id === "Expense" ? "#f43f5e" : "#3b82f6";

                          return (
                            <button
                              key={option.id}
                              type="button"
                              onClick={() => setFilterType(option.id)}
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
                                backgroundColor: isActive ? `${optionColor}1a` : "transparent",
                                color: isActive ? optionColor : (isDark ? "#E5E7EB" : "#374151"),
                              }}
                            >
                              {option.label}
                              {isActive && <Check size={14} color={optionColor} />}
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
                        Aplicar Filtros
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
                {sorted.length} registros
              </span>
            </div>
          </div>

          {/* Cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", paddingTop: "10px" }}>
            {loading ? (
              <div style={{ ...glass, padding: "48px", textAlign: "center" }}>
                <p style={{ margin: 0, color: mutedColor, fontSize: "0.95rem", fontWeight: 600 }}>Carregando…</p>
              </div>
            ) : sorted.length === 0 ? (
              <div style={{ ...glass, padding: "48px", textAlign: "center" }}>
                <p style={{ margin: 0, color: mutedColor, fontSize: "0.95rem", fontWeight: 600 }}>
                  Nenhuma transação registrada.
                </p>
              </div>
            ) : (
              sorted.map((t) => {
                const isIn = t.type === "Income";
                const accentColor = isIn ? "#10b981" : "#f43f5e";
                const accentBg = isIn ? "rgba(16,185,129,0.12)" : "rgba(244,63,94,0.12)";
                const ArrowIcon = isIn ? ArrowUpRight : ArrowDownRight;
                const horse = horses.find((item) => item.id === t.horseId);
                return (
                  <div
                    key={t.id}
                    className={styles.transactionCard}
                    style={{
                      ...glass,
                      padding: 0,
                      display: "flex",
                      flexDirection: "column",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "14px",
                        padding: "16px 18px",
                      }}
                    >
                      <div
                        style={{
                          width: "44px",
                          height: "44px",
                          borderRadius: "14px",
                          backgroundColor: accentBg,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <ArrowIcon size={20} color={accentColor} />
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p
                          style={{
                            margin: "0 0 4px",
                            fontSize: "0.88rem",
                            fontWeight: 700,
                            color: textColor,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {t.description}
                        </p>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                          <span
                            style={{
                              padding: "2px 8px",
                              borderRadius: "999px",
                              fontSize: "0.6rem",
                              fontWeight: 700,
                              backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)",
                              color: mutedColor,
                            }}
                          >
                            {t.category}
                          </span>
                          {horse && (
                            <span
                              style={{
                                padding: "2px 8px",
                                borderRadius: "999px",
                                fontSize: "0.6rem",
                                fontWeight: 700,
                                backgroundColor: "rgba(59,130,246,0.1)",
                                color: "#3b82f6",
                              }}
                            >
                              {horse.name}
                            </span>
                          )}
                          <span style={{ fontSize: "0.72rem", color: mutedColor }}>{formatDate(t.date)}</span>
                        </div>
                      </div>

                      <p
                        style={{
                          margin: 0,
                          fontSize: "0.95rem",
                          fontWeight: 900,
                          color: accentColor,
                          whiteSpace: "nowrap",
                          flexShrink: 0,
                        }}
                      >
                        {isIn ? "+" : "−"} {formatBRL(t.amount)}
                      </p>
                    </div>

                    <div
                      style={{
                        borderTop: `1px solid ${dividerColor}`,
                        padding: "12px 18px",
                        display: "flex",
                        justifyContent: "flex-end",
                        alignItems: "center",
                        gap: "8px",
                        flexWrap: "wrap",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => openEditModal(t)}
                        style={{ ...cardFooterBtn, color: mutedColor }}
                      >
                        <Pencil size={16} aria-hidden />
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => confirmDelete(t)}
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

      {/* ── Add transaction modal ── */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
          {/* Backdrop */}
          <div
            style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}
            onClick={closeModal}
          />

          {/* Card */}
          <div style={{ ...glassDark, position: "relative", width: "100%", maxWidth: "480px", borderRadius: "28px", padding: "32px", boxSizing: "border-box" }}>
            <button
              type="button"
              onClick={closeModal}
              aria-label="Fechar"
              style={{ position: "absolute", top: "16px", right: "16px", width: "32px", height: "32px", borderRadius: "50%", border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(148,163,184,0.3)"}`, background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: mutedColor }}
            >
              <X size={16} />
            </button>

            <h3 style={{ margin: "0 0 24px", fontSize: "1.4rem", fontWeight: 900, color: textColor }}>
              {editingId ? "Editar lançamento" : "Nova transação"}
            </h3>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {/* Type toggle */}
              <div style={{ display: "flex", background: isDark ? "rgba(255,255,255,0.05)" : "rgba(15,23,42,0.05)", padding: "4px", borderRadius: "14px", gap: "4px" }}>
                {(["Expense", "Income"] as const).map((type) => {
                  const active = newTrans.type === type;
                  const color = type === "Income" ? "#10b981" : "#f43f5e";
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => patch({ type })}
                      style={{
                        flex: 1,
                        padding: "10px 0",
                        borderRadius: "10px",
                        border: "none",
                        fontWeight: 700,
                        fontSize: "0.85rem",
                        cursor: "pointer",
                        transition: "background 0.2s, color 0.2s",
                        backgroundColor: active ? color : "transparent",
                        color: active ? "#fff" : mutedColor,
                        boxShadow: active ? `0 4px 12px ${color}44` : "none",
                      }}
                    >
                      {type === "Income" ? "Receita" : "Despesa"}
                    </button>
                  );
                })}
              </div>

              <input
                type="text"
                required
                placeholder="Descrição"
                value={newTrans.description}
                onChange={(e) => patch({ description: e.target.value })}
                style={inputStyle}
              />

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <select
                  value={newTrans.category}
                  onChange={(e) => patch({ category: e.target.value })}
                  style={inputStyle}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <input
                  type="date"
                  required
                  value={newTrans.date}
                  onChange={(e) => patch({ date: e.target.value })}
                  style={inputStyle}
                />
              </div>

              <select
                value={newTrans.horseId || ""}
                onChange={(e) => patch({ horseId: e.target.value || undefined })}
                style={inputStyle}
              >
                <option value="">Sem animal relacionado</option>
                {horses.map((horse) => (
                  <option key={horse.id} value={horse.id}>
                    {horse.name}
                  </option>
                ))}
              </select>

              <div style={{ position: "relative" }}>
                <DollarSign
                  size={18}
                  style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: mutedColor, pointerEvents: "none" }}
                />
                <input
                  type="number"
                  required
                  min={0}
                  step={0.01}
                  placeholder="Valor"
                  value={newTrans.amount === 0 ? "" : newTrans.amount}
                  onChange={(e) => patch({ amount: parseFloat(e.target.value) || 0 })}
                  style={{ ...inputStyle, paddingLeft: "40px" }}
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                style={{
                  marginTop: "4px",
                  width: "100%",
                  padding: "14px 0",
                  borderRadius: "16px",
                  border: "none",
                  backgroundColor: saving ? "#64748b" : isIncome ? "#10b981" : "#f43f5e",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: "0.95rem",
                  cursor: saving ? "not-allowed" : "pointer",
                  boxShadow: saving
                    ? "none"
                    : `0 4px 16px ${isIncome ? "rgba(16,185,129,0.35)" : "rgba(244,63,94,0.35)"}`,
                  boxSizing: "border-box",
                  transition: "background 0.2s",
                }}
              >
                {saving ? "A guardar…" : editingId ? "Salvar alterações" : "Confirmar lançamento"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
