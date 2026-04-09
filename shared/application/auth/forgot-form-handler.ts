import type { ForgotPasswordPayload, ForgotPasswordResult } from "@/shared/domain/auth";
import { forgotPasswordUseCase } from "@/shared/application/auth/forgot-password-usecase";

export type ForgotFormState = {
  email: string;
};

export type ForgotFormHandlerResult = {
  success: boolean;
  redirectToReset?: boolean;
  errorMessage?: string;
};

export async function handleForgotFormSubmit(
  form: ForgotFormState,
): Promise<ForgotFormHandlerResult> {
  const { email } = form;

  if (!email) {
    return {
      success: false,
      errorMessage: "Informe o e-mail cadastrado.",
    };
  }

  const payload: ForgotPasswordPayload = { email };
  const result: ForgotPasswordResult = await forgotPasswordUseCase(payload);

  if (!result.success) {
    return {
      success: false,
      errorMessage:
        result.errorMessage ??
        "Não foi possível enviar o código de redefinição. Verifique o e-mail e tente novamente.",
    };
  }

  return {
    success: true,
    redirectToReset: true,
  };
}
