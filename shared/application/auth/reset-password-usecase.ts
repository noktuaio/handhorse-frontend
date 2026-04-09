import type { ResetPasswordPayload, ResetPasswordResult } from "@/shared/domain/auth";
import { resetPasswordApi } from "@/shared/infrastructure/auth/auth-api";

export async function resetPasswordUseCase(
  payload: ResetPasswordPayload,
): Promise<ResetPasswordResult> {
  return resetPasswordApi(payload);
}
