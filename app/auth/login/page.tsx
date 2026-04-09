"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock, ArrowRight, Fingerprint, Sun, Moon } from "lucide-react";
import { FormEvent, useState } from "react";
import { useTheme } from "@/shared/ui/theme-context";
import { loginUserUseCase } from "@/shared/application/auth/login-user-usecase";
import { saveAuthTokens } from "@/shared/infrastructure/auth/token-storage";

const PRIMARY_COLOR = "#2563EB"; // azul próximo ao layout original

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email || !password) {
      setError("Informe e-mail e senha.");
      return;
    }

    setIsLoading(true);
    setError(null);

    const result = await loginUserUseCase({ email, password });

    if (!result.success) {
      setError(result.errorMessage ?? "Falha ao fazer login.");
      setIsLoading(false);
      return;
    }

    if (result.tokens) {
      saveAuthTokens(result.tokens);
    }

    setIsLoading(false);
    router.push("/dashboard");
  }

  const isDark = theme === "dark";

  const pageBackground = isDark
    ? "radial-gradient(circle at top right, rgba(15,23,42,0.85), #020617)"
    : "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)";

  const pageBackgroundColor = isDark ? "#020617" : "#f8fafc";

  const cardBackground = isDark
    ? "linear-gradient(135deg, rgba(15,23,42,0.96), rgba(15,23,42,1))"
    : "rgba(255,255,255,0.9)";

  const cardBorderColor = isDark
    ? "rgba(148,163,184,0.35)"
    : "rgba(148,163,184,0.25)";

  const surfaceTextColor = isDark ? "#E5E7EB" : "#0f172a";
  const surfaceMutedColor = isDark ? "#9CA3AF" : "#64748b";
  const inputBackground = isDark ? "rgba(15,23,42,0.7)" : "#ffffff";
  const inputTextColor = isDark ? "#E5E7EB" : "#0f172a";
  const inputIconColor = "#9ca3af";

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        backgroundImage: pageBackground,
        backgroundColor: pageBackgroundColor,
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          display: "flex",
          flexDirection: "column",
          gap: "20px",
          animation: "fade-in 0.5s ease, zoom-in 0.5s ease",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            position: "relative",
            textAlign: "center",
          }}
        >
          <button
            type="button"
            onClick={() => {
              toggleTheme();
            }}
            aria-label="Alternar tema claro/escuro"
            style={{
              position: "absolute",
              right: 12,
              top: 0,
              width: 32,
              height: 32,
              borderRadius: 999,
              border: "1px solid rgba(148,163,184,0.4)",
              backgroundColor: isDark ? "rgba(15,23,42,0.9)" : "rgba(255,255,255,0.9)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            {isDark ? (
              <Sun size={16} color="#FACC15" />
            ) : (
              <Moon size={16} color="#1F2937" />
            )}
          </button>
          <Image
            src="/logo-handhorse.png"
            alt="HandHorse"
            width={96}
            height={96}
            priority
          />
          <h2
            style={{
              marginTop: "16px",
              marginBottom: "4px",
              fontSize: "1.9rem",
              fontWeight: 700,
              color: surfaceTextColor,
            }}
          >
            Bem-vindo
          </h2>
          <p
            style={{
              margin: 0,
              fontSize: "0.95rem",
              color: surfaceMutedColor,
            }}
          >
            Acesse sua conta para gerir seu haras.
          </p>
        </div>

        <div
          style={{
            padding: "24px 22px 20px",
            borderRadius: "24px",
            background: cardBackground,
            border: `1px solid ${cardBorderColor}`,
            boxShadow: isDark
              ? "0 24px 60px rgba(15,23,42,0.85), 0 0 0 1px rgba(15,23,42,0.7)"
              : "0 18px 45px rgba(15,23,42,0.12), 0 0 0 1px rgba(148,163,184,0.12)",
            backdropFilter: "blur(18px)",
          }}
        >
          <form
            onSubmit={handleSubmit}
            style={{ display: "flex", flexDirection: "column", gap: "14px" }}
          >
            <div style={{ position: "relative" }}>
              <Mail
                size={20}
                style={{
                  position: "absolute",
                  left: 14,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: inputIconColor,
                }}
              />
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Seu e-mail"
                style={{
                  width: "100%",
                  padding: "12px 12px 12px 42px",
                  borderRadius: "18px",
                  border: "1px solid rgba(148,163,184,0.35)",
                  backgroundColor: inputBackground,
                  color: inputTextColor,
                  fontSize: "0.9rem",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ position: "relative" }}>
              <Lock
                size={20}
                style={{
                  position: "absolute",
                  left: 14,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: inputIconColor,
                }}
              />
              <input
                type="password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Sua senha"
                style={{
                  width: "100%",
                  padding: "12px 12px 12px 42px",
                  borderRadius: "18px",
                  border: "1px solid rgba(148,163,184,0.35)",
                  backgroundColor: inputBackground,
                  color: inputTextColor,
                  fontSize: "0.9rem",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <p
              style={{
                textAlign: "right",
                fontSize: "0.8rem",
                color: surfaceMutedColor,
                margin: "4px 4px 0 0",
              }}
            >
              <Link
                href="/auth/forgot-password"
                style={{
                  color: PRIMARY_COLOR,
                  fontWeight: 600,
                  textDecoration: "none",
                  cursor: "pointer",
                }}
              >
                Esqueci minha senha
              </Link>
            </p>

            {error && (
              <p
                style={{
                  margin: 0,
                  fontSize: "0.85rem",
                  color: "#b91c1c", // erro vermelho em tema claro
                }}
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              style={{
                marginTop: "4px",
                width: "100%",
                padding: "12px 0",
                borderRadius: "18px",
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                backgroundColor: PRIMARY_COLOR,
                color: "#f9fafb",
                fontWeight: 700,
                fontSize: "0.95rem",
                cursor: isLoading ? "default" : "pointer",
                boxShadow: "0 18px 40px rgba(37,99,235,0.35)",
                boxSizing: "border-box",
              }}
            >
              {isLoading ? (
                "Entrando..."
              ) : (
                <>
                  <span>Entrar</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "12px",
              marginTop: "18px",
              marginBottom: "8px",
            }}
          >
            <div
              style={{ height: 1, flex: 1, backgroundColor: "rgba(148,163,184,0.35)" }}
            />
            <span
              style={{
                fontSize: "0.7rem",
                textTransform: "uppercase",
                letterSpacing: "0.18em",
                color: "#9ca3af",
                fontWeight: 700,
              }}
            >
              ou use
            </span>
            <div
              style={{ height: 1, flex: 1, backgroundColor: "rgba(148,163,184,0.35)" }}
            />
          </div>

          <button
            type="button"
            onClick={() => {
              // Placeholder: no futuro podemos integrar biometria ou login rápido.
              setError(null);
            }}
            style={{
              width: "100%",
              padding: "10px 0",
              borderRadius: "18px",
              border: "1px solid rgba(148,163,184,0.4)",
              backgroundColor: isDark ? "#111827" : "#e5e7eb",
              color: isDark ? "#E5E7EB" : "#111827",
              fontSize: "0.85rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              cursor: "pointer",
              boxSizing: "border-box",
            }}
          >
            <Fingerprint size={18} style={{ color: PRIMARY_COLOR }} />
            <span>Face ID / Touch ID</span>
          </button>
        </div>

        <p
          style={{
            textAlign: "center",
            fontSize: "0.8rem",
            color: "#9ca3af",
          }}
        >
          Não tem uma conta?{" "}
          <Link
            href="/auth/register"
            style={{
              color: PRIMARY_COLOR,
              fontWeight: 700,
              cursor: "pointer",
              textDecoration: "none",
            }}
          >
            Criar conta
          </Link>
        </p>
      </div>
    </div>
  );
}
