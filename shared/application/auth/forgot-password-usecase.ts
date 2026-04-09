import type { ForgotPasswordPayload, ForgotPasswordResult } from "@/shared/domain/auth";
import { forgotPasswordApi } from "@/shared/infrastructure/auth/auth-api";

export async function forgotPasswordUseCase(
  payload: ForgotPasswordPayload,
): Promise<ForgotPasswordResult> {
  return forgotPasswordApi(payload);
}
