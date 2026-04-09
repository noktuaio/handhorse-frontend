import type {
  AuthTokens,
  LoginCredentials,
  LoginResult,
  RegisterPayload,
  RegisterResult,
  ConfirmPayload,
  ConfirmResult,
  ForgotPasswordPayload,
  ForgotPasswordResult,
  ResetPasswordPayload,
  ResetPasswordResult,
} from "@/shared/domain/auth";
import { HANDHORSE_API_BASE_URL } from "@/shared/config/api-config";

const LOGIN_PATH = "/auth/login";
const REGISTER_PATH = "/auth/register";
const CONFIRM_PATH = "/auth/confirm";
const FORGOT_PASSWORD_PATH = "/auth/forgot-password";
const RESET_PASSWORD_PATH = "/auth/reset-password";

export async function loginUserApi(credentials: LoginCredentials): Promise<LoginResult> {
  const url = `${HANDHORSE_API_BASE_URL}${LOGIN_PATH}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      email: credentials.email,
      password: credentials.password,
    }),
  });

  if (!response.ok) {
    let message: string | undefined;

    try {
      const errorBody = await response.json();
      if (typeof errorBody?.message === "string") {
        message = errorBody.message;
      }
    } catch {
    }

    return {
      success: false,
      errorMessage: message ?? "Erro ao autenticar.",
    };
  }

  const data = (await response.json()) as Partial<AuthTokens>;

  if (!data.accessToken || typeof data.accessToken !== "string") {
    return {
      success: false,
      errorMessage: "Token de autenticação não recebido do servidor.",
    };
  }

  return {
    success: true,
    tokens: {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken ?? null,
      idToken: data.idToken ?? null,
      expiresIn: data.expiresIn ?? null,
      tokenType: data.tokenType ?? null,
    },
  };
}

export async function registerUserApi(payload: RegisterPayload): Promise<RegisterResult> {
  const url = `${HANDHORSE_API_BASE_URL}${REGISTER_PATH}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let message: string | undefined;

    try {
      const errorBody = await response.json();
      if (typeof errorBody?.message === "string") {
        message = errorBody.message;
      }
    } catch {
    }

    return {
      success: false,
      errorMessage: message ?? "Erro ao registrar usuário.",
    };
  }

  const data = (await response.json()) as {
    userSub?: string;
    userConfirmed?: boolean;
  };

  return {
    success: true,
    userSub: data.userSub,
    userConfirmed: data.userConfirmed,
  };
}

export async function confirmUserApi(payload: ConfirmPayload): Promise<ConfirmResult> {
  const url = `${HANDHORSE_API_BASE_URL}${CONFIRM_PATH}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let message: string | undefined;

    try {
      const errorBody = await response.json();
      if (typeof errorBody?.message === "string") {
        message = errorBody.message;
      }
    } catch {
    }

    return {
      success: false,
      errorMessage: message ?? "Erro ao confirmar cadastro.",
    };
  }

  return {
    success: true,
  };
}

export async function forgotPasswordApi(
  payload: ForgotPasswordPayload,
): Promise<ForgotPasswordResult> {
  const url = `${HANDHORSE_API_BASE_URL}${FORGOT_PASSWORD_PATH}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let message: string | undefined;

    try {
      const errorBody = await response.json();
      if (typeof errorBody?.message === "string") {
        message = errorBody.message;
      }
    } catch {
    }

    return {
      success: false,
      errorMessage:
        message ?? "Não foi possível enviar o código de redefinição de senha.",
    };
  }

  return {
    success: true,
  };
}

export async function resetPasswordApi(
  payload: ResetPasswordPayload,
): Promise<ResetPasswordResult> {
  const url = `${HANDHORSE_API_BASE_URL}${RESET_PASSWORD_PATH}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let message: string | undefined;

    try {
      const errorBody = await response.json();
      if (typeof errorBody?.message === "string") {
        message = errorBody.message;
      }
    } catch {
    }

    return {
      success: false,
      errorMessage:
        message ?? "Não foi possível redefinir sua senha. Verifique os dados e tente novamente.",
    };
  }

  return {
    success: true,
  };
}
