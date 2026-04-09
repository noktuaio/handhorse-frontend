export type AuthTokens = {
  accessToken: string;
  refreshToken?: string | null;
  idToken?: string | null;
  expiresIn?: number | null;
  tokenType?: string | null;
};

export type LoginCredentials = {
  email: string;
  password: string;
};

export type LoginResult = {
  success: boolean;
  tokens?: AuthTokens;
  errorMessage?: string;
};

export type RegisterPayload = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone?: string;
  username?: string;
};

export type RegisterResult = {
  success: boolean;
  userSub?: string;
  userConfirmed?: boolean;
  errorMessage?: string;
};

export type ConfirmPayload = {
  code: string;
  email?: string;
  name?: string;
  phone?: string;
  document?: string;
  address?: string;
  zipcode?: string;
  state?: string;
  city?: string;
  neighborhood?: string;
  username?: string;
};

export type ConfirmResult = {
  success: boolean;
  errorMessage?: string;
};

export type ForgotPasswordPayload = {
  email: string;
};

export type ForgotPasswordResult = {
  success: boolean;
  errorMessage?: string;
};

export type ResetPasswordPayload = {
  email: string;
  code: string;
  newPassword: string;
};

export type ResetPasswordResult = {
  success: boolean;
  errorMessage?: string;
};
