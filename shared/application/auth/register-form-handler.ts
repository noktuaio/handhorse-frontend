import type { RegisterPayload, RegisterResult } from "@/shared/domain/auth";
import { registerUserUseCase } from "@/shared/application/auth/register-user-usecase";
import { saveLocalOnboardingData } from "@/shared/application/auth/onboarding-storage";

export type RegisterFormState = {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
};

export type RegisterFormHandlerResult = {
  success: boolean;
  redirectToConfirm?: boolean;
  errorMessage?: string;
};

export function formatPhoneDisplay(value: string): string {
  const digits = value.replace(/\D/g, "");
  const withoutCountry = digits.startsWith("55") ? digits.slice(2) : digits;
  const local = withoutCountry.slice(0, 11);

  if (!local) {
    return "+55 ";
  }

  if (local.length <= 2) {
    return `+55 (${local}`;
  }

  if (local.length <= 6) {
    return `+55 (${local.slice(0, 2)}) ${local.slice(2)}`;
  }

  return `+55 (${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
}

export function normalizePhoneToE164(value: string): string | undefined {
  const digits = value.replace(/\D/g, "");

  if (!digits) {
    return undefined;
  }

  if (digits.startsWith("55")) {
    return `+${digits}`;
  }

  return `+55${digits}`;
}

export async function handleRegisterFormSubmit(
  form: RegisterFormState,
): Promise<RegisterFormHandlerResult> {
  const { name, email, phone, password, confirmPassword } = form;

  if (!name || !email || !password || !confirmPassword) {
    return {
      success: false,
      errorMessage: "Preencha todos os campos obrigatórios.",
    };
  }

  if (password !== confirmPassword) {
    return {
      success: false,
      errorMessage: "As senhas não conferem.",
    };
  }

  const payload: RegisterPayload = {
    name,
    email,
    phone: normalizePhoneToE164(phone),
    password,
    confirmPassword,
  };

  const result: RegisterResult = await registerUserUseCase(payload);

  if (!result.success) {
    const rawMessage = result.errorMessage ?? "";

    if (rawMessage.toLowerCase().includes("invalid phone number")) {
      return {
        success: false,
        errorMessage:
          "Telefone em formato inválido. Use DDD + número, ex: +5531999990000.",
      };
    }

    return {
      success: false,
      errorMessage:
        "Não foi possível concluir seu cadastro agora. Verifique os dados e tente novamente em instantes.",
    };
  }

  saveLocalOnboardingData({
    name,
    email,
    phone: payload.phone,
  });

  return {
    success: true,
    redirectToConfirm: true,
  };
}
