import type { ResetPasswordPayload, ResetPasswordResult } from "@/shared/domain/auth";
import { resetPasswordUseCase } from "@/shared/application/auth/reset-password-usecase";

export type ResetFormState = {
  email: string;
  code: string;
  newPassword: string;
  confirmNewPassword: string;
};

export type ResetFormHandlerResult = {
  success: boolean;
  redirectToLogin?: boolean;
  errorMessage?: string;
};

export async function handleResetFormSubmit(
  form: ResetFormState,
): Promise<ResetFormHandlerResult> {
  const { email, code, newPassword, confirmNewPassword } = form;

  if (!email || !code || !newPassword || !confirmNewPassword) {
    return {
      success: false,
      errorMessage: "Preencha todos os campos obrigatórios.",
    };
  }

  if (newPassword !== confirmNewPassword) {
    return {
      success: false,
      errorMessage: "As senhas não conferem.",
    };
  }

  const payload: ResetPasswordPayload = {
    email,
    code,
    newPassword,
  };

  const result: ResetPasswordResult = await resetPasswordUseCase(payload);

  if (!result.success) {
    return {
      success: false,
      errorMessage:
        result.errorMessage ??
        "Não foi possível redefinir sua senha agora. Verifique os dados e tente novamente.",
    };
  }

  return {
    success: true,
    redirectToLogin: true,
  };
}
