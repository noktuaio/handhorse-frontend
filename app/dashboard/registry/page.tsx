"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type FormEvent,
} from "react";
import {
  Search,
  Plus,
  Calendar,
  X,
  ChevronRight,
  ImageIcon,
  FileText,
  Download,
  Upload,
  Pencil,
  Trash2,
} from "lucide-react";
import { useTheme } from "@/shared/ui/theme-context";
import { buildHorseHistoryPdfFile } from "@/shared/domain/dashboard/history-pdf";
import { mapApiAnimalToHorse } from "@/shared/domain/dashboard/map-api-animal";
import type { Horse } from "@/shared/domain/dashboard/index";
import {
  createAnimalApi,
  deleteAnimalApi,
  listAnimalsApi,
  listAwardCatalogApi,
  listBooksApi,
  listBreedersApi,
  listBreedsApi,
  listExamTypesApi,
  listOwnersApi,
  listStatusesApi,
  updateAnimalApi,
  type ApiAwardCatalogRow,
  type ApiBookRow,
  type ApiBreedRow,
  type ApiBreederRow,
  type ApiExamTypeRow,
  type ApiOwnerRow,
  type ApiStatusRow,
} from "@/shared/infrastructure/animals/animals-api";
import { useNavLoadingSetter } from "../nav-loading-context";
import { useScrollLock } from "@/shared/ui/use-scroll-lock";
import styles from "../shell.module.css";

// ── translations ─────────────────────────────────────────────────────────────

const GENDER_PT: Record<Horse["gender"], string> = {
  Stallion: "Garanhão",
  Mare: "Égua",
  Gelding: "Castrado",
};

const STATUS_PT: Record<Horse["status"], string> = {
  Active: "Ativo",
  Sold: "Vendido",
  Retired: "Aposentado",
};

const STATUS_STYLE: Record<Horse["status"], { bg: string; color: string }> = {
  Active:  { bg: "rgba(16,185,129,0.15)",  color: "#10b981" },
  Sold:    { bg: "rgba(59,130,246,0.15)",   color: "#3b82f6" },
  Retired: { bg: "rgba(107,114,128,0.15)", color: "#9ca3af" },
};

const GENDER_ICON: Record<Horse["gender"], string> = {
  Stallion: "♂",
  Mare:     "♀",
  Gelding:  "⚬",
};

const DEFAULT_PHOTO = "https://picsum.photos/seed/newhorse/400/300";

type BookSelectOption = { id: string; label: string };

function bookRowsToOptions(rows: ApiBookRow[]): BookSelectOption[] {
  return rows.map((b) => ({
    id: b.id,
    label: (b.description && b.description.trim()) || b.code,
  }));
}

function horseToFormState(horse: Horse): Partial<Horse> {
  return {
    name: horse.name,
    breed: horse.breed,
    breedId: horse.breedId,
    registry: horse.registry,
    gender: horse.gender,
    birthDate: horse.birthDate,
    coatColor: horse.coatColor,
    microchip: horse.microchip,
    photoUrl: horse.photoUrl,
    breederId: horse.breederId,
    bookId: horse.bookId,
    sireId: horse.sireId,
    damId: horse.damId,
    status: horse.status,
    alive: horse.alive,
    blocked: horse.blocked,
    notes: horse.notes,
  };
}

function buildEmptyHorse(breederId?: string, bookId?: string): Partial<Horse> {
  return {
    name: "",
    breed: "",
    breedId: undefined,
    registry: "",
    gender: "Stallion",
    birthDate: "",
    coatColor: "",
    microchip: "",
    breederId,
    bookId,
    sireId: undefined,
    damId: undefined,
    status: "Active",
    alive: true,
    blocked: false,
    notes: "",
    photoUrl: DEFAULT_PHOTO,
  };
}

// ── gallery helpers ───────────────────────────────────────────────────────────

// For each horse we generate 6 gallery images:
// slot 0 → real photoUrl, slots 1-5 → picsum with horse-themed seeds
const GALLERY_SEEDS: Record<string, string[]> = {
  "1": ["horse1a", "horse1b", "horse1c", "horse1d", "horse1e"],
  "2": ["horse2a", "horse2b", "horse2c", "horse2d", "horse2e"],
  "3": ["horse3a", "horse3b", "horse3c", "horse3d", "horse3e"],
  "4": ["horse4a", "horse4b", "horse4c", "horse4d", "horse4e"],
  "5": ["horse5a", "horse5b", "horse5c", "horse5d", "horse5e"],
};

function getGallery(horse: Horse): string[] {
  const extra = (GALLERY_SEEDS[horse.id] ?? ["a","b","c","d","e"]).map(
    (s) => `https://picsum.photos/seed/${s}/600/400`
  );
  return [horse.photoUrl, ...extra];
}

// ── horse detail modal ────────────────────────────────────────────────────────

type Tab = "dados" | "galeria";

function HorseModal({
  horse,
  allHorses,
  onClose,
  isDark,
  breeders,
  owners,
  bookOptions,
  onEdit,
  onDelete,
  deleteBusy,
}: {
  horse: Horse;
  allHorses: Horse[];
  onClose: () => void;
  isDark: boolean;
  breeders: ApiBreederRow[];
  owners: ApiOwnerRow[];
  bookOptions: BookSelectOption[];
  onEdit: () => void;
  onDelete: () => void;
  deleteBusy: boolean;
}) {
  const [tab, setTab] = useState<Tab>("dados");
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [isExportingHistory, setIsExportingHistory] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const gallery = [horse.photoUrl, ...uploadedImages, ...getGallery(horse).slice(1)];

  const textColor  = isDark ? "#E5E7EB" : "#0f172a";
  const mutedColor = isDark ? "#9CA3AF" : "#64748b";
  const divider    = isDark ? "rgba(255,255,255,0.08)" : "rgba(148,163,184,0.18)";

  const modalBg: CSSProperties = {
    background: isDark ? "rgba(5,10,30,0.97)" : "rgba(255,255,255,0.98)",
    border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(148,163,184,0.25)"}`,
    backdropFilter: "blur(28px)",
    WebkitBackdropFilter: "blur(28px)",
    boxShadow: isDark ? "0 28px 70px rgba(0,0,0,0.85)" : "0 28px 70px rgba(15,23,42,0.18)",
    borderRadius: "32px",
  };

  const ss = STATUS_STYLE[horse.status];
  const sire = allHorses.find((h) => h.id === horse.sireId);
  const dam  = allHorses.find((h) => h.id === horse.damId);
  const breeder = breeders.find(({ id }) => id === horse.breederId);
  const owner = owners.find(({ id }) => id === horse.currentOwnerId);
  const book = bookOptions.find(({ id }) => id === horse.bookId);

  const tabBtn = (id: Tab, label: string, icon: React.ReactNode) => {
    const active = tab === id;
    return (
      <button
        key={id}
        type="button"
        onClick={() => setTab(id)}
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "7px",
          padding: "11px 0",
          borderRadius: "14px",
          border: "none",
          cursor: "pointer",
          fontSize: "0.83rem",
          fontWeight: 700,
          transition: "all 0.15s",
          backgroundColor: active
            ? isDark ? "rgba(37,99,235,0.25)" : "#2563eb"
            : "transparent",
          color: active ? (isDark ? "#93c5fd" : "#fff") : mutedColor,
          boxShadow: active ? "0 2px 12px rgba(37,99,235,0.3)" : "none",
        }}
      >
        {icon}
        {label}
      </button>
    );
  };

  function DataRow({ label, value }: { label: string; value: string }) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "3px", padding: "12px 0", borderBottom: `1px solid ${divider}` }}>
        <p style={{ margin: 0, fontSize: "0.63rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: mutedColor }}>
          {label}
        </p>
        <p style={{ margin: 0, fontSize: "0.93rem", fontWeight: 700, color: textColor }}>
          {value}
        </p>
      </div>
    );
  }

  async function handleOpenHistoryPdf() {
    setIsExportingHistory(true);

    try {
      const pdfFile = await buildHorseHistoryPdfFile(horse, { allHorses });
      const fileUrl = URL.createObjectURL(pdfFile);
      const openedWindow = window.open(fileUrl, "_blank", "noopener,noreferrer");

      if (!openedWindow) {
        const link = document.createElement("a");
        link.href = fileUrl;
        link.download = pdfFile.name;
        link.click();
      }

      window.setTimeout(() => {
        URL.revokeObjectURL(fileUrl);
      }, 60_000);
    } finally {
      setIsExportingHistory(false);
    }
  }

  function handleGalleryUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const objectUrl = URL.createObjectURL(file);

    setUploadedImages((currentImages) => [objectUrl, ...currentImages]);
    event.target.value = "";
  }

  return (
    <>
      {/* Backdrop */}
      <div
        style={{ position: "fixed", inset: 0, zIndex: 100, backgroundColor: "rgba(0,0,0,0.65)", backdropFilter: "blur(7px)", WebkitBackdropFilter: "blur(7px)" }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 101,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "16px",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            ...modalBg,
            width: "100%",
            maxWidth: "560px",
            maxHeight: "90vh",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            pointerEvents: "auto",
            animation: "slideUp 0.28s cubic-bezier(.22,.8,.34,1) both",
          }}
        >
          {/* Hero photo */}
          <div style={{ position: "relative", height: "200px", flexShrink: 0 }}>
            <img
              src={horse.photoUrl}
              alt={horse.name}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
            {/* gradient overlay */}
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 60%)" }} />
            {/* Status badge */}
            <span style={{ position: "absolute", top: "14px", left: "16px", padding: "4px 12px", borderRadius: "999px", fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", backgroundColor: ss.bg, color: ss.color, backdropFilter: "blur(8px)", border: `1px solid ${ss.color}33` }}>
              {STATUS_PT[horse.status]}
            </span>
            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              style={{ position: "absolute", top: "14px", right: "16px", width: "34px", height: "34px", borderRadius: "50%", border: "1px solid rgba(255,255,255,0.25)", background: "rgba(0,0,0,0.4)", backdropFilter: "blur(8px)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}
            >
              <X size={16} />
            </button>
            {/* Name overlay */}
            <div style={{ position: "absolute", bottom: "14px", left: "16px" }}>
              <h3 style={{ margin: 0, fontSize: "1.4rem", fontWeight: 900, color: "#fff", lineHeight: 1.1 }}>
                {horse.name}
              </h3>
              <p style={{ margin: "2px 0 0", fontSize: "0.8rem", color: "rgba(255,255,255,0.75)", fontWeight: 600 }}>
                {horse.breed} · <span style={{ color: "#93c5fd" }}>{GENDER_ICON[horse.gender]} {GENDER_PT[horse.gender]}</span>
              </p>
            </div>
          </div>

          {/* Tab switcher */}
          <div style={{ padding: "14px 16px 0", flexShrink: 0 }}>
            <div style={{ display: "flex", gap: "6px", padding: "6px", borderRadius: "18px", backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(15,23,42,0.06)" }}>
              {tabBtn("dados",   "Dados",   <FileText  size={15} />)}
              {tabBtn("galeria", "Galeria", <ImageIcon size={15} />)}
            </div>
            <button
              type="button"
              onClick={handleOpenHistoryPdf}
              disabled={isExportingHistory}
              style={{
                marginTop: "12px",
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                padding: "12px 16px",
                borderRadius: "14px",
                border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(148,163,184,0.25)"}`,
                background: isDark ? "rgba(255,255,255,0.04)" : "#ffffff",
                color: isExportingHistory ? mutedColor : textColor,
                fontSize: "0.85rem",
                fontWeight: 700,
                cursor: isExportingHistory ? "default" : "pointer",
              }}
            >
              <Download size={16} />
              {isExportingHistory ? "Gerando PDF…" : "Histórico"}
            </button>

            <div style={{ marginTop: "12px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  padding: "12px 14px",
                  borderRadius: "14px",
                  border: `1px solid ${isDark ? "rgba(255,255,255,0.12)" : "rgba(37,99,235,0.35)"}`,
                  background: isDark ? "rgba(37,99,235,0.15)" : "rgba(37,99,235,0.08)",
                  color: isDark ? "#93c5fd" : "#2563eb",
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                <Pencil size={16} />
                Editar
              </button>
              <button
                type="button"
                disabled={deleteBusy}
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  padding: "12px 14px",
                  borderRadius: "14px",
                  border: `1px solid ${isDark ? "rgba(248,113,113,0.35)" : "rgba(239,68,68,0.4)"}`,
                  background: isDark ? "rgba(239,68,68,0.12)" : "rgba(254,242,242,1)",
                  color: "#ef4444",
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  cursor: deleteBusy ? "not-allowed" : "pointer",
                  opacity: deleteBusy ? 0.7 : 1,
                }}
              >
                <Trash2 size={16} />
                {deleteBusy ? "Excluindo…" : "Excluir"}
              </button>
            </div>
          </div>

          {/* Scrollable body */}
          <div style={{ flex: 1, overflowY: "auto", padding: "0 16px 24px" }}>

            {/* ── DADOS ── */}
            {tab === "dados" && (
              <div style={{ paddingTop: "4px" }}>
                <DataRow label="Raça"        value={horse.breed} />
                <DataRow label="Registro"    value={horse.registry || "—"} />
                <DataRow label="Sexo"        value={`${GENDER_ICON[horse.gender]} ${GENDER_PT[horse.gender]}`} />
                <DataRow label="Nascimento"  value={new Date(horse.birthDate).toLocaleDateString("pt-BR")} />
                <DataRow label="Pelagem"     value={horse.coatColor || "—"} />
                <DataRow label="Microchip"   value={horse.microchip || "—"} />
                <DataRow label="Status"      value={STATUS_PT[horse.status]} />
                <DataRow label="Criador"     value={breeder?.name || "—"} />
                <DataRow label="Proprietário" value={owner?.name || "—"} />
                <DataRow label="Livro"       value={book?.label || "—"} />
                <DataRow label="Vivo"        value={horse.alive === false ? "Não" : "Sim"} />
                <DataRow label="Bloqueado"   value={horse.blocked ? "Sim" : "Não"} />
                <DataRow label="ID do Animal" value={`#${horse.id.padStart(4, "0")}`} />
                <DataRow label="Observações" value={horse.notes || "—"} />

                {(sire || dam) && (
                  <div style={{ marginTop: "6px" }}>
                    <p style={{ margin: "14px 0 10px", fontSize: "0.63rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: mutedColor }}>
                      Linhagem
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {sire && (
                        <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 12px", borderRadius: "14px", backgroundColor: isDark ? "rgba(59,130,246,0.08)" : "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.18)" }}>
                          <div style={{ width: "36px", height: "36px", borderRadius: "10px", overflow: "hidden", flexShrink: 0 }}>
                            <img src={sire.photoUrl} alt={sire.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          </div>
                          <div>
                            <p style={{ margin: 0, fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#3b82f6" }}>Pai</p>
                            <p style={{ margin: 0, fontSize: "0.85rem", fontWeight: 700, color: textColor }}>{sire.name}</p>
                          </div>
                        </div>
                      )}
                      {dam && (
                        <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 12px", borderRadius: "14px", backgroundColor: isDark ? "rgba(244,63,94,0.08)" : "rgba(244,63,94,0.06)", border: "1px solid rgba(244,63,94,0.18)" }}>
                          <div style={{ width: "36px", height: "36px", borderRadius: "10px", overflow: "hidden", flexShrink: 0 }}>
                            <img src={dam.photoUrl} alt={dam.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          </div>
                          <div>
                            <p style={{ margin: 0, fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#f43f5e" }}>Mãe</p>
                            <p style={{ margin: 0, fontSize: "0.85rem", fontWeight: 700, color: textColor }}>{dam.name}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── GALERIA ── */}
            {tab === "galeria" && (
              <div style={{ paddingTop: "12px" }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleGalleryUpload}
                  style={{ display: "none" }}
                />
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", marginBottom: "12px" }}>
                  <p style={{ margin: 0, fontSize: "0.75rem", color: mutedColor, fontWeight: 600 }}>
                    {gallery.length} fotos · toque para ampliar a imagem
                  </p>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "10px 14px",
                      borderRadius: "12px",
                      border: `1px solid ${isDark ? "rgba(255,255,255,0.12)" : "rgba(148,163,184,0.25)"}`,
                      background: isDark ? "rgba(255,255,255,0.05)" : "#ffffff",
                      color: textColor,
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      flexShrink: 0,
                    }}
                  >
                    <Upload size={14} />
                    Carregar foto
                  </button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "10px" }}>
                  {gallery.map((src, i) => (
                    <div
                      key={i}
                      onClick={() => setLightbox(src)}
                      style={{
                        borderRadius: "16px",
                        overflow: "hidden",
                        cursor: "pointer",
                        aspectRatio: "4/3",
                        position: "relative",
                        border: `1px solid ${divider}`,
                        transition: "transform 0.18s, box-shadow 0.18s",
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLDivElement).style.transform = "scale(1.03)";
                        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 24px rgba(0,0,0,0.25)";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLDivElement).style.transform = "scale(1)";
                        (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
                      }}
                    >
                      <img
                        src={src}
                        alt={`${horse.name} — foto ${i + 1}`}
                        loading="lazy"
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                      />
                      {/* order badge */}
                      <span style={{ position: "absolute", bottom: "6px", right: "8px", fontSize: "0.58rem", fontWeight: 700, color: "rgba(255,255,255,0.8)", background: "rgba(0,0,0,0.45)", padding: "2px 6px", borderRadius: "999px", backdropFilter: "blur(4px)" }}>
                        {i + 1}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{ position: "fixed", inset: 0, zIndex: 200, backgroundColor: "rgba(0,0,0,0.92)", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px", cursor: "zoom-out" }}
        >
          <button
            type="button"
            onClick={() => setLightbox(null)}
            aria-label="Fechar"
            style={{ position: "absolute", top: "20px", right: "20px", width: "38px", height: "38px", borderRadius: "50%", border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.08)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}
          >
            <X size={18} />
          </button>
          <img
            src={lightbox}
            alt="Imagem ampliada"
            style={{ maxWidth: "100%", maxHeight: "90vh", borderRadius: "16px", objectFit: "contain", boxShadow: "0 20px 60px rgba(0,0,0,0.8)" }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────

export default function RegistryPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [horses, setHorses] = useState<Horse[]>([]);
  const [breeders, setBreeders] = useState<ApiBreederRow[]>([]);
  const [owners, setOwners] = useState<ApiOwnerRow[]>([]);
  const [books, setBooks] = useState<ApiBookRow[]>([]);
  const [breedsList, setBreedsList] = useState<ApiBreedRow[]>([]);
  const [statuses, setStatuses] = useState<ApiStatusRow[]>([]);
  const [examTypes, setExamTypes] = useState<ApiExamTypeRow[]>([]);
  const [awardCatalog, setAwardCatalog] = useState<ApiAwardCatalogRow[]>([]);
  const [initialStatusId, setInitialStatusId] = useState("");
  /** Apenas consulta no formulário (não enviados no POST do animal). */
  const [refExamTypeId, setRefExamTypeId] = useState("");
  const [refAwardCatalogId, setRefAwardCatalogId] = useState("");
  const [loading, setLoading] = useState(true);
  const setNavLoading = useNavLoadingSetter();
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detailHorse, setDetailHorse] = useState<Horse | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [newHorse, setNewHorse] = useState<Partial<Horse>>(() => buildEmptyHorse());

  useScrollLock(showModal || !!detailHorse);

  const bookOptions = bookRowsToOptions(books);

  const breedOptionsForSelect = useMemo((): ApiBreedRow[] => {
    const list = [...breedsList];
    const bid = newHorse.breedId;
    if (bid && !list.some((b) => b.id === bid)) {
      list.unshift({
        id: bid,
        name: newHorse.breed?.trim() || "Raça registada",
        code: null,
        description: null,
        active: true,
        associationIds: [],
      });
    }
    return list;
  }, [breedsList, newHorse.breedId, newHorse.breed]);

  const breedCatalogSelectValue =
    newHorse.breedId && breedOptionsForSelect.some((b) => b.id === newHorse.breedId)
      ? newHorse.breedId
      : "";

  async function reloadBreedsList() {
    try {
      const rows = await listBreedsApi();
      setBreedsList(rows);
    } catch {
      /* mantém lista anterior em falha de rede */
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoadError(null);
        setLoading(true);
        const [animalRows, breederRows, ownerRows, bookRows, breedRows, statusRows, examTypeRows, awardRows] =
          await Promise.all([
            listAnimalsApi(),
            listBreedersApi(),
            listOwnersApi(),
            listBooksApi(),
            listBreedsApi().catch(() => [] as ApiBreedRow[]),
            listStatusesApi(),
            listExamTypesApi(),
            listAwardCatalogApi(),
          ]);
        if (cancelled) return;
        setHorses(animalRows.map(mapApiAnimalToHorse));
        setBreeders(breederRows);
        setOwners(ownerRows);
        setBooks(bookRows);
        setBreedsList(breedRows);
        setStatuses(statusRows);
        setExamTypes(examTypeRows);
        setAwardCatalog(awardRows);
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
      setNavLoading({
        message: "Estamos carregando a lista de animais para você",
      });
    } else {
      setNavLoading(null);
    }
    return () => setNavLoading(null);
  }, [loading, setNavLoading]);

  const glass: CSSProperties = {
    background: isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.75)",
    border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(148,163,184,0.2)"}`,
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    boxShadow: isDark ? "0 4px 32px rgba(0,0,0,0.5)" : "0 4px 32px rgba(15,23,42,0.08)",
  };

  const glassDark: CSSProperties = {
    background: isDark ? "rgba(2,6,23,0.96)" : "rgba(255,255,255,0.97)",
    border: `1px solid ${isDark ? "rgba(255,255,255,0.12)" : "rgba(148,163,184,0.25)"}`,
    backdropFilter: "blur(24px)",
    WebkitBackdropFilter: "blur(24px)",
    boxShadow: isDark ? "0 24px 60px rgba(0,0,0,0.8)" : "0 24px 60px rgba(15,23,42,0.18)",
  };

  const inputStyle: CSSProperties = {
    width: "100%",
    padding: "12px 16px",
    borderRadius: "14px",
    border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(148,163,184,0.3)"}`,
    background: isDark ? "rgba(255,255,255,0.06)" : "rgba(248,250,252,1)",
    color: isDark ? "#E5E7EB" : "#0f172a",
    fontSize: "0.9rem",
    outline: "none",
    boxSizing: "border-box" as const,
  };

  const textColor  = isDark ? "#E5E7EB" : "#0f172a";
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

  function openEditFromCard(h: Horse) {
    setSaveError(null);
    setEditingId(h.id);
    setNewHorse(horseToFormState(h));
    setInitialStatusId("");
    setRefExamTypeId("");
    setRefAwardCatalogId("");
    void reloadBreedsList();
    setShowModal(true);
  }

  function confirmDeleteFromCard(h: Horse) {
    if (
      !window.confirm(
        `Excluir permanentemente o cadastro de «${h.name}»? Esta ação não pode ser desfeita.`,
      )
    ) {
      return;
    }
    setDeleteBusy(true);
    void (async () => {
      try {
        await deleteAnimalApi(h.id);
        setHorses((prev) => prev.filter((x) => x.id !== h.id));
      } catch (err) {
        window.alert(err instanceof Error ? err.message : "Não foi possível excluir o cadastro.");
      } finally {
        setDeleteBusy(false);
      }
    })();
  }

  const filtered = horses.filter(
    (h) =>
      h.name.toLowerCase().includes(search.toLowerCase()) ||
      (h.breed || "").toLowerCase().includes(search.toLowerCase()) ||
      (h.registry || "").toLowerCase().includes(search.toLowerCase())
  );

  async function handleFormSubmit(e: FormEvent) {
    e.preventDefault();
    setSaveError(null);
    if (!newHorse.breedId) {
      setSaveError("Selecione uma raça no catálogo.");
      return;
    }
    if (!editingId && !newHorse.name?.trim()) {
      setSaveError("O nome é obrigatório.");
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: newHorse.name,
        sex: newHorse.gender,
        birthDate: newHorse.birthDate,
        registry: newHorse.registry || null,
        coatColor: newHorse.coatColor || null,
        microchip: newHorse.microchip || null,
        breederId: newHorse.breederId || null,
        bookId: newHorse.bookId || null,
        fatherId: newHorse.sireId || null,
        motherId: newHorse.damId || null,
        photoUrl: newHorse.photoUrl === DEFAULT_PHOTO ? null : newHorse.photoUrl ?? null,
        alive: newHorse.alive,
        blocked: newHorse.blocked,
        notes: newHorse.notes || null,
        breedId: newHorse.breedId ?? null,
        breed: newHorse.breed?.trim() || null,
      };
      if (editingId) {
        const updated = await updateAnimalApi(editingId, payload);
        const mapped = mapApiAnimalToHorse(updated);
        setHorses((prev) => prev.map((h) => (h.id === editingId ? mapped : h)));
      } else {
        const created = await createAnimalApi({
          ...payload,
          ...(initialStatusId ? { initialStatusId } : {}),
        });
        setHorses((prev) => [...prev, mapApiAnimalToHorse(created)]);
      }
      setShowModal(false);
      setEditingId(null);
      setInitialStatusId("");
      setRefExamTypeId("");
      setRefAwardCatalogId("");
      setNewHorse(buildEmptyHorse(breeders[0]?.id, books[0]?.id));
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  function patch(fields: Partial<Horse>) {
    setNewHorse((prev) => ({ ...prev, ...fields }));
  }

  return (
    <>
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(24px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)   scale(1); }
        }
      `}</style>

      <div style={{ display: "flex", flexDirection: "column", gap: "28px", paddingBottom: "48px" }}>

        {loadError && !loading && (
          <p style={{ margin: 0, fontSize: "0.9rem", color: "#f87171" }} role="alert">
            {loadError}
          </p>
        )}

        {/* ── Header ── */}
        <div className={styles.registryHeader}>
          <div>
            <h2 style={{ margin: 0, fontSize: "1.75rem", fontWeight: 900, letterSpacing: "-0.03em", color: textColor }}>
              Registro de Cavalos
            </h2>
            <p style={{ margin: "4px 0 0", fontSize: "0.9rem", color: mutedColor }}>
              Gerencie todos os animais do seu haras.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setSaveError(null);
              setEditingId(null);
              setInitialStatusId("");
              setRefExamTypeId("");
              setRefAwardCatalogId("");
              setNewHorse(buildEmptyHorse(breeders[0]?.id, books[0]?.id));
              void reloadBreedsList();
              setShowModal(true);
            }}
            style={{
              display: "flex", alignItems: "center", gap: "8px",
              padding: "12px 22px", borderRadius: "16px", border: "none",
              backgroundColor: "#2563eb", color: "#fff", fontWeight: 700,
              fontSize: "0.9rem", cursor: "pointer",
              boxShadow: "0 4px 16px rgba(37,99,235,0.35)",
              flexShrink: 0, whiteSpace: "nowrap",
            }}
          >
            <Plus size={18} />
            Adicionar cavalo
          </button>
        </div>

        {/* ── Search ── */}
        <div style={{ position: "relative" }}>
          <Search
            size={18}
            style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", color: mutedColor, pointerEvents: "none" }}
          />
          <input
            type="text"
            placeholder="Buscar por nome ou raça..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ ...inputStyle, paddingLeft: "44px", paddingTop: "14px", paddingBottom: "14px", borderRadius: "18px", ...glass, border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(148,163,184,0.2)"}` }}
          />
        </div>

        {/* ── Cards grid ── */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: mutedColor }}>
            <p style={{ fontSize: "1rem", fontWeight: 600 }}>Nenhum cavalo encontrado</p>
            <p style={{ fontSize: "0.85rem", marginTop: "4px" }}>Tente outro termo de busca.</p>
          </div>
        ) : (
          <div className={styles.cardsGrid}>
            {filtered.map((horse) => {
              const ss = STATUS_STYLE[horse.status];
              return (
                <div
                  key={horse.id}
                  className={styles.horseCard}
                  style={{ ...glass, borderRadius: "28px", overflow: "hidden", display: "flex", flexDirection: "column" }}
                >
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setDetailHorse(horse)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setDetailHorse(horse);
                      }
                    }}
                    style={{ cursor: "pointer", flex: 1 }}
                  >
                    {/* Photo */}
                    <div style={{ position: "relative", height: "192px" }}>
                      <img
                        src={horse.photoUrl}
                        alt={horse.name}
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                      />
                      {/* Status badge */}
                      <span style={{ position: "absolute", top: "12px", right: "12px", padding: "4px 10px", borderRadius: "999px", fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", backgroundColor: ss.bg, color: ss.color, backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", border: `1px solid ${ss.color}33` }}>
                        {STATUS_PT[horse.status]}
                      </span>
                      {/* Detail hint */}
                      <div style={{ position: "absolute", bottom: "10px", right: "10px", width: "28px", height: "28px", borderRadius: "50%", backgroundColor: "rgba(0,0,0,0.45)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <ChevronRight size={14} color="#fff" />
                      </div>
                    </div>

                    {/* Info */}
                    <div style={{ padding: "20px" }}>
                      <h4 style={{ margin: "0 0 2px", fontSize: "1.1rem", fontWeight: 800, color: textColor }}>
                        {horse.name}
                      </h4>
                      <p style={{ margin: "0 0 14px", fontSize: "0.82rem", color: mutedColor }}>
                        {horse.breed}
                      </p>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.8rem", color: mutedColor }}>
                          <span style={{ fontSize: "1rem", color: "#3b82f6" }}>{GENDER_ICON[horse.gender]}</span>
                          {GENDER_PT[horse.gender]}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.8rem", color: mutedColor }}>
                          <Calendar size={13} color="#10b981" />
                          {new Date(horse.birthDate).toLocaleDateString("pt-BR")}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      borderTop: `1px solid ${dividerColor}`,
                      padding: "12px 16px",
                      display: "flex",
                      justifyContent: "flex-end",
                      alignItems: "center",
                      gap: "8px",
                      flexWrap: "wrap",
                    }}
                  >
                    <button
                      type="button"
                      disabled={deleteBusy}
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditFromCard(horse);
                      }}
                      style={{ ...cardFooterBtn, color: mutedColor }}
                    >
                      <Pencil size={16} aria-hidden />
                      Editar
                    </button>
                    <button
                      type="button"
                      disabled={deleteBusy}
                      onClick={(e) => {
                        e.stopPropagation();
                        confirmDeleteFromCard(horse);
                      }}
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
            })}
          </div>
        )}
      </div>

      {/* ── Horse detail modal ── */}
      {detailHorse && (
        <HorseModal
          horse={detailHorse}
          allHorses={horses}
          onClose={() => setDetailHorse(null)}
          isDark={isDark}
          breeders={breeders}
          owners={owners}
          bookOptions={bookOptions}
          onEdit={() => {
            const h = detailHorse;
            if (!h) return;
            setSaveError(null);
            setEditingId(h.id);
            setNewHorse(horseToFormState(h));
            setInitialStatusId("");
            setRefExamTypeId("");
            setRefAwardCatalogId("");
            setDetailHorse(null);
            void reloadBreedsList();
            setShowModal(true);
          }}
          onDelete={() => {
            const h = detailHorse;
            if (!h) return;
            if (
              !window.confirm(
                `Excluir permanentemente o cadastro de «${h.name}»? Esta ação não pode ser desfeita.`,
              )
            ) {
              return;
            }
            setDeleteBusy(true);
            void (async () => {
              try {
                await deleteAnimalApi(h.id);
                setHorses((prev) => prev.filter((x) => x.id !== h.id));
                setDetailHorse(null);
              } catch (err) {
                window.alert(err instanceof Error ? err.message : "Não foi possível excluir o cadastro.");
              } finally {
                setDeleteBusy(false);
              }
            })();
          }}
          deleteBusy={deleteBusy}
        />
      )}

      {/* ── Add horse modal ── */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
          <div
            style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}
            onClick={() => {
              setShowModal(false);
              setEditingId(null);
            }}
          />
          <div style={{ ...glassDark, position: "relative", width: "100%", maxWidth: "480px", maxHeight: "calc(100vh - 32px)", overflowY: "auto", borderRadius: "28px", padding: "32px", boxSizing: "border-box" }}>
            <button
              type="button"
              onClick={() => {
                setShowModal(false);
                setEditingId(null);
              }}
              aria-label="Fechar"
              style={{ position: "absolute", top: "16px", right: "16px", width: "32px", height: "32px", borderRadius: "50%", border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(148,163,184,0.3)"}`, background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: mutedColor }}
            >
              <X size={16} />
            </button>

            <h3 style={{ margin: "0 0 8px", fontSize: "1.4rem", fontWeight: 900, color: textColor }}>
              {editingId ? "Editar Animal" : "Novo Animal"}
            </h3>
            <p style={{ margin: "0 0 20px", fontSize: "0.78rem", lineHeight: 1.45, color: mutedColor }}>
              Dados carregados da API: {breeders.length} criadores · {books.length} livros · {owners.length}{" "}
              proprietários · {breedsList.length} raças no catálogo ·{" "}
              {horses.length} animais (pai/mãe) · {statuses.length} estados cadastrados · {examTypes.length} tipos de
              exame · {awardCatalog.length} prêmios no catálogo.
            </p>

            <form onSubmit={handleFormSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <input type="text" required placeholder="Nome do Cavalo" value={newHorse.name} onChange={(e) => patch({ name: e.target.value })} style={inputStyle} />

              <select
                value={breedCatalogSelectValue}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "") {
                    patch({ breedId: undefined, breed: "" });
                  } else {
                    const row = breedOptionsForSelect.find((b) => b.id === v);
                    patch({ breedId: v, breed: row?.name ?? "" });
                  }
                }}
                style={inputStyle}
                aria-label="Raça (catálogo)"
              >
                <option value="">Selecione uma raça no catálogo…</option>
                {breedOptionsForSelect.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                    {b.code ? ` (${b.code})` : ""}
                  </option>
                ))}
              </select>

              {breedOptionsForSelect.length === 0 && (
                <p style={{ margin: 0, fontSize: "0.78rem", color: mutedColor, lineHeight: 1.4 }}>
                  Não há raças no catálogo. Cadastre raças na API.
                </p>
              )}

              <input type="text" placeholder="Registro" value={newHorse.registry || ""} onChange={(e) => patch({ registry: e.target.value })} style={inputStyle} />

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <select value={newHorse.gender} onChange={(e) => patch({ gender: e.target.value as Horse["gender"] })} style={inputStyle}>
                  <option value="Stallion">Garanhão</option>
                  <option value="Mare">Égua</option>
                  <option value="Gelding">Castrado</option>
                </select>
                <input type="date" required value={newHorse.birthDate} onChange={(e) => patch({ birthDate: e.target.value })} style={inputStyle} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <input type="text" placeholder="Pelagem" value={newHorse.coatColor || ""} onChange={(e) => patch({ coatColor: e.target.value })} style={inputStyle} />
                <input type="text" placeholder="Microchip" value={newHorse.microchip || ""} onChange={(e) => patch({ microchip: e.target.value })} style={inputStyle} />
              </div>

              <select value={newHorse.breederId || ""} onChange={(e) => patch({ breederId: e.target.value })} style={inputStyle}>
                <option value="">Criador (opcional)</option>
                {breeders.map((breeder) => (
                  <option key={breeder.id} value={breeder.id}>
                    {breeder.name}
                  </option>
                ))}
              </select>

              <select value={newHorse.bookId || ""} onChange={(e) => patch({ bookId: e.target.value })} style={inputStyle}>
                <option value="">Livro (opcional)</option>
                {bookOptions.map((book) => (
                  <option key={book.id} value={book.id}>
                    {book.label}
                  </option>
                ))}
              </select>

              {!editingId && (
                <select
                  value={initialStatusId}
                  onChange={(e) => setInitialStatusId(e.target.value)}
                  style={inputStyle}
                >
                  <option value="">Estado inicial no livro (opcional)</option>
                  {statuses.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code}) — {s.group}
                    </option>
                  ))}
                </select>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <select
                  value={refExamTypeId}
                  onChange={(e) => setRefExamTypeId(e.target.value)}
                  style={inputStyle}
                  aria-label="Tipos de exame (dados da API)"
                >
                  <option value="">Tipo de exame (consulta — {examTypes.length} na base)</option>
                  {examTypes.map((ex) => (
                    <option key={ex.id} value={ex.id}>
                      {ex.name}
                    </option>
                  ))}
                </select>
                <select
                  value={refAwardCatalogId}
                  onChange={(e) => setRefAwardCatalogId(e.target.value)}
                  style={inputStyle}
                  aria-label="Catálogo de prêmios (dados da API)"
                >
                  <option value="">Prêmio ou evento (consulta — {awardCatalog.length} no catálogo)</option>
                  {awardCatalog.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                      {a.eventName ? ` — ${a.eventName}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <select value={newHorse.sireId || ""} onChange={(e) => patch({ sireId: e.target.value || undefined })} style={inputStyle}>
                  <option value="">Pai não informado</option>
                  {horses
                    .filter((horse) => horse.id !== editingId)
                    .map((horse) => (
                      <option key={horse.id} value={horse.id}>
                        {horse.name}
                      </option>
                    ))}
                </select>
                <select value={newHorse.damId || ""} onChange={(e) => patch({ damId: e.target.value || undefined })} style={inputStyle}>
                  <option value="">Mãe não informada</option>
                  {horses
                    .filter((horse) => horse.id !== editingId)
                    .map((horse) => (
                      <option key={horse.id} value={horse.id}>
                        {horse.name}
                      </option>
                    ))}
                </select>
              </div>

              <select value={newHorse.status} onChange={(e) => patch({ status: e.target.value as Horse["status"] })} style={inputStyle}>
                <option value="Active">Ativo</option>
                <option value="Sold">Vendido</option>
                <option value="Retired">Aposentado</option>
              </select>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <select value={newHorse.alive === false ? "false" : "true"} onChange={(e) => patch({ alive: e.target.value === "true" })} style={inputStyle}>
                  <option value="true">Animal vivo</option>
                  <option value="false">Animal não está vivo</option>
                </select>
                <select value={newHorse.blocked ? "true" : "false"} onChange={(e) => patch({ blocked: e.target.value === "true" })} style={inputStyle}>
                  <option value="false">Cadastro liberado</option>
                  <option value="true">Cadastro bloqueado</option>
                </select>
              </div>

              <textarea placeholder="Observações" value={newHorse.notes || ""} onChange={(e) => patch({ notes: e.target.value })} style={{ ...inputStyle, minHeight: "96px", resize: "vertical" }} />

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
                  backgroundColor: saving ? "#64748b" : "#2563eb",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: "0.95rem",
                  cursor: saving ? "not-allowed" : "pointer",
                  boxShadow: "0 4px 16px rgba(37,99,235,0.35)",
                  boxSizing: "border-box",
                }}
              >
                {saving ? "Salvando…" : editingId ? "Salvar alterações" : "Cadastrar cavalo"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
