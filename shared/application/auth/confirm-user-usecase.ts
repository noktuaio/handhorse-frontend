import type { ConfirmPayload, ConfirmResult } from "@/shared/domain/auth";
import { confirmUserApi } from "@/shared/infrastructure/auth/auth-api";

export async function confirmUserUseCase(payload: ConfirmPayload): Promise<ConfirmResult> {
  return confirmUserApi(payload);
}
