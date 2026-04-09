#!/bin/zsh
set -euo pipefail

SOURCE_DIR="${1:-/Users/robertomartins/Workspace/temp/Inter}"
OUTPUT_FILE="${2:-/Users/robertomartins/Workspace/appai/shared/config/pdf-inter-fonts.ts}"

if [ ! -d "$SOURCE_DIR" ]; then
  echo "Diretório de fontes não encontrado: $SOURCE_DIR" >&2
  exit 1
fi

REGULAR_FILE=""
BOLD_FILE=""

for candidate in \
  "$SOURCE_DIR/static/Inter_24pt-Regular.ttf" \
  "$SOURCE_DIR/static/Inter-Regular.ttf" \
  "$SOURCE_DIR/Inter-Regular.ttf"; do
  if [ -f "$candidate" ]; then
    REGULAR_FILE="$candidate"
    break
  fi
done

for candidate in \
  "$SOURCE_DIR/static/Inter_24pt-Bold.ttf" \
  "$SOURCE_DIR/static/Inter-Bold.ttf" \
  "$SOURCE_DIR/Inter-Bold.ttf"; do
  if [ -f "$candidate" ]; then
    BOLD_FILE="$candidate"
    break
  fi
done

if [ -z "$REGULAR_FILE" ]; then
  REGULAR_FILE=$(find "$SOURCE_DIR" -type f \( -name 'Inter-Regular.ttf' -o -name 'Inter_24pt-Regular.ttf' \) | head -n 1 || true)
fi

if [ -z "$BOLD_FILE" ]; then
  BOLD_FILE=$(find "$SOURCE_DIR" -type f \( -name 'Inter-Bold.ttf' -o -name 'Inter_24pt-Bold.ttf' \) | head -n 1 || true)
fi

if [ -z "$REGULAR_FILE" ] || [ -z "$BOLD_FILE" ]; then
  echo "Não encontrei os arquivos Regular e Bold da Inter em: $SOURCE_DIR" >&2
  exit 1
fi

mkdir -p "$(dirname "$OUTPUT_FILE")"

REGULAR_BASE64=$(base64 < "$REGULAR_FILE" | tr -d '\n')
BOLD_BASE64=$(base64 < "$BOLD_FILE" | tr -d '\n')

cat > "$OUTPUT_FILE" <<EOF
import { jsPDF } from "jspdf";

const interRegular = "$REGULAR_BASE64";
const interBold = "$BOLD_BASE64";

let registered = false;

export function registerInterPdfFont(pdf: jsPDF): void {
  if (!registered) {
    pdf.addFileToVFS("Inter-Regular.ttf", interRegular);
    pdf.addFont("Inter-Regular.ttf", "Inter", "normal");
    pdf.addFileToVFS("Inter-Bold.ttf", interBold);
    pdf.addFont("Inter-Bold.ttf", "Inter", "bold");
    registered = true;
  }

  pdf.setFont("Inter", "normal");
}
EOF

chmod 644 "$OUTPUT_FILE"

echo "Arquivo gerado com sucesso: $OUTPUT_FILE"
echo "Regular: $REGULAR_FILE"
echo "Bold: $BOLD_FILE"
