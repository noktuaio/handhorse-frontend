"use client";

import { useState, useRef, useEffect, useCallback, type CSSProperties, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useTheme } from "@/shared/ui/theme-context";
import {
  listHarasUsersApi,
  inviteHarasUserApi,
  updateHarasUserApi,
  deleteHarasUserApi,
  listAccessProfilesApi,
  type ApiHarasUserRow,
} from "@/shared/infrastructure/access-control/access-control-api";
import { formatPhoneDisplay, normalizePhoneToE164 } from "@/shared/application/auth/register-form-handler";
import {
  imageContentTypeFromFile,
  presignOwnerLogoApi,
  putImageToPresignedUrl,
  updateOwnerApi,
} from "@/shared/infrastructure/animals/animals-api";
import { digitsDocumentMax14, formatCpfCnpjMask } from "@/shared/application/document-br";
import { useDashboardSession } from "../session-context";

export default function HarasPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const { session, refreshSession } = useDashboardSession();
  const ownerId = session?.owner?.id as string | undefined;

  const [name, setName] = useState("");
  /** Apenas dígitos (máx. 14) — CPF ou CNPJ conforme quantidade. */
  const [documentDigits, setDocumentDigits] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [zipcode, setZipcode] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const logoRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [users, setUsers] = useState<ApiHarasUserRow[]>([]);
  const [profiles, setProfiles] = useState<{ id: string; code: string; name: string }[]>([]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePhone, setInvitePhone] = useState("");
  const [inviteRole, setInviteRole] = useState<"staff" | "admin">("staff");
  const [inviteErr, setInviteErr] = useState<string | null>(null);
  const [inviteSaving, setInviteSaving] = useState(false);

  const [editUser, setEditUser] = useState<ApiHarasUserRow | null>(null);
  const [editProfileId, setEditProfileId] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  const textColor = isDark ? "#E5E7EB" : "#0f172a";
  const mutedColor = isDark ? "#9CA3AF" : "#64748b";
  const glass: CSSProperties = {
    background: isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.75)",
    border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(148,163,184,0.2)"}`,
    backdropFilter: "blur(20px)",
    borderRadius: "24px",
    padding: "22px",
  };

  /** Mesmo visual/altura do card de cadastro de animais (registry). */
  const glassDark: CSSProperties = {
    background: isDark ? "rgba(2,6,23,0.96)" : "rgba(255,255,255,0.97)",
    border: `1px solid ${isDark ? "rgba(255,255,255,0.12)" : "rgba(148,163,184,0.25)"}`,
    backdropFilter: "blur(24px)",
    WebkitBackdropFilter: "blur(24px)",
    boxShadow: isDark ? "0 24px 60px rgba(0,0,0,0.8)" : "0 24px 60px rgba(15,23,42,0.18)",
  };

  const dividerColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(148,163,184,0.18)";
  const formCardFooterBg = isDark ? "rgba(255,255,255,0.04)" : "rgba(248,250,252,0.98)";

  const harasFormCardHeight = "min(calc(100dvh - 248px), 680px)";

  const inputStyle: CSSProperties = {
    width: "100%",
    padding: "12px 14px",
    borderRadius: "14px",
    border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(148,163,184,0.3)"}`,
    background: isDark ? "rgba(255,255,255,0.06)" : "rgba(248,250,252,1)",
    color: textColor,
    fontSize: "0.9rem",
    boxSizing: "border-box",
    fontFamily: "inherit",
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

  /** Painel do modal alinhado ao menu de perfil (fundo opaco, sem blur inconsistente). */
  const modalPanel: CSSProperties = {
    ...glass,
    background: isDark ? "#1a1f2e" : "#ffffff",
    backdropFilter: "none",
    WebkitBackdropFilter: "none",
    border: `1px solid ${isDark ? "#2d3548" : "#e2e8f0"}`,
    boxShadow: isDark ? "0 20px 50px rgba(0,0,0,0.55)" : "0 20px 50px rgba(15,23,42,0.14)",
    maxWidth: "100%",
  };

  const canManageUsers =
    session?.user?.profileCode === "owner" || session?.user?.profileCode === "admin";

  const loadUsers = useCallback(async () => {
    if (!ownerId || !canManageUsers) return;
    try {
      const list = await listHarasUsersApi(ownerId);
      setUsers(list);
    } catch {
      setUsers([]);
    }
  }, [ownerId, canManageUsers]);

  useEffect(() => {
    if (!session?.owner) return;
    const o = session.owner as Record<string, unknown>;
    setName(String(o.name ?? ""));
    setDocumentDigits(digitsDocumentMax14(String(o.document ?? "")));
    setPhone(formatPhoneDisplay(String(o.phone ?? "")));
    setEmail(String(o.email ?? ""));
    setAddress(String(o.address ?? ""));
    setZipcode(String(o.zipcode ?? ""));
    setState(String(o.state ?? ""));
    setCity(String(o.city ?? ""));
    setNeighborhood(String(o.neighborhood ?? ""));
  }, [session?.owner]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    if (!canManageUsers) return;
    (async () => {
      try {
        const p = await listAccessProfilesApi();
        setProfiles(p);
      } catch {
        setProfiles([]);
      }
    })();
  }, [canManageUsers]);

  async function onSaveHaras(e: FormEvent) {
    e.preventDefault();
    if (!ownerId) return;
    setErr(null);
    setSaving(true);
    try {
      let logoS3Key: string | undefined;
      const file = logoRef.current?.files?.[0];
      if (file) {
        const contentType = imageContentTypeFromFile(file);
        const { uploadUrl, key } = await presignOwnerLogoApi(ownerId, contentType);
        await putImageToPresignedUrl(uploadUrl, file, contentType);
        logoS3Key = key;
      }
      await updateOwnerApi(ownerId, {
        name: name.trim(),
        document: documentDigits || null,
        phone: normalizePhoneToE164(phone) || null,
        email: email.trim() || null,
        address: address.trim() || null,
        zipcode: zipcode.trim() || null,
        state: state.trim() || null,
        city: city.trim() || null,
        neighborhood: neighborhood.trim() || null,
        harasSetupCompleted: true,
        ...(logoS3Key ? { logoS3Key } : {}),
      });
      if (logoRef.current) logoRef.current.value = "";
      await refreshSession();
      router.push("/dashboard");
    } catch (er) {
      setErr(er instanceof Error ? er.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function submitInvite(e: FormEvent) {
    e.preventDefault();
    if (!ownerId) return;
    setInviteErr(null);
    setInviteSaving(true);
    try {
      const phoneE164 = normalizePhoneToE164(invitePhone);
      await inviteHarasUserApi(ownerId, {
        name: inviteName.trim(),
        email: inviteEmail.trim(),
        ...(phoneE164 ? { phone: phoneE164 } : {}),
        profileCode: inviteRole,
      });
      setInviteOpen(false);
      setInviteName("");
      setInviteEmail("");
      setInvitePhone("");
      setInviteRole("staff");
      await loadUsers();
    } catch (er) {
      setInviteErr(er instanceof Error ? er.message : "Erro ao enviar convite.");
    } finally {
      setInviteSaving(false);
    }
  }

  async function saveEditUser(e: FormEvent) {
    e.preventDefault();
    if (!editUser) return;
    setEditSaving(true);
    try {
      await updateHarasUserApi(editUser.id, { profileId: editProfileId });
      setEditUser(null);
      await loadUsers();
    } finally {
      setEditSaving(false);
    }
  }

  async function removeUser(u: ApiHarasUserRow) {
    if (!window.confirm(`Remover o acesso de ${u.email}?`)) return;
    try {
      await deleteHarasUserApi(u.id);
      await loadUsers();
    } catch (er) {
      window.alert(er instanceof Error ? er.message : "Erro ao remover.");
    }
  }

  useEffect(() => {
    if (editUser && profiles.length) {
      const pid = profiles.find((p) => p.code === editUser.profileCode)?.id ?? editUser.profileId;
      setEditProfileId(pid);
    }
  }, [editUser, profiles]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px", paddingBottom: "48px" }}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "20px",
          maxWidth: "560px",
          margin: "0 auto",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: "1.6rem", fontWeight: 900, color: textColor }}>Meu Haras</h2>
        </div>

        <div
          style={{
            ...glassDark,
            position: "relative",
            width: "100%",
            borderRadius: "28px",
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
            height: harasFormCardHeight,
            maxHeight: harasFormCardHeight,
            overflow: "hidden",
          }}
        >
          <form
            onSubmit={onSaveHaras}
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              minHeight: 0,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                flex: 1,
                minHeight: 0,
                overflowY: "auto",
                WebkitOverflowScrolling: "touch",
                padding: "20px 24px",
                display: "flex",
                flexDirection: "column",
                gap: "14px",
                boxSizing: "border-box",
              }}
            >
              {session?.ownerLogoUrl && (
                <div>
                  <span style={labelStyle}>Logo atual</span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={session?.ownerLogoUrl ?? ""}
                    alt="Logo"
                    style={{ maxHeight: "80px", borderRadius: "12px" }}
                  />
                </div>
              )}
              <div style={{ display: "grid", gap: "12px", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}>
                <div>
                  <label style={labelStyle}>Nome do haras</label>
                  <input required value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>CPF / CNPJ</label>
                  <input
                    value={formatCpfCnpjMask(documentDigits)}
                    onChange={(e) => setDocumentDigits(digitsDocumentMax14(e.target.value))}
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="Somente números (até 14)"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Telefone</label>
                  <input value={phone} onChange={(e) => setPhone(formatPhoneDisplay(e.target.value))} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>E-mail institucional</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Endereço</label>
                <input value={address} onChange={(e) => setAddress(e.target.value)} style={inputStyle} />
              </div>
              <div
                style={{
                  display: "grid",
                  gap: "12px",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                }}
              >
                <div>
                  <label style={labelStyle}>CEP</label>
                  <input value={zipcode} onChange={(e) => setZipcode(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Estado</label>
                  <input value={state} onChange={(e) => setState(e.target.value)} style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Cidade</label>
                <input value={city} onChange={(e) => setCity(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Bairro</label>
                <input value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Logotipo</label>
                <input ref={logoRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" style={inputStyle} />
              </div>
            </div>

            <div
              style={{
                flexShrink: 0,
                padding: "16px 24px 20px",
                borderTop: `1px solid ${dividerColor}`,
                background: formCardFooterBg,
              }}
            >
              {err && (
                <p style={{ margin: "0 0 12px", fontSize: "0.85rem", color: "#f87171" }} role="alert">
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
                  disabled={saving || !ownerId}
                  style={{
                    flex: "1 1 140px",
                    padding: "14px 20px",
                    borderRadius: "14px",
                    border: "none",
                    background: saving ? "#64748b" : "#10b981",
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
            </div>
          </form>
        </div>
      </div>

      {canManageUsers && (
        <div style={glass}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
            <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 800, color: textColor }}>Usuários</h3>
            <button
              type="button"
              onClick={() => setInviteOpen(true)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 14px",
                borderRadius: "12px",
                border: "none",
                background: "#2563eb",
                color: "#fff",
                fontWeight: 700,
                fontSize: "0.82rem",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              <Plus size={16} />
              Convidar
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {users.map((u) => (
              <div
                key={u.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 12px",
                  borderRadius: "12px",
                  background: isDark ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.04)",
                }}
              >
                <div>
                  <p style={{ margin: 0, fontWeight: 700, color: textColor, fontSize: "0.9rem" }}>{u.name}</p>
                  <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: mutedColor }}>
                    {u.email} · {u.profileCode}
                    {!u.active ? " · inativo" : ""}
                  </p>
                </div>
                <div style={{ display: "flex", gap: "6px" }}>
                  {u.profileCode !== "owner" && (
                    <>
                      <button
                        type="button"
                        aria-label="Editar perfil"
                        onClick={() => setEditUser(u)}
                        style={{
                          border: "none",
                          background: "transparent",
                          cursor: "pointer",
                          color: mutedColor,
                          padding: "6px",
                        }}
                      >
                        <Pencil size={18} />
                      </button>
                      <button
                        type="button"
                        aria-label="Remover"
                        onClick={() => void removeUser(u)}
                        style={{
                          border: "none",
                          background: "transparent",
                          cursor: "pointer",
                          color: "#f87171",
                          padding: "6px",
                        }}
                      >
                        <Trash2 size={18} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
            {users.length === 0 && <p style={{ color: mutedColor, margin: 0, fontSize: "0.9rem" }}>Nenhum usuário listado.</p>}
          </div>
        </div>
      )}

      {inviteOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            zIndex: 1300,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={() => !inviteSaving && setInviteOpen(false)}
        >
          <div
            style={{ ...modalPanel, maxWidth: "440px", width: "100%", padding: "24px" }}
            onClick={(ev) => ev.stopPropagation()}
          >
            <h4 style={{ margin: "0 0 16px", fontSize: "1.1rem", fontWeight: 800, color: textColor }}>Convidar usuário</h4>
            <form onSubmit={submitInvite} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={labelStyle}>Nome</label>
                <input required value={inviteName} onChange={(e) => setInviteName(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>E-mail</label>
                <input required type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Telefone</label>
                <input value={invitePhone} onChange={(e) => setInvitePhone(formatPhoneDisplay(e.target.value))} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Perfil</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as "staff" | "admin")}
                  style={inputStyle}
                >
                  <option value="staff">Equipe</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
              {inviteErr && (
                <p style={{ color: "#f87171", margin: 0, fontSize: "0.85rem" }} role="alert">
                  {inviteErr}
                </p>
              )}
              <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
                <button
                  type="button"
                  onClick={() => setInviteOpen(false)}
                  disabled={inviteSaving}
                  style={{
                    flex: 1,
                    padding: "12px 14px",
                    borderRadius: "14px",
                    border: `1px solid ${isDark ? "#3d4659" : "#cbd5e1"}`,
                    background: isDark ? "rgba(255,255,255,0.06)" : "#f8fafc",
                    color: textColor,
                    fontWeight: 600,
                    fontSize: "0.9rem",
                    fontFamily: "inherit",
                    cursor: inviteSaving ? "wait" : "pointer",
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={inviteSaving}
                  style={{
                    flex: 1,
                    padding: "12px 14px",
                    borderRadius: "14px",
                    border: "none",
                    background: inviteSaving ? "#64748b" : "#2563eb",
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: "0.9rem",
                    fontFamily: "inherit",
                    cursor: inviteSaving ? "wait" : "pointer",
                  }}
                >
                  {inviteSaving ? "Enviando…" : "Enviar convite"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editUser && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            zIndex: 1300,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={() => !editSaving && setEditUser(null)}
        >
          <div
            style={{ ...modalPanel, maxWidth: "400px", width: "100%", padding: "24px" }}
            onClick={(ev) => ev.stopPropagation()}
          >
            <h4 style={{ margin: "0 0 8px", fontSize: "1.1rem", fontWeight: 800, color: textColor }}>Perfil de acesso</h4>
            <p style={{ margin: "0 0 16px", fontSize: "0.85rem", color: mutedColor }}>{editUser.email}</p>
            <form onSubmit={saveEditUser} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={labelStyle}>Perfil</label>
                <select value={editProfileId} onChange={(e) => setEditProfileId(e.target.value)} style={inputStyle}>
                  {profiles
                    .filter((p) => p.code === "admin" || p.code === "staff")
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.code})
                      </option>
                    ))}
                </select>
              </div>
              <button
                type="submit"
                disabled={editSaving}
                style={{
                  padding: "12px 14px",
                  borderRadius: "14px",
                  border: "none",
                  background: editSaving ? "#64748b" : "#10b981",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: "0.9rem",
                  fontFamily: "inherit",
                  cursor: editSaving ? "wait" : "pointer",
                }}
              >
                {editSaving ? "Salvando…" : "Salvar"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
