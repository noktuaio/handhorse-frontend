import type { RegisterPayload, RegisterResult } from "@/shared/domain/auth";
import { registerUserApi } from "@/shared/infrastructure/auth/auth-api";

export async function registerUserUseCase(payload: RegisterPayload): Promise<RegisterResult> {
  return registerUserApi(payload);
}
