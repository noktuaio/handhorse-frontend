import type { ConfirmPayload, ConfirmResult } from "@/shared/domain/auth";
import { confirmUserUseCase } from "@/shared/application/auth/confirm-user-usecase";
import {
  clearLocalOnboardingData,
  getLocalOnboardingData,
} from "@/shared/application/auth/onboarding-storage";

export type ConfirmFormState = {
  email: string;
  code: string;
};

export type ConfirmFormHandlerResult = {
  success: boolean;
  redirectToLogin?: boolean;
  errorMessage?: string;
};

export async function handleConfirmFormSubmit(
  form: ConfirmFormState,
): Promise<ConfirmFormHandlerResult> {
  const { email, code } = form;

  if (!email || !code) {
    return {
      success: false,
      errorMessage: "Informe o e-mail e o código recebido.",
    };
  }

  const localOnboardingData = getLocalOnboardingData(email);

  const payload: ConfirmPayload = {
    email,
    code,
    ...(localOnboardingData ?? {}),
  };

  const result: ConfirmResult = await confirmUserUseCase(payload);

  if (!result.success) {
    const rawMessage = result.errorMessage?.toLowerCase() ?? "";

    if (
      rawMessage.includes("codemismatchexception") ||
      rawMessage.includes("invalid") ||
      rawMessage.includes("error confirming email")
    ) {
      return {
        success: false,
        errorMessage:
          "Código inválido. Confira o código enviado por e-mail ou solicite um novo cadastro.",
      };
    }

    if (rawMessage.includes("expiredcodeexception") || rawMessage.includes("expired")) {
      return {
        success: false,
        errorMessage:
          "O código informado expirou. Solicite um novo código de confirmação e tente novamente.",
      };
    }

    return {
      success: false,
      errorMessage:
        result.errorMessage ??
        "Não foi possível confirmar seu cadastro agora. Verifique o código e tente novamente.",
    };
  }

  clearLocalOnboardingData(email);

  return {
    success: true,
    redirectToLogin: true,
  };
}
