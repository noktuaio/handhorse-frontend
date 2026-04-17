#!/usr/bin/env bash
# Deploy estático (Next export → S3 + invalidação CloudFront).
# Valores alinhados ao output de: cd terraform && terraform apply
# Se recriares o bucket ou a distribuição, atualiza as variáveis abaixo (terraform output).

set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

export AWS_S3_BUCKET="handhorse-frontend-static-140023375763"
export AWS_REGION="us-east-2"
export CLOUDFRONT_DISTRIBUTION_ID="E2MGLBSSC10QMF"
# Garante APIs HTTPS no bundle mesmo com .env.local a apontar para localhost.
export NEXT_PUBLIC_HANDHORSE_API_URL="${NEXT_PUBLIC_HANDHORSE_API_URL:-https://57ts4dnnp8.execute-api.us-east-1.amazonaws.com}"
export NEXT_PUBLIC_HANDHORSE_ANIMALS_API_URL="${NEXT_PUBLIC_HANDHORSE_ANIMALS_API_URL:-https://m17p21ugj4.execute-api.us-east-1.amazonaws.com}"
export NEXT_PUBLIC_HANDHORSE_FINANCE_API_URL="${NEXT_PUBLIC_HANDHORSE_FINANCE_API_URL:-https://y4hiuya1bg.execute-api.us-east-1.amazonaws.com}"
# URL pública (referência)
SITE_URL="https://d205tlsn2nw7ah.cloudfront.net"

echo "Deploy → bucket=${AWS_S3_BUCKET} region=${AWS_REGION} cf=${CLOUDFRONT_DISTRIBUTION_ID}"
echo "Site (após propagação): ${SITE_URL}"
bash scripts/deploy-static-to-s3.sh
echo "Concluído."
