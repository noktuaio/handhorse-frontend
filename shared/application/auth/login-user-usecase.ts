import type { LoginCredentials, LoginResult } from "@/shared/domain/auth";
import { loginUserApi } from "@/shared/infrastructure/auth/auth-api";

export async function loginUserUseCase(credentials: LoginCredentials): Promise<LoginResult> {
  const result = await loginUserApi(credentials);
  return result;
}
