import { jsPDF } from "jspdf";
import { registerInterPdfFont } from "@/shared/config/pdf-inter-fonts";
import {
  AWARD_CATEGORY_PT,
  AWARD_PLACEMENT_PT,
  HEALTH_TYPE_PT,
} from "@/shared/domain/dashboard/index";
import type { Horse } from "@/shared/domain/dashboard/index";
import { mapApiAnimalToHorse } from "@/shared/domain/dashboard/map-api-animal";
import { getGenealogySnapshotFromHorses } from "@/shared/domain/dashboard/genealogy";
import { fetchAnimalHistoryDataset } from "@/shared/infrastructure/animals/animal-history-dataset";
import { listAnimalsApi } from "@/shared/infrastructure/animals/animals-api";

const BRAND_BLUE: [number, number, number] = [37, 99, 235];
const TEXT_PRIMARY: [number, number, number] = [15, 23, 42];
const TEXT_SECONDARY: [number, number, number] = [71, 85, 105];
const DIVIDER_COLOR: [number, number, number] = [226, 232, 240];
const CARD_BG: [number, number, number] = [255, 255, 255];
const SECTION_BG: [number, number, number] = [241, 245, 249];
const FOOTER_HEIGHT = 28;
const HEADER_CARD_HEIGHT = 56;
const MARGIN = 56;
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR");
}

function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
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

export async function buildHorseHistoryPdfFile(
  currentHorse: Horse,
  options?: { allHorses?: Horse[] },
): Promise<File> {
  const [dataset, allHorses] = await Promise.all([
    fetchAnimalHistoryDataset(currentHorse.id),
    options?.allHorses?.length
      ? Promise.resolve(options.allHorses)
      : listAnimalsApi().then((rows) => rows.map(mapApiAnimalToHorse)),
  ]);

  const genealogySnapshot = getGenealogySnapshotFromHorses(currentHorse, allHorses);

  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  registerInterPdfFont(pdf);

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const contentWidth = pageWidth - MARGIN * 2;
  const heroImageHeight = (contentWidth * 3) / 4;
  let cursorY = MARGIN + HEADER_CARD_HEIGHT + 30;

  const ensureSpace = (requiredHeight: number) => {
    if (cursorY + requiredHeight <= pageHeight - MARGIN - FOOTER_HEIGHT) {
      return;
    }

    pdf.addPage();
    drawPageHeader();
    cursorY = MARGIN + HEADER_CARD_HEIGHT + 30;
  };

  const drawPageHeader = () => {
    pdf.setFillColor(...CARD_BG);
    pdf.setDrawColor(...DIVIDER_COLOR);
    pdf.setLineWidth(1);
    pdf.roundedRect(MARGIN, MARGIN, contentWidth, HEADER_CARD_HEIGHT, 12, 12, "FD");

    if (handHorseLogo) {
      pdf.addImage(handHorseLogo, "PNG", MARGIN + 14, MARGIN + 8, 32, 32, undefined, "FAST");
    }

    pdf.setTextColor(...TEXT_PRIMARY);
    pdf.setFont("Inter", "bold");
    pdf.setFontSize(21);
    pdf.text("HandHorse", MARGIN + 56, MARGIN + 24);
    pdf.setFont("Inter", "normal");
    pdf.setFontSize(10);
    pdf.setTextColor(...TEXT_SECONDARY);
    pdf.text("Histórico do Animal", MARGIN + 56, MARGIN + 40);
  };

  const drawPageFooter = (pageNumber: number, totalPages: number) => {
    const footerY = pageHeight - MARGIN + 6;
    pdf.setDrawColor(...DIVIDER_COLOR);
    pdf.setLineWidth(1);
    pdf.line(MARGIN, footerY - 14, pageWidth - MARGIN, footerY - 14);
    pdf.setFont("Inter", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(...TEXT_SECONDARY);
    pdf.text(`Página ${pageNumber} de ${totalPages}`, pageWidth - MARGIN, footerY, { align: "right" });
  };

  const drawSectionCard = (height: number) => {
    ensureSpace(height);
    pdf.setFillColor(...CARD_BG);
    pdf.setDrawColor(...DIVIDER_COLOR);
    pdf.setLineWidth(1);
    pdf.roundedRect(MARGIN, cursorY, contentWidth, height, 12, 12, "FD");
  };

  const addSectionTitle = (title: string, color: [number, number, number], cardTop: number) => {
    pdf.setFillColor(...SECTION_BG);
    pdf.roundedRect(MARGIN + 12, cardTop + 12, contentWidth - 24, 24, 8, 8, "F");
    pdf.setFont("Inter", "bold");
    pdf.setFontSize(12);
    pdf.setTextColor(...color);
    pdf.text(title, MARGIN + 20, cardTop + 28);
  };

  const addParagraph = (text: string, indent = 0) => {
    const normalizedText = sanitizePdfText(text);
    const lines = pdf.splitTextToSize(normalizedText, contentWidth - indent - 18);
    ensureSpace(lines.length * 12 + 4);
    pdf.setFont("Inter", "normal");
    pdf.setFontSize(10);
    pdf.setTextColor(...TEXT_SECONDARY);
    pdf.text(lines, MARGIN + 14 + indent, cursorY);
    cursorY += lines.length * 12 + 4;
  };

  const addListSection = (
    title: string,
    color: [number, number, number],
    rows: string[],
    emptyLabel: string,
  ) => {
    const estimatedHeight = Math.max(96, rows.length * 30 + 56);
    drawSectionCard(estimatedHeight);
    const cardTop = cursorY;
    addSectionTitle(title, color, cardTop);
    cursorY += 50;

    if (rows.length === 0) {
      addParagraph(emptyLabel);
      cursorY = cardTop + estimatedHeight + 14;
      return;
    }

    rows.forEach((row, index) => addParagraph(`${index + 1}. ${row}`));
    cursorY = cardTop + estimatedHeight + 14;
  };

  const addGenealogySection = () => {
    const treeHeight = 360;
    drawSectionCard(treeHeight);
    const cardTop = cursorY;
    addSectionTitle("Árvore genealógica", BRAND_BLUE, cardTop);

    const snapshot = genealogySnapshot;
    const treeTop = cardTop + 58;
    const cardWidth = 102;
    const cardHeight = 48;
    const middleX = MARGIN + contentWidth / 2;
    const leftParentX = MARGIN + 88;
    const rightParentX = MARGIN + contentWidth - 88 - cardWidth;
    const grandParentGap = 10;
    const leftGrandBaseX = MARGIN + 18;
    const rightGrandBaseX = MARGIN + contentWidth - 18 - cardWidth * 2 - grandParentGap;
    const selectedX = middleX - cardWidth / 2;
    const offspringColumns = Math.max(1, Math.min(snapshot.offspring.length, 3));
    const offspringWidth = contentWidth - 80;
    const offspringGap = offspringColumns > 1 ? 10 : 0;
    const offspringCardWidth = Math.min(124, (offspringWidth - offspringGap * (offspringColumns - 1)) / offspringColumns);
    const offspringStartX = MARGIN + (contentWidth - (offspringCardWidth * offspringColumns + offspringGap * (offspringColumns - 1))) / 2;

    const drawHorseBox = (horse: Horse | undefined, label: string, x: number, y: number, highlight = false) => {
      pdf.setDrawColor(...DIVIDER_COLOR);
      pdf.setFillColor(highlight ? 219 : 255, highlight ? 234 : 255, highlight ? 254 : 255);
      pdf.roundedRect(x, y, cardWidth, cardHeight, 10, 10, "FD");
      pdf.setFont("Inter", "bold");
      pdf.setFontSize(6);
      pdf.setTextColor(highlight ? 37 : 71, highlight ? 99 : 85, highlight ? 235 : 105);
      pdf.text(label, x + 8, y + 11);
      pdf.setFont("Inter", "bold");
      pdf.setFontSize(8.5);
      pdf.setTextColor(...TEXT_PRIMARY);
      pdf.text(sanitizePdfText(horse?.name ?? "Desconhecido"), x + 8, y + 25, { maxWidth: cardWidth - 16 });
      pdf.setFont("Inter", "normal");
      pdf.setFontSize(7);
      pdf.setTextColor(...TEXT_SECONDARY);
      pdf.text(sanitizePdfText(horse?.breed ?? "Sem informação"), x + 8, y + 36, { maxWidth: cardWidth - 16 });
    };

    const drawLine = (startX: number, startY: number, endX: number, endY: number) => {
      pdf.setDrawColor(148, 163, 184);
      pdf.setLineWidth(1);
      pdf.line(startX, startY, endX, endY);
    };

    drawHorseBox(snapshot.gpSS, "Avô Paterno", leftGrandBaseX, treeTop);
    drawHorseBox(snapshot.gpSD, "Avó Paterna", leftGrandBaseX + cardWidth + grandParentGap, treeTop);
    drawHorseBox(snapshot.gpDS, "Avô Materno", rightGrandBaseX, treeTop);
    drawHorseBox(snapshot.gpDD, "Avó Materna", rightGrandBaseX + cardWidth + grandParentGap, treeTop);
    drawHorseBox(snapshot.sire, "Pai", leftParentX, treeTop + 92);
    drawHorseBox(snapshot.dam, "Mãe", rightParentX, treeTop + 92);
    drawHorseBox(snapshot.selectedHorse, "Animal Selecionado", selectedX, treeTop + 192, true);

    drawLine(leftGrandBaseX + cardWidth / 2, treeTop + cardHeight, leftGrandBaseX + cardWidth / 2, treeTop + 72);
    drawLine(leftGrandBaseX + cardWidth + grandParentGap + cardWidth / 2, treeTop + cardHeight, leftGrandBaseX + cardWidth + grandParentGap + cardWidth / 2, treeTop + 72);
    drawLine(leftGrandBaseX + cardWidth / 2, treeTop + 72, leftGrandBaseX + cardWidth + grandParentGap + cardWidth / 2, treeTop + 72);
    drawLine(leftGrandBaseX + cardWidth + grandParentGap / 2, treeTop + 72, leftParentX + cardWidth / 2, treeTop + 92);

    drawLine(rightGrandBaseX + cardWidth / 2, treeTop + cardHeight, rightGrandBaseX + cardWidth / 2, treeTop + 72);
    drawLine(rightGrandBaseX + cardWidth + grandParentGap + cardWidth / 2, treeTop + cardHeight, rightGrandBaseX + cardWidth + grandParentGap + cardWidth / 2, treeTop + 72);
    drawLine(rightGrandBaseX + cardWidth / 2, treeTop + 72, rightGrandBaseX + cardWidth + grandParentGap + cardWidth / 2, treeTop + 72);
    drawLine(rightGrandBaseX + cardWidth + grandParentGap / 2, treeTop + 72, rightParentX + cardWidth / 2, treeTop + 92);

    drawLine(leftParentX + cardWidth / 2, treeTop + 146, leftParentX + cardWidth / 2, treeTop + 172);
    drawLine(rightParentX + cardWidth / 2, treeTop + 146, rightParentX + cardWidth / 2, treeTop + 172);
    drawLine(leftParentX + cardWidth / 2, treeTop + 172, rightParentX + cardWidth / 2, treeTop + 172);
    drawLine(middleX, treeTop + 172, middleX, treeTop + 192);

    if (snapshot.offspring.length === 0) {
      cursorY = cardTop + treeHeight + 14;
      return;
    }

    drawLine(middleX, treeTop + 246, middleX, treeTop + 272);
    const offspringVisible = snapshot.offspring.slice(0, 3);
    offspringVisible.forEach((offspring, index) => {
      const x = offspringStartX + index * (offspringCardWidth + offspringGap);
      pdf.setFillColor(...CARD_BG);
      pdf.setDrawColor(...DIVIDER_COLOR);
      pdf.roundedRect(x, treeTop + 286, offspringCardWidth, 46, 10, 10, "FD");
      pdf.setFont("Inter", "bold");
      pdf.setFontSize(8);
      pdf.setTextColor(...TEXT_PRIMARY);
      pdf.text(sanitizePdfText(offspring.name), x + 8, treeTop + 304, { maxWidth: offspringCardWidth - 16 });
      pdf.setFont("Inter", "normal");
      pdf.setFontSize(6.5);
      pdf.setTextColor(...TEXT_SECONDARY);
      pdf.text(sanitizePdfText(offspring.breed), x + 8, treeTop + 318, { maxWidth: offspringCardWidth - 16 });
      drawLine(middleX, treeTop + 272, x + offspringCardWidth / 2, treeTop + 272);
      drawLine(x + offspringCardWidth / 2, treeTop + 272, x + offspringCardWidth / 2, treeTop + 286);
    });

    cursorY = cardTop + treeHeight + 14;
  };

  const handHorseLogo = await getImageDataUrl("/logo-handhorse.png");
  const imageDataUrl = await getImageDataUrl(currentHorse.photoUrl);

  drawPageHeader();

  pdf.setTextColor(...TEXT_PRIMARY);
  pdf.setFont("Inter", "bold");
  pdf.setFontSize(19);
  pdf.text(sanitizePdfText(currentHorse.name), MARGIN, cursorY);
  cursorY += 22;

  if (imageDataUrl) {
    pdf.addImage(imageDataUrl, "JPEG", MARGIN, cursorY, contentWidth, heroImageHeight, undefined, "FAST");
    cursorY += heroImageHeight + 16;
  }

  pdf.setFont("Inter", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(...TEXT_SECONDARY);
  pdf.text(sanitizePdfText(`${currentHorse.breed} · ${currentHorse.gender}`), MARGIN, cursorY);
  cursorY += 14;
  pdf.text(sanitizePdfText(`Histórico HandHorse gerado em ${new Date().toLocaleDateString("pt-BR")}`), MARGIN, cursorY);
  cursorY += 22;

  addListSection(
    "Saúde e bem-estar",
    [244, 63, 94],
    dataset.healthRecords.map((record) => `${formatDate(record.date)} · ${HEALTH_TYPE_PT[record.type]} · ${record.description} · ${formatBRL(record.cost)}`),
    "Nenhum registro recente de saúde para este animal.",
  );

  addListSection(
    "Financeiro",
    [16, 185, 129],
    dataset.transactions.map((transaction) => `${formatDate(transaction.date)} · ${transaction.type === "Income" ? "Crédito" : "Débito"} · ${transaction.category} · ${transaction.description} · ${formatBRL(transaction.amount)}`),
    "Nenhum lançamento financeiro vinculado a este animal.",
  );

  addListSection(
    "Premiações",
    [245, 158, 11],
    dataset.awards.map((award) => `${formatDate(award.date)} · ${AWARD_CATEGORY_PT[award.category]} · ${award.title} · ${AWARD_PLACEMENT_PT[award.placement]}${award.prizeValue ? ` · ${formatBRL(award.prizeValue)}` : ""}`),
    "Nenhuma premiação recente registrada para este animal.",
  );

  addGenealogySection();

  const totalPages = pdf.getNumberOfPages();
  Array.from({ length: totalPages }, (_, index) => {
    const pageNumber = index + 1;
    pdf.setPage(pageNumber);
    drawPageFooter(pageNumber, totalPages);
  });

  const blob = pdf.output("blob");
  const fileName = `historico-${sanitizeFileName(currentHorse.name || "animal")}.pdf`;
  return new File([blob], fileName, { type: "application/pdf" });
}
