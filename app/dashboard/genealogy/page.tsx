"use client";

import { useState, useEffect, useMemo, useRef, type CSSProperties, type ReactNode } from "react";
import { ChevronDown, ChevronUp, GitBranch, Search } from "lucide-react";
import { useTheme } from "@/shared/ui/theme-context";
import { mapApiAnimalToHorse } from "@/shared/domain/dashboard/map-api-animal";
import type { Horse } from "@/shared/domain/dashboard/index";
import { listAnimalsApi } from "@/shared/infrastructure/animals/animals-api";
import { useNavLoadingSetter } from "../nav-loading-context";
import styles from "../shell.module.css";

// ── helpers ───────────────────────────────────────────────────────────────────

const GENDER_PT: Record<Horse["gender"], string> = {
  Stallion: "Garanhão",
  Mare: "Égua",
  Gelding: "Castrado",
};

const STATUS_COLOR: Record<Horse["status"], string> = {
  Active: "#10b981",
  Sold: "#3b82f6",
  Retired: "#9ca3af",
};

function LevelScrollRow({ title, mutedColor, children }: { title: string; mutedColor: string; children: ReactNode }) {
  return (
    <div>
      <p className={styles.genealogyLevelTitle} style={{ color: mutedColor }}>
        {title}
      </p>
      <div className={styles.genealogyLevelScroll}>
        <div className={styles.genealogyLevelRow}>{children}</div>
      </div>
    </div>
  );
}

function CardSlot({ children }: { children: ReactNode }) {
  return <div className={styles.genealogyCardSlot}>{children}</div>;
}

/** Linha vertical curta entre níveis */
function VLine({ color = "#3b82f620", height = 20 }: { color?: string; height?: number }) {
  return (
    <div style={{ display: "flex", justifyContent: "center", height, flexShrink: 0 }}>
      <div style={{ width: "2px", height: "100%", background: color }} />
    </div>
  );
}

// ── sub-components ────────────────────────────────────────────────────────────

function HorseNode({
  horse,
  label,
  highlight = false,
  isDark,
  textColor,
  mutedColor,
}: {
  horse: Horse | undefined;
  label: string;
  highlight?: boolean;
  isDark: boolean;
  textColor: string;
  mutedColor: string;
}) {
  const glass: CSSProperties = {
    background: highlight
      ? isDark
        ? "rgba(37,99,235,0.2)"
        : "rgba(37,99,235,0.08)"
      : isDark
        ? "rgba(255,255,255,0.05)"
        : "rgba(255,255,255,0.75)",
    border: highlight
      ? "2px solid rgba(59,130,246,0.5)"
      : `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(148,163,184,0.2)"}`,
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    boxShadow: highlight
      ? "0 0 24px rgba(59,130,246,0.2), 0 4px 32px rgba(0,0,0,0.1)"
      : isDark
        ? "0 4px 16px rgba(0,0,0,0.3)"
        : "0 4px 16px rgba(15,23,42,0.06)",
    borderRadius: "20px",
    padding: "14px",
    opacity: horse ? 1 : 0.45,
    minHeight: "88px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    height: "100%",
    boxSizing: "border-box",
  };

  return (
    <div style={glass}>
      <p
        style={{
          margin: "0 0 8px",
          fontSize: "0.52rem",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          color: highlight ? "#3b82f6" : mutedColor,
        }}
      >
        {label}
      </p>
      {horse ? (
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "12px",
              overflow: "hidden",
              flexShrink: 0,
              boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
            }}
          >
            <img src={horse.photoUrl} alt={horse.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <p
              style={{
                margin: "0 0 2px",
                fontSize: "0.82rem",
                fontWeight: 800,
                color: textColor,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {horse.name}
            </p>
            <p style={{ margin: 0, fontSize: "0.65rem", color: highlight ? "#93c5fd" : "#3b82f6", fontWeight: 600 }}>
              {horse.breed}
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "3px" }}>
              <div
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  backgroundColor: STATUS_COLOR[horse.status],
                  flexShrink: 0,
                }}
              />
              <p style={{ margin: 0, fontSize: "0.58rem", color: mutedColor }}>{GENDER_PT[horse.gender]}</p>
            </div>
          </div>
        </div>
      ) : (
        <p style={{ margin: 0, fontSize: "0.8rem", color: mutedColor, fontStyle: "italic" }}>Desconhecido</p>
      )}
    </div>
  );
}

// ── main component ────────────────────────────────────────────────────────────

export default function GenealogyPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const setNavLoading = useNavLoadingSetter();

  const [horses, setHorses] = useState<Horse[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const comboboxRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus search input when accordion opens
  useEffect(() => {
    if (!isOpen) return;
    const t = setTimeout(() => searchInputRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    function handleOutside(e: MouseEvent) {
      if (comboboxRef.current && !comboboxRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearchQuery("");
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [isOpen]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadError(null);
      setLoading(true);
      try {
        const rows = await listAnimalsApi();
        if (cancelled) return;
        const list = rows.map(mapApiAnimalToHorse).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
        setHorses(list);
      } catch (e) {
        if (!cancelled) {
          setHorses([]);
          setLoadError(e instanceof Error ? e.message : "Não foi possível carregar os animais.");
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
      setNavLoading({ message: "Carregando animais para a árvore genealógica…" });
    } else {
      setNavLoading(null);
    }
    return () => setNavLoading(null);
  }, [loading, setNavLoading]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const byId = useMemo(() => new Map(horses.map((h) => [h.id, h])), [horses]);

  const filteredHorses = useMemo(() => {
    if (!searchQuery.trim()) return horses;
    const q = searchQuery.toLowerCase();
    return horses.filter((h) => h.name.toLowerCase().includes(q));
  }, [horses, searchQuery]);

  const selectedHorse = selectedId ? byId.get(selectedId) : undefined;

  useEffect(() => {
    if (!horses.length) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !byId.has(selectedId)) {
      setSelectedId(horses[0]!.id);
    }
  }, [horses, selectedId, byId]);

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
  const lineColor = isDark ? "rgba(59,130,246,0.3)" : "rgba(59,130,246,0.25)";

  const sire = selectedHorse?.sireId ? byId.get(selectedHorse.sireId) : undefined;
  const dam = selectedHorse?.damId ? byId.get(selectedHorse.damId) : undefined;
  const gpSS = sire?.sireId ? byId.get(sire.sireId) : undefined;
  const gpSD = sire?.damId ? byId.get(sire.damId) : undefined;
  const gpDS = dam?.sireId ? byId.get(dam.sireId) : undefined;
  const gpDD = dam?.damId ? byId.get(dam.damId) : undefined;
  const offspring = selectedHorse
    ? horses.filter((h) => h.sireId === selectedHorse.id || h.damId === selectedHorse.id)
    : [];

  const generationLabel =
    !selectedHorse || (!sire && !dam)
      ? "1ª"
      : gpSS || gpSD || gpDS || gpDD
        ? "3ª"
        : "2ª";

  const nodeProps = { isDark, textColor, mutedColor };

  return (
    <div className={styles.genealogyPageShell}>
      <div style={{ flexShrink: 0 }}>
        <h2 style={{ margin: 0, fontSize: "1.75rem", fontWeight: 900, letterSpacing: "-0.03em", color: textColor }}>
          Árvore Genealógica
        </h2>
        <p style={{ margin: "4px 0 0", fontSize: "0.9rem", color: mutedColor }}>
          Rastreie o pedigree e linhagem dos seus animais. O scroll vertical fica só no card da árvore; cada nível pode
          ser percorrido na horizontal.
        </p>
      </div>

      {loadError ? (
        <div style={{ ...glass, flexShrink: 0, padding: "20px", color: "#f43f5e", fontSize: "0.9rem" }}>{loadError}</div>
      ) : null}

      <div className={styles.genealogyGrid}>
        {/* ── Combobox sidebar ── */}
        <div ref={comboboxRef} className={styles.genealogySidebarColumn} style={{ ...glass, padding: "16px" }}>

          {/* Trigger */}
          <button
            type="button"
            onClick={() => setIsOpen((v) => !v)}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "8px",
              padding: "10px 12px",
              borderRadius: "14px",
              border: `1px solid ${isDark ? "rgba(255,255,255,0.12)" : "rgba(148,163,184,0.28)"}`,
              cursor: "pointer",
              background: isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.65)",
              transition: "background 0.15s",
              flexShrink: 0,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0, overflow: "hidden" }}>
              {selectedHorse ? (
                <div style={{ width: "32px", height: "32px", borderRadius: "10px", overflow: "hidden", flexShrink: 0 }}>
                  <img src={selectedHorse.photoUrl} alt={selectedHorse.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
              ) : (
                <div
                  style={{
                    width: "32px", height: "32px", borderRadius: "10px", flexShrink: 0,
                    background: isDark ? "rgba(255,255,255,0.08)" : "rgba(148,163,184,0.15)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  <GitBranch size={14} color={mutedColor} />
                </div>
              )}
              <span
                style={{
                  fontSize: "0.83rem",
                  fontWeight: 600,
                  color: selectedHorse ? textColor : mutedColor,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {loading ? "Carregando…" : selectedHorse ? selectedHorse.name : "Selecionar animal"}
              </span>
            </div>
            {isOpen
              ? <ChevronUp size={15} color={mutedColor} style={{ flexShrink: 0 }} />
              : <ChevronDown size={15} color={mutedColor} style={{ flexShrink: 0 }} />
            }
          </button>

          {/* Acordeão: sempre renderizado, anima via maxHeight */}
          <div
            style={{
              maxHeight: isOpen ? "min(360px, 52svh)" : "0px",
              overflow: "hidden",
              transition: "max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Search input */}
            <div style={{ position: "relative", marginTop: "10px", flexShrink: 0 }}>
              <Search
                size={13}
                color={mutedColor}
                style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
              />
              <input
                ref={searchInputRef}
                tabIndex={isOpen ? 0 : -1}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar animal…"
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "8px 10px 8px 30px",
                  borderRadius: "10px",
                  border: `1px solid ${isDark ? "rgba(255,255,255,0.12)" : "rgba(148,163,184,0.25)"}`,
                  background: isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.6)",
                  color: textColor,
                  fontSize: "0.82rem",
                  outline: "none",
                }}
              />
            </div>

            {/* Filtered list */}
            <div className={styles.genealogySidebarList} style={{ display: "flex", flexDirection: "column", gap: "3px", marginTop: "8px" }}>
              {filteredHorses.length === 0 ? (
                <p style={{ margin: "6px 4px", fontSize: "0.8rem", color: mutedColor, fontStyle: "italic" }}>
                  {horses.length === 0 ? "Nenhum animal cadastrado." : `Sem resultados para "${searchQuery}"`}
                </p>
              ) : (
                filteredHorses.map((h) => {
                  const active = selectedId === h.id;
                  return (
                    <button
                      key={h.id}
                      type="button"
                      onClick={() => { setSelectedId(h.id); setIsOpen(false); setSearchQuery(""); }}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        gap: "9px",
                        padding: "9px 10px",
                        borderRadius: "12px",
                        border: "none",
                        cursor: "pointer",
                        transition: "background 0.15s",
                        backgroundColor: active ? "rgba(37,99,235,0.15)" : "transparent",
                        flexShrink: 0,
                      }}
                    >
                      <div style={{ width: "30px", height: "30px", borderRadius: "9px", overflow: "hidden", flexShrink: 0 }}>
                        <img src={h.photoUrl} alt={h.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      </div>
                      <span
                        style={{
                          fontSize: "0.82rem",
                          fontWeight: 600,
                          color: active ? "#3b82f6" : textColor,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {h.name}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className={styles.genealogyTreeCard} style={{ ...glass, padding: 0 }}>
          <div className={styles.genealogyTreeScroll} style={{ padding: "24px 18px 28px" }}>

            {!selectedHorse && !loading ? (
              <p style={{ margin: 0, textAlign: "center", color: mutedColor, fontSize: "0.9rem" }}>
                Selecione um animal na lista para ver a árvore.
              </p>
            ) : selectedHorse ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                  alignItems: "stretch",
                  maxWidth: "900px",
                  margin: "0 auto",
                }}
              >
              <LevelScrollRow mutedColor={mutedColor} title="Ascendentes — 2ª geração (avós)">
                <CardSlot>
                  <HorseNode horse={gpSS} label="Avô paterno" {...nodeProps} />
                </CardSlot>
                <CardSlot>
                  <HorseNode horse={gpSD} label="Avó paterna" {...nodeProps} />
                </CardSlot>
                <CardSlot>
                  <HorseNode horse={gpDS} label="Avô materno" {...nodeProps} />
                </CardSlot>
                <CardSlot>
                  <HorseNode horse={gpDD} label="Avó materna" {...nodeProps} />
                </CardSlot>
              </LevelScrollRow>

              <VLine color={lineColor} height={22} />

              <LevelScrollRow mutedColor={mutedColor} title="Ascendentes — 1ª geração (pais)">
                <CardSlot>
                  <HorseNode horse={sire} label="Pai (sire)" {...nodeProps} />
                </CardSlot>
                <CardSlot>
                  <HorseNode horse={dam} label="Mãe (dam)" {...nodeProps} />
                </CardSlot>
              </LevelScrollRow>

              <VLine color={lineColor} height={22} />

              <LevelScrollRow mutedColor={mutedColor} title="Animal de referência">
                <CardSlot>
                  <HorseNode horse={selectedHorse} label="Selecionado" highlight {...nodeProps} />
                </CardSlot>
              </LevelScrollRow>

              {offspring.length > 0 ? (
                <>
                  <VLine color={lineColor} height={22} />
                  <LevelScrollRow mutedColor={mutedColor} title="Descendentes">
                    {offspring.map((o) => (
                      <CardSlot key={o.id}>
                        <HorseNode
                          horse={o}
                          label={o.sireId === selectedHorse.id ? "Filho/a (paterno)" : "Filho/a (materno)"}
                          {...nodeProps}
                        />
                      </CardSlot>
                    ))}
                  </LevelScrollRow>
                </>
              ) : null}

              <div
                style={{
                  marginTop: "22px",
                  padding: "16px",
                  borderRadius: "16px",
                  background: isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.03)",
                  border: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(148,163,184,0.15)"}`,
                }}
              >
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", textAlign: "center" }}>
                  {[
                    { label: "Raça", value: selectedHorse.breed },
                    { label: "Gênero", value: GENDER_PT[selectedHorse.gender] },
                    { label: "Geração", value: generationLabel },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p
                        style={{
                          margin: "0 0 3px",
                          fontSize: "0.55rem",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.1em",
                          color: mutedColor,
                        }}
                      >
                        {label}
                      </p>
                      <p style={{ margin: 0, fontSize: "0.85rem", fontWeight: 700, color: textColor }}>{value}</p>
                    </div>
                  ))}
                </div>
              </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
