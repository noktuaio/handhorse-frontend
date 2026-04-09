/** access-control: auth, users (serverless-offline default port 3001) */
const DEFAULT_HANDHORSE_API_BASE_URL = "http://localhost:3001";

/** animals: rotas protegidas por JWT (serverless-offline default port 3002) */
const DEFAULT_HANDHORSE_ANIMALS_API_BASE_URL = "http://localhost:3002";

/** finance: lançamentos + vínculos N:N com exames/premiações (serverless-offline default port 3003) */
const DEFAULT_HANDHORSE_FINANCE_API_BASE_URL = "http://localhost:3003";

export const HANDHORSE_API_BASE_URL =
  process.env.NEXT_PUBLIC_HANDHORSE_API_URL ?? DEFAULT_HANDHORSE_API_BASE_URL;

export const HANDHORSE_ANIMALS_API_BASE_URL =
  process.env.NEXT_PUBLIC_HANDHORSE_ANIMALS_API_URL ?? DEFAULT_HANDHORSE_ANIMALS_API_BASE_URL;

export const HANDHORSE_FINANCE_API_BASE_URL =
  process.env.NEXT_PUBLIC_HANDHORSE_FINANCE_API_URL ?? DEFAULT_HANDHORSE_FINANCE_API_BASE_URL;
