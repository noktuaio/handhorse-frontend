"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Mail, KeyRound, Sun, Moon } from "lucide-react";
import { useTheme } from "@/shared/ui/theme-context";
import { handleConfirmFormSubmit } from "@/shared/application/auth/confirm-form-handler";
import { saveLocalOnboardingData } from "@/shared/application/auth/onboarding-storage";

const PRIMARY_COLOR = "#2563EB";

function ConfirmPageInner() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  const pageBackground = isDark
    ? "radial-gradient(circle at top right, rgba(15,23,42,0.85), #020617)"
    : "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)";

  const pageBackgroundColor = isDark ? "#020617" : "#f8fafc";

  const inputBackground = isDark ? "rgba(15,23,42,0.7)" : "#ffffff";
  const inputTextColor = isDark ? "#E5E7EB" : "#0f172a";

  useEffect(() => {
    const emailFromQuery = searchParams.get("email");
    const nameFromQuery = searchParams.get("name");
    const phoneFromQuery = searchParams.get("phone");

    if (emailFromQuery && !email) {
      setEmail(emailFromQuery);
    }

    if (!emailFromQuery || !nameFromQuery) {
      return;
    }

    saveLocalOnboardingData({
      email: emailFromQuery,
      name: nameFromQuery,
      phone: phoneFromQuery ?? undefined,
    });
  }, [email, searchParams]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsLoading(true);
    setError(null);

    const result = await handleConfirmFormSubmit({
      email,
      code,
    });

    if (!result.success) {
      setError(result.errorMessage ?? null);
      setIsLoading(false);
      return;
    }

    setIsLoading(false);

    if (result.redirectToLogin) {
      router.push("/auth/login");
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
            Confirmar cadastro
          </h2>
          <p
            style={{
              margin: 0,
              fontSize: "0.9rem",
              color: isDark ? "#9CA3AF" : "#64748b",
            }}
          >
            Informe o e-mail e o código enviado para sua caixa de entrada.
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
                  backgroundColor: inputBackground,
                  color: inputTextColor,
                  fontSize: "0.9rem",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ position: "relative" }}>
              <KeyRound
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
                type="text"
                required
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder="Código de confirmação"
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
              {isLoading ? (
                "Confirmando..."
              ) : (
                <>
                  <span>Confirmar código</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function ConfirmPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#020617",
            color: "#9CA3AF",
            fontSize: "0.9rem",
          }}
        >
          Carregando…
        </div>
      }
    >
      <ConfirmPageInner />
    </Suspense>
  );
}
