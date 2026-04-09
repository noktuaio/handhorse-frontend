"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Mail, Sun, Moon } from "lucide-react";
import { useTheme } from "@/shared/ui/theme-context";
import { handleForgotFormSubmit } from "@/shared/application/auth/forgot-form-handler";

const PRIMARY_COLOR = "#2563EB";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  const pageBackground = isDark
    ? "radial-gradient(circle at top right, rgba(15,23,42,0.85), #020617)"
    : "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)";

  const pageBackgroundColor = isDark ? "#020617" : "#f8fafc";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsLoading(true);
    setError(null);

    const result = await handleForgotFormSubmit({ email });

    if (!result.success) {
      setError(result.errorMessage ?? null);
      setIsLoading(false);
      return;
    }

    setIsLoading(false);

    if (result.redirectToReset) {
      router.push(`/auth/reset-password?email=${encodeURIComponent(email)}`);
    }
  }

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
            onClick={toggleTheme}
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
            {isDark ? <Sun size={16} color="#FACC15" /> : <Moon size={16} color="#1F2937" />}
          </button>
          <Image
            src="/logo-handhorse.png"
            alt="HandHorse"
            width={72}
            height={72}
          />
          <h2
            style={{
              marginTop: "16px",
              marginBottom: "4px",
              fontSize: "1.6rem",
              fontWeight: 700,
              color: isDark ? "#E5E7EB" : "#0f172a",
            }}
          >
            Esqueci minha senha
          </h2>
          <p
            style={{
              margin: 0,
              fontSize: "0.9rem",
              color: isDark ? "#9CA3AF" : "#64748b",
            }}
          >
            Informe seu e-mail para receber o código de redefinição.
          </p>
        </div>

        <div
          style={{
            padding: "24px 22px 20px",
            borderRadius: "24px",
            background: isDark
              ? "linear-gradient(135deg, rgba(15,23,42,0.96), rgba(15,23,42,1))"
              : "rgba(255,255,255,0.9)",
            border: "1px solid rgba(148,163,184,0.35)",
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
                  color: "#9ca3af",
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
                  backgroundColor: isDark ? "rgba(15,23,42,0.7)" : "#ffffff",
                  color: isDark ? "#E5E7EB" : "#0f172a",
                  fontSize: "0.9rem",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {error && (
              <p
                style={{
                  margin: 0,
                  fontSize: "0.85rem",
                  color: "#fca5a5",
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
              {isLoading ? "Enviando..." : (
                <>
                  <span>Enviar código</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        </div>

        <p
          style={{
            textAlign: "center",
            fontSize: "0.8rem",
            color: isDark ? "#9ca3af" : "#64748b",
          }}
        >
          Lembrou a senha?{" "}
          <Link
            href="/auth/login"
            style={{
              color: PRIMARY_COLOR,
              fontWeight: 700,
              cursor: "pointer",
              textDecoration: "none",
            }}
          >
            Fazer login
          </Link>
        </p>
      </div>
    </div>
  );
}
