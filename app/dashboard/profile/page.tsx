"use client";

import { useState, useRef, useEffect, type CSSProperties, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/shared/ui/theme-context";
import { patchMeApi } from "@/shared/infrastructure/access-control/access-control-api";
import {
  imageContentTypeFromFile,
  presignUserProfilePhotoApi,
  putImageToPresignedUrl,
} from "@/shared/infrastructure/animals/animals-api";
import { userAvatarInitials } from "@/shared/application/name-initials";
import { useDashboardSession } from "../session-context";

export default function ProfilePage() {
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const { session, refreshSession } = useDashboardSession();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const nm = session?.user?.name;
    if (nm != null) {
      setName((n) => (n === "" ? nm : n));
    }
  }, [session?.user?.name]);

  const textColor = isDark ? "#E5E7EB" : "#0f172a";
  const mutedColor = isDark ? "#9CA3AF" : "#64748b";
  const glass: CSSProperties = {
    background: isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.75)",
    border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(148,163,184,0.2)"}`,
    backdropFilter: "blur(20px)",
    borderRadius: "24px",
    padding: "24px",
  };

  const inputStyle: CSSProperties = {
    width: "100%",
    padding: "12px 14px",
    borderRadius: "14px",
    border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(148,163,184,0.3)"}`,
    background: isDark ? "rgba(255,255,255,0.06)" : "rgba(248,250,252,1)",
    color: textColor,
    fontSize: "0.9rem",
    boxSizing: "border-box",
  };

  const labelStyle: CSSProperties = {
    display: "block",
    fontSize: "0.72rem",
    fontWeight: 700,
    color: mutedColor,
    marginBottom: "6px",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  };

  const displayNameForInitials = name.trim() || session?.user?.name;
  const profileInitials = userAvatarInitials(displayNameForInitials, session?.user?.email);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!session) return;
    setSaving(true);
    try {
      let profilePhotoS3Key: string | undefined;
      const file = fileRef.current?.files?.[0];
      if (file) {
        const contentType = imageContentTypeFromFile(file);
        const { uploadUrl, key } = await presignUserProfilePhotoApi(contentType);
        await putImageToPresignedUrl(uploadUrl, file, contentType);
        profilePhotoS3Key = key;
      }
      await patchMeApi({
        name: name.trim(),
        ...(profilePhotoS3Key ? { profilePhotoS3Key } : {}),
      });
      if (fileRef.current) fileRef.current.value = "";
      await refreshSession();
      router.push("/dashboard");
    } catch (er) {
      setErr(er instanceof Error ? er.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px", maxWidth: "520px" }}>
      <div>
        <h2 style={{ margin: 0, fontSize: "1.6rem", fontWeight: 900, color: textColor }}>Meus dados</h2>
        <p style={{ margin: "6px 0 0", fontSize: "0.9rem", color: mutedColor }}>
          Nome e foto de perfil. O e-mail não pode ser alterado aqui.
        </p>
      </div>

      <div style={glass}>
        <div style={{ marginBottom: "16px", display: "flex", alignItems: "center", gap: "12px" }}>
          {session?.profilePhotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={session.profilePhotoUrl}
              alt="Foto de perfil"
              width={72}
              height={72}
              style={{ borderRadius: "16px", objectFit: "cover" }}
            />
          ) : (
            <span
              style={{
                width: 72,
                height: 72,
                borderRadius: "16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "linear-gradient(135deg, #3b82f6, #10b981)",
                color: "#fff",
                fontWeight: 800,
                fontSize: profileInitials.length > 1 ? "1.15rem" : "1.35rem",
              }}
              aria-hidden
            >
              {profileInitials}
            </span>
          )}
        </div>
        <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={labelStyle}>Nome</label>
            <input
              required
              value={name || session?.user?.name || ""}
              onChange={(e) => setName(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>E-mail</label>
            <input readOnly value={session?.user?.email ?? ""} style={{ ...inputStyle, opacity: 0.85 }} />
          </div>
          <div>
            <label style={labelStyle}>Foto de perfil</label>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" style={inputStyle} />
          </div>
          {err && (
            <p style={{ margin: 0, color: "#f87171", fontSize: "0.85rem" }} role="alert">
              {err}
            </p>
          )}
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              disabled={saving}
              style={{
                flex: "1 1 140px",
                padding: "14px 20px",
                borderRadius: "14px",
                border: `1px solid ${isDark ? "#3d4659" : "#cbd5e1"}`,
                background: isDark ? "rgba(255,255,255,0.06)" : "#f8fafc",
                color: textColor,
                fontWeight: 600,
                fontSize: "0.9rem",
                cursor: saving ? "wait" : "pointer",
                fontFamily: "inherit",
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !session?.user}
              style={{
                flex: "1 1 140px",
                padding: "14px 20px",
                borderRadius: "14px",
                border: "none",
                background: saving ? "#64748b" : "#2563eb",
                color: "#fff",
                fontWeight: 700,
                fontSize: "0.9rem",
                cursor: saving ? "wait" : "pointer",
                fontFamily: "inherit",
              }}
            >
              {saving ? "Salvando…" : "Salvar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
