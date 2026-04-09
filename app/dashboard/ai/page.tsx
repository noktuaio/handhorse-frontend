"use client";

import { useState, useEffect, useMemo, useRef, type CSSProperties } from "react";
import {
  Sparkles,
  BrainCircuit,
  RefreshCw,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Search,
  AlertTriangle,
  Salad,
  GitMerge,
  Share2,
  Download,
  ExternalLink,
} from "lucide-react";
import { jsPDF } from "jspdf";
import { useTheme } from "@/shared/ui/theme-context";
import { MOCK_HORSES } from "@/shared/domain/dashboard/mock-data";
import type { Horse } from "@/shared/domain/dashboard/index";
import { registerInterPdfFont } from "@/shared/config/pdf-inter-fonts";
import styles from "../shell.module.css";

// ── mock insights database ────────────────────────────────────────────────────

type Insight = {
  tips: string[];
  healthRisks: string[];
  diet: string;
  estimatedValue: string;
  breedingMatch: { name: string; breed: string; reason: string }[];
};

const INSIGHTS_DB: Record<string, Insight> = {
  // Thunderbolt — Quarter Horse / Stallion
  "1": {
    tips: [
      "Priorize treinos de cutting e rédeas curtas para explorar a agilidade natural da raça.",
      "Inclua exercícios de spins e rollbacks 3× por semana para desenvolver a musculatura dos posteriores.",
      "Realize ferrageamento a cada 6–8 semanas; cascos fortes são essenciais para a performance.",
      "Monitore hidratação pós-treino — Quarter Horses transpiran intensamente em esforço.",
    ],
    healthRisks: [
      "HYPP (Hipercalemia Periódica) — rastreio genético recomendado para reprodução responsável.",
      "Miosite por sobrecarga (Azotúria) — evite períodos longos de repouso seguidos de trabalho intenso.",
      "Artrite precoce em potros de alta performance — controle o início do treinamento intenso.",
    ],
    diet: "Feno de gramíneas de alta qualidade como base (≈ 2% do peso vivo/dia). Suplementação proteica para manutenção muscular. Se HYPP positivo, restringir alimentos ricos em potássio (alfafa, melaço). Acesso contínuo a água fresca e bloco mineral.",
    estimatedValue: "R$ 45.000",
    breedingMatch: [
      { name: "Lua",     breed: "Arabian",    reason: "Cruzamento clássico para potros versáteis de resistência e velocidade." },
      { name: "Estrela", breed: "Paint Horse", reason: "Excelente complementaridade genética; potros com coloração atraente e temperamento equilibrado." },
    ],
  },
  // Lady Luck — Arabian / Mare
  "2": {
    tips: [
      "Invista em treinos de endurance com distâncias progressivas — a raça é naturalmente adaptada.",
      "Estimulação mental diária é essencial; Arabians se entediam rapidamente em rotinas repetitivas.",
      "Cuidados extras com a pele fina: proteção solar nas partes rosadas e inspeções regulares.",
      "Monitoramento de temperatura corporal após exercício prolongado no calor.",
    ],
    healthRisks: [
      "Predisposição a laminite — controle rigoroso de pastagem rica e carboidratos.",
      "SCID (Imunodeficiência Combinada Grave) — rastreio genético obrigatório antes de reprodução.",
      "Síndrome Cerebelar Atáxica (CA) — testar antes de qualquer programa reprodutivo.",
    ],
    diet: "Feno de gramíneas de baixo amido como base principal. Suplementação com vitamina E e selênio para proteção muscular. Evitar excesso de açúcares simples e pastagem em crescimento. Dividir em 3 refeições pequenas para minimizar risco de cólica.",
    estimatedValue: "R$ 38.000",
    breedingMatch: [
      { name: "Trovão", breed: "Quarter Horse", reason: "Combinação clássica produz potros ágeis com excelente resistência." },
      { name: "Sultão", breed: "Appaloosa",    reason: "Cruzamento incomum que gera descendentes de alta variação genética e beleza." },
    ],
  },
  // Golden Spirit — Thoroughbred / Gelding
  "3": {
    tips: [
      "Treinamento gradual e periodizado — evite picos abruptos de intensidade para proteger os tendões.",
      "Análise biomecânica semestral recomendada para cavalos de corrida.",
      "Aquecimento de 15 minutos e resfriamento ativo obrigatórios em cada sessão.",
      "Monitoramento semanal de frequência cardíaca em repouso para detectar sobrecarga precoce.",
    ],
    healthRisks: [
      "HPIE (Hemorragia Pulmonar Induzida por Exercício) — endoscopia anual recomendada.",
      "Úlceras gástricas — raça é altamente suscetível; monitorar comportamento alimentar.",
      "Desmite de tendões e ligamentos — exame ultrassonográfico após temporadas intensas.",
    ],
    diet: "Dieta hipercalórica balanceada com alto teor de gordura e fibra (alfafa + feno de capim). Suplementação com ômega-3 e eletrólitos. Dividir em 3+ refeições pequenas para reduzir risco de úlcera. Óleo de linhaça como fonte de gordura antiinflamatória.",
    estimatedValue: "R$ 62.000",
    breedingMatch: [],  // Gelding — sem recomendações
  },
  // Storm Rider — Appaloosa / Stallion
  "4": {
    tips: [
      "Proteção solar obrigatória para manchas claras e área ao redor dos olhos.",
      "Controle rigoroso de peso — Appaloosas têm alta eficiência metabólica.",
      "Exercícios variados de dressage e trail para manter motivação e condicionamento.",
      "Exames oftalmológicos semestrais — ERU (uveíte recorrente) é comum na raça.",
    ],
    healthRisks: [
      "Uveíte Equina Recorrente (ERU) — maior prevalência em Appaloosas; monitorar sinais de inflamação ocular.",
      "Visão noturna reduzida — adaptar rotinas de trabalho e manejo ao anoitecer.",
      "Síndrome Metabólica Equina — predisposição aumentada na raça; manter peso ideal.",
    ],
    diet: "Dieta restrita em carboidratos não-estruturais (NSC < 10%). Feno de gramíneas testado como base principal. Pastagem altamente controlada — limitada a 1 hora/dia. Suplementação com vitamina A, antioxidantes e biotina para saúde ocular e de cascos.",
    estimatedValue: "R$ 28.000",
    breedingMatch: [
      { name: "Estrela", breed: "Paint Horse", reason: "Combinação gera potros com beleza de pelagem excepcional e temperamento dócil." },
      { name: "Lua",     breed: "Arabian",    reason: "Aumenta vigor e resistência; resultado genético diversificado." },
    ],
  },
  // Silver Dawn — Paint Horse / Mare
  "5": {
    tips: [
      "Treinamento versátil alternando Western e English para desenvolvimento completo.",
      "Rastreio HYPP se houver ancestral King no pedigree — fundamental para reprodução segura.",
      "Proteção solar em manchas brancas — maior sensibilidade à radiação UV.",
      "Trabalhos de baixo impacto para preservar articulações ao longo da vida reprodutiva.",
    ],
    healthRisks: [
      "HYPP (linha King) — teste genético obrigatório antes de qualquer cruzamento.",
      "Melanoma em áreas de pele clara — exames regulares a partir dos 5 anos.",
      "Fotossensibilidade cutânea — manejo cuidadoso em dias de forte insolação.",
    ],
    diet: "Alimentação equilibrada com feno de gramíneas e pastagem controlada (máx. 4 horas/dia). Suplemento de biotina (20 mg/dia) para saúde dos cascos. Inclua proteína de alta qualidade no período gestacional. Dividir em 2–3 refeições diárias para estabilidade glicêmica.",
    estimatedValue: "R$ 32.000",
    breedingMatch: [
      { name: "Trovão", breed: "Quarter Horse", reason: "Cruzamento consolidado para potros robustos e versáteis, com pelagem atraente." },
      { name: "Sultão", breed: "Appaloosa",    reason: "Potros com padrão de pelagem raro e potencial para exposições." },
    ],
  },
};

const DEFAULT_INSIGHT: Insight = {
  tips: [
    "Realize exames veterinários completos semestralmente.",
    "Mantenha rotina consistente de exercícios adequada à raça.",
    "Monitore peso e condição corporal mensalmente.",
    "Garanta acesso a água fresca e sombra em todas as estações.",
  ],
  healthRisks: [
    "Sem histórico genético registrado — rastreio geral recomendado.",
    "Cólicas por distúrbios digestivos — manejo alimentar cuidadoso.",
  ],
  diet: "Dieta balanceada com feno de gramíneas como base. Suplementação mineral conforme avaliação veterinária. Acesso contínuo à água potável.",
  estimatedValue: "A consultar",
  breedingMatch: [],
};

// ── component ─────────────────────────────────────────────────────────────────

export default function AIPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [selectedHorse, setSelectedHorse] = useState<Horse>(MOCK_HORSES[0]);
  const [insight, setInsight]             = useState<Insight | null>(null);
  const [loading, setLoading]             = useState(false);
  const [isExporting, setIsExporting]     = useState(false);
  const [isOpen, setIsOpen]               = useState(false);
  const [searchQuery, setSearchQuery]     = useState("");
  const comboboxRef   = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus search input when accordion opens
  useEffect(() => {
    if (!isOpen) return;
    const t = setTimeout(() => searchInputRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, [isOpen]);

  // Close on outside click
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

  const filteredHorses = useMemo(() => {
    if (!searchQuery.trim()) return MOCK_HORSES;
    const q = searchQuery.toLowerCase();
    return MOCK_HORSES.filter((h) => h.name.toLowerCase().includes(q));
  }, [searchQuery]);

  async function handleGenerate() {
    setLoading(true);
    setInsight(null);
    await new Promise((r) => setTimeout(r, 1600));
    setInsight(INSIGHTS_DB[selectedHorse.id] ?? DEFAULT_INSIGHT);
    setLoading(false);
  }

  async function getImageDataUrl(imageUrl: string): Promise<string | null> {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();

      return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(typeof reader.result === "string" ? reader.result : null);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  }

  function sanitizeFileName(value: string): string {
    return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  }

  function sanitizePdfText(value: string): string {
    return value
      .replace(/\\n/g, " ")
      .replace(/\/n/g, " ")
      .replace(/\r?\n/g, " ")
      .replace(/≈/g, "aprox.")
      .replace(/–/g, "-")
      .replace(/—/g, "-")
      .replace(/×/g, "x")
      .replace(/•/g, "-")
      .replace(/\s+/g, " ")
      .trim();
  }

  async function buildInsightPdfFile(currentHorse: Horse, currentInsight: Insight): Promise<File> {
    const pdf = new jsPDF({ unit: "pt", format: "a4" });
    registerInterPdfFont(pdf);
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 56;
    const contentWidth = pageWidth - margin * 2;
    const heroImageHeight = (contentWidth * 3) / 4;
    const footerHeight = 28;
    const headerCardHeight = 56;
    let cursorY = margin + headerCardHeight + 30;

    const brandBlue: [number, number, number] = [37, 99, 235];
    const textPrimary: [number, number, number] = [15, 23, 42];
    const textSecondary: [number, number, number] = [71, 85, 105];
    const dividerColor: [number, number, number] = [226, 232, 240];

    const ensureSpace = (requiredHeight: number) => {
      if (cursorY + requiredHeight <= pageHeight - margin - footerHeight) {
        return;
      }

      pdf.addPage();
      drawPageHeader();
      cursorY = margin + headerCardHeight + 30;
    };

    const drawPageHeader = () => {
      pdf.setFillColor(255, 255, 255);
      pdf.setDrawColor(...dividerColor);
      pdf.setLineWidth(1);
      pdf.roundedRect(margin, margin, contentWidth, headerCardHeight, 12, 12, "FD");

      if (handHorseLogo) {
        pdf.addImage(handHorseLogo, "PNG", margin + 14, margin + 8, 32, 32, undefined, "FAST");
      }

      pdf.setTextColor(...textPrimary);
      pdf.setFont("Inter", "bold");
      pdf.setFontSize(21);
      pdf.text("HandHorse", margin + 56, margin + 24);
      pdf.setFont("Inter", "normal");
      pdf.setFontSize(10);
      pdf.setTextColor(...textSecondary);
      pdf.text("HandHorse Insights", margin + 56, margin + 40);
    };

    const drawPageFooter = (pageNumber: number, totalPages: number) => {
      const footerY = pageHeight - margin + 6;
      pdf.setDrawColor(...dividerColor);
      pdf.setLineWidth(1);
      pdf.line(margin, footerY - 14, pageWidth - margin, footerY - 14);
      pdf.setFont("Inter", "normal");
      pdf.setFontSize(9);
      pdf.setTextColor(...textSecondary);
      pdf.text(`Página ${pageNumber} de ${totalPages}`, pageWidth - margin, footerY, { align: "right" });
    };

    const drawSectionCard = (height: number) => {
      ensureSpace(height);
      pdf.setFillColor(255, 255, 255);
      pdf.setDrawColor(...dividerColor);
      pdf.setLineWidth(1);
      pdf.roundedRect(margin, cursorY, contentWidth, height, 12, 12, "FD");
    };

    const addSectionTitle = (title: string, color: [number, number, number], cardTop: number) => {
      pdf.setFillColor(241, 245, 249);
      pdf.roundedRect(margin + 12, cardTop + 12, contentWidth - 24, 24, 8, 8, "F");
      pdf.setFont("Inter", "bold");
      pdf.setFontSize(12);
      pdf.setTextColor(...color);
      pdf.text(title, margin + 20, cardTop + 28);
    };

    const addParagraph = (text: string, indent = 0) => {
      const normalizedText = sanitizePdfText(text);
      pdf.setFont("Inter", "normal");
      pdf.setFontSize(10);
      const lines = pdf.splitTextToSize(normalizedText, contentWidth - indent - 18);
      ensureSpace(lines.length * 12 + 4);
      pdf.setTextColor(...textSecondary);
      pdf.text(lines, margin + 14 + indent, cursorY);
      cursorY += lines.length * 12 + 4;
    };

    const addSectionCard = (title: string, color: [number, number, number], renderContent: () => void, estimatedHeight: number) => {
      drawSectionCard(estimatedHeight);
      const cardTop = cursorY;
      addSectionTitle(title, color, cardTop);
      cursorY += 50;
      renderContent();
      cursorY = cardTop + estimatedHeight + 14;
    };

    const handHorseLogo = await getImageDataUrl("/logo-handhorse.png");
    const imageDataUrl = await getImageDataUrl(currentHorse.photoUrl);

    drawPageHeader();

    pdf.setTextColor(...textPrimary);
    pdf.setFont("Inter", "bold");
    pdf.setFontSize(19);
    pdf.text(sanitizePdfText(currentHorse.name), margin, cursorY);
    cursorY += 22;

    if (imageDataUrl) {
      pdf.addImage(imageDataUrl, "JPEG", margin, cursorY, contentWidth, heroImageHeight, undefined, "FAST");
      cursorY += heroImageHeight + 16;
    }

    pdf.setFont("Inter", "normal");
    pdf.setFontSize(10);
    pdf.setTextColor(...textSecondary);
    pdf.text(sanitizePdfText(`${currentHorse.breed} · ${currentHorse.gender}`), margin, cursorY);
    cursorY += 14;
    pdf.text(sanitizePdfText(`HandHorse Insights gerado em ${new Date().toLocaleDateString("pt-BR")}`), margin, cursorY);

    cursorY += 22;

    addSectionCard("Manejo recomendado", [37, 99, 235], () => {
      currentInsight.tips.forEach((tip, index) => addParagraph(`${index + 1}. ${tip}`));
    }, Math.max(108, currentInsight.tips.length * 24 + 56));

    addSectionCard("Predisposições de saúde", [244, 63, 94], () => {
      currentInsight.healthRisks.forEach((item) => addParagraph(`- ${item}`));
    }, Math.max(96, currentInsight.healthRisks.length * 24 + 56));

    addSectionCard("Dieta sugerida", [16, 185, 129], () => {
      addParagraph(currentInsight.diet);
    }, 128);

    addSectionCard("Valor estimado de mercado", [16, 185, 129], () => {
      addParagraph(currentInsight.estimatedValue);
    }, 88);

    if (currentInsight.breedingMatch.length > 0) {
      addSectionCard("Recomendações de cruzamento", [139, 92, 246], () => {
        currentInsight.breedingMatch.forEach((match) => {
          addParagraph(`${match.name} (${match.breed})`);
          addParagraph(match.reason, 12);
        });
      }, Math.max(110, currentInsight.breedingMatch.length * 40 + 56));
    }

    if (currentInsight.breedingMatch.length === 0 && currentHorse.gender === "Gelding") {
      addSectionCard("Recomendações de cruzamento", [139, 92, 246], () => {
        addParagraph("Não aplicável para animais castrados.");
      }, 88);
    }

    const totalPages = pdf.getNumberOfPages();

    Array.from({ length: totalPages }, (_, index) => {
      const pageNumber = index + 1;
      pdf.setPage(pageNumber);
      drawPageFooter(pageNumber, totalPages);
    });

    const blob = pdf.output("blob");
    const fileName = `equine-insights-${sanitizeFileName(currentHorse.name || "animal")}.pdf`;
    return new File([blob], fileName, { type: "application/pdf" });
  }

  async function handleShareInsight() {
    if (!insight) {
      return;
    }

    setIsExporting(true);

    try {
      const pdfFile = await buildInsightPdfFile(selectedHorse, insight);

      if (navigator.share && navigator.canShare?.({ files: [pdfFile] })) {
        await navigator.share({
          title: `HandHorse Insights - ${selectedHorse.name}`,
          text: `Insights de manejo, saúde e dieta para ${selectedHorse.name}.`,
          files: [pdfFile],
        });
        return;
      }

      const downloadUrl = URL.createObjectURL(pdfFile);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = pdfFile.name;
      link.click();
      URL.revokeObjectURL(downloadUrl);
    } finally {
      setIsExporting(false);
    }
  }

  async function handleOpenInsightPdf() {
    if (!insight) {
      return;
    }

    setIsExporting(true);

    try {
      const pdfFile = await buildInsightPdfFile(selectedHorse, insight);
      const fileUrl = URL.createObjectURL(pdfFile);
      window.open(fileUrl, "_blank", "noopener,noreferrer");
      window.setTimeout(() => {
        URL.revokeObjectURL(fileUrl);
      }, 60_000);
    } finally {
      setIsExporting(false);
    }
  }

  // Styles
  const glass: CSSProperties = {
    background: isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.75)",
    border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(148,163,184,0.2)"}`,
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    boxShadow: isDark ? "0 4px 32px rgba(0,0,0,0.5)" : "0 4px 32px rgba(15,23,42,0.08)",
    borderRadius: "24px",
  };

  const textColor  = isDark ? "#E5E7EB" : "#0f172a";
  const mutedColor = isDark ? "#9CA3AF" : "#64748b";

  function InsightCard({ title, color, accentBorder, icon, children }: {
    title: string; color: string; accentBorder: string; icon: React.ReactNode; children: React.ReactNode;
  }) {
    return (
      <div style={{ ...glass, padding: "24px", border: `1px solid ${accentBorder}`, animation: "fadeSlideUp 0.4s ease both" }}>
        <h4 style={{ margin: "0 0 18px", fontSize: "0.95rem", fontWeight: 800, color, display: "flex", alignItems: "center", gap: "8px" }}>
          {icon}
          {title}
        </h4>
        {children}
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .ai-spin { animation: spin 1s linear infinite; }
      `}</style>

      <div style={{ display: "flex", flexDirection: "column", gap: "28px", paddingBottom: "48px" }}>

        {/* ── Header ── */}
        <div>
          <h2 style={{ margin: 0, fontSize: "1.75rem", fontWeight: 900, letterSpacing: "-0.03em", color: textColor, display: "flex", alignItems: "center", gap: "10px" }}>
            HandHorse Insights
            <Sparkles size={24} color="#3b82f6" />
          </h2>
          <p style={{ margin: "4px 0 0", fontSize: "0.9rem", color: mutedColor }}>
            Análise avançada de manejo e genética via HandHorse IA.
          </p>
        </div>

        {/* ── Main grid ── */}
        <div className={styles.genealogyGrid}>

          {/* ── Sidebar (combobox accordion) ── */}
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
                <div style={{ width: "32px", height: "32px", borderRadius: "10px", overflow: "hidden", flexShrink: 0 }}>
                  <img src={selectedHorse.photoUrl} alt={selectedHorse.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
                <span style={{ fontSize: "0.83rem", fontWeight: 600, color: textColor, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {selectedHorse.name}
                </span>
              </div>
              {isOpen
                ? <ChevronUp size={15} color={mutedColor} style={{ flexShrink: 0 }} />
                : <ChevronDown size={15} color={mutedColor} style={{ flexShrink: 0 }} />
              }
            </button>

            {/* Accordion panel */}
            <div
              style={{
                maxHeight: isOpen ? "min(300px, 45svh)" : "0px",
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
                    {`Sem resultados para "${searchQuery}"`}
                  </p>
                ) : (
                  filteredHorses.map((h) => {
                    const active = selectedHorse.id === h.id;
                    return (
                      <button
                        key={h.id}
                        type="button"
                        onClick={() => { setSelectedHorse(h); setInsight(null); setIsOpen(false); setSearchQuery(""); }}
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
                        <span style={{ fontSize: "0.82rem", fontWeight: 600, color: active ? "#3b82f6" : textColor, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {h.name}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Generate button – always visible */}
            <button
              type="button"
              disabled={loading}
              onClick={handleGenerate}
              style={{
                marginTop: "12px",
                width: "100%",
                padding: "14px 0",
                borderRadius: "16px",
                border: "none",
                background: loading ? (isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)") : "linear-gradient(135deg, #2563eb, #1d4ed8)",
                color: loading ? mutedColor : "#fff",
                fontWeight: 700,
                fontSize: "0.9rem",
                cursor: loading ? "default" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                boxShadow: loading ? "none" : "0 4px 16px rgba(37,99,235,0.4)",
                transition: "opacity 0.2s",
                boxSizing: "border-box",
              }}
            >
              {loading
                ? <><RefreshCw size={18} className="ai-spin" /> Analisando...</>
                : <><BrainCircuit size={18} /> Gerar Análise</>
              }
            </button>
          </div>

          {/* ── Main panel ── */}
          <div>
            {/* Loading */}
            {loading && (
              <div style={{ ...glass, padding: "64px 24px", minHeight: "460px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "20px" }}>
                <div style={{
                  width: "64px", height: "64px",
                  borderRadius: "50%",
                  border: "4px solid rgba(59,130,246,0.15)",
                  borderTop: "4px solid #3b82f6",
                  animation: "spin 1s linear infinite",
                }} />
                <div style={{ textAlign: "center" }}>
                  <p style={{ margin: "0 0 6px", fontSize: "1.1rem", fontWeight: 700, color: textColor }}>
                    HandHorse AI em ação...
                  </p>
                  <p style={{ margin: 0, fontSize: "0.85rem", color: mutedColor }}>
                    Analisando linhagem, histórico e dados de manejo de <strong style={{ color: "#3b82f6" }}>{selectedHorse.name}</strong>.
                  </p>
                </div>
              </div>
            )}

            {/* Empty state */}
            {!loading && !insight && (
              <div
                style={{
                  ...glass,
                  padding: "64px 24px",
                  minHeight: "460px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "16px",
                  textAlign: "center",
                  borderStyle: "dashed",
                }}
              >
                <div style={{ width: "80px", height: "80px", borderRadius: "50%", backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(15,23,42,0.05)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <BrainCircuit size={40} color={mutedColor} />
                </div>
                <div>
                  <h4 style={{ margin: "0 0 8px", fontSize: "1.2rem", fontWeight: 800, color: textColor }}>
                    Pronto para a análise?
                  </h4>
                  <p style={{ margin: 0, fontSize: "0.85rem", color: mutedColor, maxWidth: "380px", lineHeight: 1.6 }}>
                    Selecione um cavalo e clique em <strong style={{ color: "#3b82f6" }}>Gerar Análise</strong> para obter insights de saúde, dieta, valor de mercado e sugestões de cruzamento.
                  </p>
                </div>
                {/* Feature pills */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", justifyContent: "center", marginTop: "8px" }}>
                  {["Manejo personalizado", "Riscos de saúde", "Dieta ideal", "Valor de mercado", "Cruzamentos"].map((f) => (
                    <span key={f} style={{ padding: "4px 12px", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 600, backgroundColor: isDark ? "rgba(59,130,246,0.1)" : "rgba(59,130,246,0.08)", color: "#3b82f6", border: "1px solid rgba(59,130,246,0.2)" }}>
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Insights */}
            {!loading && insight && (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ ...glass, padding: "18px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ width: "48px", height: "48px", borderRadius: "14px", overflow: "hidden", flexShrink: 0 }}>
                      <img src={selectedHorse.photoUrl} alt={selectedHorse.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                    <div>
                      <p style={{ margin: "0 0 4px", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: mutedColor }}>
                        Resultado pronto para compartilhar
                      </p>
                      <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 800, color: textColor }}>
                        {selectedHorse.name}
                      </h3>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={handleOpenInsightPdf}
                      disabled={isExporting}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "12px 18px",
                        borderRadius: "14px",
                        border: `1px solid ${isDark ? "rgba(255,255,255,0.12)" : "rgba(148,163,184,0.25)"}`,
                        background: isDark ? "rgba(255,255,255,0.04)" : "#ffffff",
                        color: isExporting ? mutedColor : textColor,
                        fontWeight: 700,
                        fontSize: "0.85rem",
                        cursor: isExporting ? "default" : "pointer",
                      }}
                    >
                      <ExternalLink size={16} />
                      {isExporting ? "Gerando PDF..." : "Abrir PDF"}
                    </button>

                    <button
                      type="button"
                      onClick={handleShareInsight}
                      disabled={isExporting}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "12px 18px",
                        borderRadius: "14px",
                        border: "none",
                        background: isExporting ? (isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)") : "linear-gradient(135deg, #2563eb, #1d4ed8)",
                        color: isExporting ? mutedColor : "#fff",
                        fontWeight: 700,
                        fontSize: "0.85rem",
                        cursor: isExporting ? "default" : "pointer",
                        boxShadow: isExporting ? "none" : "0 4px 16px rgba(37,99,235,0.35)",
                      }}
                    >
                      {isExporting ? <Download size={16} /> : <Share2 size={16} />}
                      {isExporting ? "Gerando PDF..." : "Compartilhar PDF"}
                    </button>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {/* Manejo */}
                  <InsightCard
                    title="Manejo Recomendado"
                    color="#3b82f6"
                    accentBorder="rgba(59,130,246,0.2)"
                    icon={<CheckCircle2 size={18} color="#3b82f6" />}
                  >
                    <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "10px" }}>
                      {insight.tips.map((tip, i) => (
                        <li key={i} style={{ display: "flex", gap: "10px", fontSize: "0.83rem", color: mutedColor, lineHeight: 1.5 }}>
                          <span style={{ width: "20px", height: "20px", borderRadius: "50%", backgroundColor: "rgba(59,130,246,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.6rem", fontWeight: 800, color: "#3b82f6", flexShrink: 0, marginTop: "1px" }}>
                            {i + 1}
                          </span>
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </InsightCard>

                  {/* Saúde */}
                  <InsightCard
                    title="Predisposições de Saúde"
                    color="#f43f5e"
                    accentBorder="rgba(244,63,94,0.2)"
                    icon={<AlertTriangle size={18} color="#f43f5e" />}
                  >
                    <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "10px" }}>
                      {insight.healthRisks.map((item, i) => (
                        <li key={i} style={{ display: "flex", gap: "10px", fontSize: "0.83rem", color: mutedColor, lineHeight: 1.5 }}>
                          <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#f43f5e", flexShrink: 0, marginTop: "6px" }} />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </InsightCard>
                </div>

                {/* Diet + Value */}
                <InsightCard
                  title="Dieta Sugerida"
                  color="#10b981"
                  accentBorder="rgba(16,185,129,0.2)"
                  icon={<Salad size={18} color="#10b981" />}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontSize: "0.85rem", color: mutedColor, lineHeight: 1.7 }}>
                        {insight.diet}
                      </p>
                    </div>
                    <div style={{ padding: "16px", borderRadius: "16px", background: isDark ? "rgba(16,185,129,0.08)" : "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)", textAlign: "center" }}>
                      <p style={{ margin: "0 0 4px", fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: mutedColor }}>
                        Valor Estimado de Mercado
                      </p>
                      <p style={{ margin: 0, fontSize: "1.6rem", fontWeight: 900, color: "#10b981" }}>
                        {insight.estimatedValue}
                      </p>
                      <p style={{ margin: "4px 0 0", fontSize: "0.65rem", color: mutedColor }}>
                        Baseado em raça, linhagem e condição atual.
                      </p>
                    </div>
                  </div>
                </InsightCard>

                {/* Breeding recommendations */}
                {insight.breedingMatch.length > 0 && (
                  <InsightCard
                    title="Recomendações de Cruzamento"
                    color="#8b5cf6"
                    accentBorder="rgba(139,92,246,0.2)"
                    icon={<GitMerge size={18} color="#8b5cf6" />}
                  >
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      {insight.breedingMatch.map((match, i) => (
                        <div
                          key={i}
                          style={{ display: "flex", alignItems: "flex-start", gap: "12px", padding: "12px", borderRadius: "14px", background: isDark ? "rgba(139,92,246,0.08)" : "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.15)" }}
                        >
                          <div style={{ width: "36px", height: "36px", borderRadius: "12px", backgroundColor: "rgba(139,92,246,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <GitMerge size={16} color="#8b5cf6" />
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px", flexWrap: "wrap" }}>
                              <p style={{ margin: 0, fontSize: "0.85rem", fontWeight: 800, color: textColor }}>{match.name}</p>
                              <span style={{ padding: "2px 8px", borderRadius: "999px", fontSize: "0.6rem", fontWeight: 700, backgroundColor: "rgba(139,92,246,0.15)", color: "#8b5cf6" }}>
                                {match.breed}
                              </span>
                            </div>
                            <p style={{ margin: 0, fontSize: "0.78rem", color: mutedColor, lineHeight: 1.5 }}>
                              {match.reason}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </InsightCard>
                )}

                {/* Gelding notice */}
                {insight.breedingMatch.length === 0 && selectedHorse.gender === "Gelding" && (
                  <div style={{ padding: "14px 18px", borderRadius: "16px", background: isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.03)", border: `1px dashed ${isDark ? "rgba(255,255,255,0.1)" : "rgba(148,163,184,0.3)"}`, textAlign: "center" }}>
                    <p style={{ margin: 0, fontSize: "0.8rem", color: mutedColor, fontStyle: "italic" }}>
                      Recomendações de cruzamento não aplicáveis para animais castrados.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
