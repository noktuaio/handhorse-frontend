#!/usr/bin/env bash
# Deploy do build estático (pasta out/) para um bucket S3.
# Pré-requisitos: AWS CLI configurado; bucket já criado; política/origin alinhada ao CloudFront (OAI/OAC).
#
# Uso:
#   export AWS_S3_BUCKET=meu-bucket-front-homolog
#   export AWS_REGION=us-east-2   # opcional; deve ser a mesma região do bucket (ver frontend/terraform)
#   export CLOUDFRONT_DISTRIBUTION_ID=E123...  # opcional — invalida cache após sync
#   ./scripts/deploy-static-to-s3.sh
#
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

: "${AWS_S3_BUCKET:?Defina AWS_S3_BUCKET (nome do bucket S3)}"
REGION="${AWS_REGION:-us-east-2}"

# Next.js carrega .env* nesta ordem (primeira definição de cada chave ganha):
#   .env.production.local → .env.local → .env.production → .env
# Ou seja, .env.local SOBREPÕE .env.production. Para o bundle usar APIs HTTPS no S3,
# usamos .env.production.local (a partir do .env.production do repo) só durante este build.
ENV_PROD_LOCAL_BAK=""
cleanup_env_production_local() {
  rm -f "${ROOT}/.env.production.local"
  if [[ -n "${ENV_PROD_LOCAL_BAK}" && -f "${ENV_PROD_LOCAL_BAK}" ]]; then
    mv "${ENV_PROD_LOCAL_BAK}" "${ROOT}/.env.production.local"
  fi
}
trap cleanup_env_production_local EXIT

if [[ ! -f "${ROOT}/.env.production" ]]; then
  echo "Erro: falta ${ROOT}/.env.production (NEXT_PUBLIC_* com URLs HTTPS das APIs)."
  exit 1
fi
if [[ -f "${ROOT}/.env.production.local" ]]; then
  ENV_PROD_LOCAL_BAK="${ROOT}/.env.production.local.bak.handhorse.$$"
  mv "${ROOT}/.env.production.local" "${ENV_PROD_LOCAL_BAK}"
fi
cp "${ROOT}/.env.production" "${ROOT}/.env.production.local"

echo "→ npm run build (gera out/)"
npm run build

if [[ ! -d out ]]; then
  echo "Erro: pasta out/ não existe após o build."
  exit 1
fi

echo "→ s3 sync → s3://${AWS_S3_BUCKET}/ (região ${REGION})"
aws s3 sync out/ "s3://${AWS_S3_BUCKET}/" --delete --region "${REGION}"

if [[ -n "${CLOUDFRONT_DISTRIBUTION_ID:-}" ]]; then
  echo "→ CloudFront invalidation /*"
  aws cloudfront create-invalidation \
    --distribution-id "${CLOUDFRONT_DISTRIBUTION_ID}" \
    --paths "/*" >/dev/null
  echo "Invalidação pedida."
fi

echo "Deploy estático concluído."
