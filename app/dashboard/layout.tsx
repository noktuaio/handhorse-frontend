"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode, type CSSProperties } from "react";
import {
  LayoutDashboard,
  HeartPulse,
  Bell,
  Wallet,
  GitBranch,
  Trophy,
  LogOut,
  User,
  Building2,
  ChevronDown,
  Menu,
  X,
} from "lucide-react";
import { IconHorse } from "@tabler/icons-react";
import { useTheme } from "@/shared/ui/theme-context";
import { useScrollLock } from "@/shared/ui/use-scroll-lock";
import { clearAuthTokens } from "@/shared/infrastructure/auth/token-storage";
import {
  DashboardNavLoadingStrip,
  NavLoadingProvider,
} from "./nav-loading-context";
import { userAvatarInitials } from "@/shared/application/name-initials";
import { DashboardSessionProvider, useDashboardSession } from "./session-context";
import styles from "./shell.module.css";

// Wrapper to map Lucide-style strokeWidth → Tabler stroke prop
function HorseNavIcon({ size, strokeWidth }: { size?: number; strokeWidth?: number }) {
  return <IconHorse size={size} stroke={strokeWidth} />;
}

const NAV_ITEMS = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Painel" },
  { href: "/dashboard/registry", icon: HorseNavIcon, label: "Cavalos" },
  { href: "/dashboard/health", icon: HeartPulse, label: "Saúde" },
  { href: "/dashboard/reminders", icon: Bell, label: "Compromissos" },
  { href: "/dashboard/awards", icon: Trophy, label: "Premiações" },
  { href: "/dashboard/finances", icon: Wallet, label: "Financeiro" },
  { href: "/dashboard/genealogy", icon: GitBranch, label: "Árvore" },
] as const;

function ProfileMenu({ isDark }: { isDark: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const { session } = useDashboardSession();
  const muted = isDark ? "#9CA3AF" : "#64748b";
  const text = isDark ? "#E5E7EB" : "#0f172a";
  /** Superfície opaca (sem glass) para o menu de perfil */
  const menuSurface: CSSProperties = {
    background: isDark ? "#1a1f2e" : "#ffffff",
    border: `1px solid ${isDark ? "#2d3548" : "#e2e8f0"}`,
    boxShadow: isDark ? "0 8px 28px rgba(0,0,0,0.45)" : "0 8px 28px rgba(15,23,42,0.1)",
  };

  useEffect(() => {
    if (!open) return;
    function close(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [open]);

  function handleLogout() {
    clearAuthTokens();
    router.push("/auth/login");
  }

  const avatarUrl = session?.profilePhotoUrl;
  const initials = userAvatarInitials(session?.user?.name, session?.user?.email);

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        style={{
          ...menuSurface,
          padding: "6px 10px 6px 6px",
          borderRadius: "14px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          cursor: "pointer",
        }}
      >
        <span
          style={{
            width: 32,
            height: 32,
            borderRadius: "10px",
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(135deg, #3b82f6, #10b981)",
            color: "#fff",
            fontWeight: 800,
            fontSize: initials.length > 1 ? "0.68rem" : "0.85rem",
            flexShrink: 0,
          }}
        >
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" width={32} height={32} style={{ objectFit: "cover" }} />
          ) : (
            initials
          )}
        </span>
        <ChevronDown size={16} color={muted} style={{ flexShrink: 0 }} aria-hidden />
      </button>
      {open && (
        <div
          role="menu"
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 8px)",
            minWidth: "200px",
            ...menuSurface,
            borderRadius: "16px",
            padding: "8px",
            zIndex: 200,
            boxShadow: isDark ? "0 20px 50px rgba(0,0,0,0.55)" : "0 20px 50px rgba(15,23,42,0.14)",
          }}
        >
          <Link
            href="/dashboard/profile"
            role="menuitem"
            onClick={() => setOpen(false)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "10px 12px",
              borderRadius: "12px",
              color: text,
              textDecoration: "none",
              fontSize: "0.9rem",
              fontWeight: 600,
            }}
          >
            <User size={18} color="#3b82f6" aria-hidden />
            Meus dados
          </Link>
          <Link
            href="/dashboard/haras"
            role="menuitem"
            onClick={() => setOpen(false)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "10px 12px",
              borderRadius: "12px",
              color: text,
              textDecoration: "none",
              fontSize: "0.9rem",
              fontWeight: 600,
            }}
          >
            <Building2 size={18} color="#10b981" aria-hidden />
            Meu Haras
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              handleLogout();
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              width: "100%",
              padding: "10px 12px",
              borderRadius: "12px",
              border: "none",
              background: "transparent",
              cursor: "pointer",
              color: "#ef4444",
              fontSize: "0.9rem",
              fontWeight: 600,
              fontFamily: "inherit",
              textAlign: "left",
            }}
          >
            <LogOut size={18} aria-hidden />
            Sair
          </button>
        </div>
      )}
    </div>
  );
}

function AppSideDrawer({
  open,
  onClose,
  isDark,
  pathname,
}: {
  open: boolean;
  onClose: () => void;
  isDark: boolean;
  pathname: string;
}) {
  const router = useRouter();
  useScrollLock(open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const panelBg = isDark ? "#0f1419" : "#f8fafc";
  const borderC = isDark ? "#2d3548" : "#e2e8f0";
  const text = isDark ? "#E5E7EB" : "#0f172a";
  const muted = isDark ? "#9CA3AF" : "#64748b";

  const itemBase: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    width: "100%",
    padding: "12px 12px",
    borderRadius: "12px",
    textDecoration: "none",
    color: text,
    fontSize: "0.9rem",
    fontWeight: 600,
    border: "none",
    background: "transparent",
    cursor: "pointer",
    textAlign: "left",
    fontFamily: "inherit",
    boxSizing: "border-box",
  };

  function handleLogout() {
    clearAuthTokens();
    onClose();
    router.push("/auth/login");
  }

  return (
    <>
      <button
        type="button"
        className={styles.drawerOverlay}
        aria-label="Fechar menu"
        onClick={onClose}
      />
      <div
        className={styles.drawerPanel}
        style={{ background: panelBg, borderRight: `1px solid ${borderC}` }}
        role="dialog"
        aria-modal="true"
        aria-label="Navegação e conta"
        id="app-dashboard-drawer"
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 16px 12px",
            borderBottom: `1px solid ${borderC}`,
            flexShrink: 0,
          }}
        >
          <span style={{ fontWeight: 800, color: text, fontSize: "1rem" }}>Menu</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar menu"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 8,
              borderRadius: 12,
              border: "none",
              background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
              cursor: "pointer",
            }}
          >
            <X size={22} color={muted} aria-hidden />
          </button>
        </div>

        <nav
          style={{ flex: 1, overflow: "auto", padding: "12px 10px" }}
          aria-label="Secções do painel"
        >
          <p
            style={{
              fontSize: "0.65rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              color: muted,
              margin: "8px 8px 10px",
            }}
          >
            Secções
          </p>
          {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                style={{
                  ...itemBase,
                  marginBottom: 4,
                  backgroundColor: isActive
                    ? isDark
                      ? "rgba(37,99,235,0.25)"
                      : "rgba(37,99,235,0.1)"
                    : "transparent",
                  color: isActive ? "#3b82f6" : text,
                }}
              >
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} color={isActive ? "#3b82f6" : muted} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div
          style={{
            borderTop: `1px solid ${borderC}`,
            padding: "12px 10px 20px",
            flexShrink: 0,
          }}
        >
          <p
            style={{
              fontSize: "0.65rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              color: muted,
              margin: "8px 8px 10px",
            }}
          >
            Conta
          </p>
          <Link
            href="/dashboard/profile"
            onClick={onClose}
            style={{ ...itemBase, marginBottom: 4 }}
          >
            <User size={20} color="#3b82f6" aria-hidden />
            Meus dados
          </Link>
          <Link
            href="/dashboard/haras"
            onClick={onClose}
            style={{ ...itemBase, marginBottom: 4 }}
          >
            <Building2 size={20} color="#10b981" aria-hidden />
            Meu Haras
          </Link>
          <button type="button" onClick={handleLogout} style={{ ...itemBase, color: "#ef4444" }}>
            <LogOut size={20} aria-hidden />
            Sair
          </button>
        </div>
      </div>
    </>
  );
}

function DashboardLayoutInner({ children }: { children: ReactNode }) {
  const { theme } = useTheme();
  const pathname = usePathname();
  const isDark = theme === "dark";
  const [sideMenuOpen, setSideMenuOpen] = useState(false);

  useEffect(() => {
    setSideMenuOpen(false);
  }, [pathname]);

  const glass: CSSProperties = {
    background: isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.75)",
    border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(148,163,184,0.2)"}`,
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    boxShadow: isDark
      ? "0 4px 32px rgba(0,0,0,0.5)"
      : "0 4px 32px rgba(15,23,42,0.08)",
  };

  const textColor = isDark ? "#E5E7EB" : "#0f172a";
  const mutedColor = isDark ? "#6B7280" : "#94a3b8";

  return (
    <div className={styles.root}>
      <AppSideDrawer
        open={sideMenuOpen}
        onClose={() => setSideMenuOpen(false)}
        isDark={isDark}
        pathname={pathname}
      />
      {/* ── Top Header ── */}
      <header className={styles.header}>
        <div
          style={{
            ...glass,
            borderRadius: "2rem",
            padding: "10px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            maxWidth: "1280px",
            margin: "0 auto",
            gap: 12,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              minWidth: 0,
            }}
          >
            <button
              type="button"
              onClick={() => setSideMenuOpen((o) => !o)}
              aria-label={sideMenuOpen ? "Fechar menu de navegação" : "Abrir menu de navegação"}
              aria-expanded={sideMenuOpen}
              aria-controls="app-dashboard-drawer"
              style={{
                ...glass,
                padding: "9px",
                borderRadius: "14px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                border: "1px solid transparent",
              }}
            >
              {sideMenuOpen ? (
                <X size={20} color={isDark ? "#E5E7EB" : "#0f172a"} aria-hidden />
              ) : (
                <Menu size={20} color={isDark ? "#E5E7EB" : "#0f172a"} aria-hidden />
              )}
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
              <Image src="/logo-handhorse.png" alt="HandHorse" width={34} height={34} />
              <span
                style={{
                  fontWeight: 900,
                  fontSize: "1.05rem",
                  letterSpacing: "-0.02em",
                  background: "linear-gradient(90deg, #3b82f6, #10b981)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                HandHorse
              </span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
            <ProfileMenu isDark={isDark} />
          </div>
        </div>
      </header>

      {/* ── Main content ── */}
      <main className={styles.main} style={{ color: textColor }}>
        {children}
      </main>

      {/* ── Navegação (sidebar em desktop) + loading no rodapé do ecrã em desktop ── */}
      <div className={styles.chromeDock}>
        <footer className={styles.navZone} aria-label="Navegação principal">
          <nav className={styles.nav} aria-label="Secções">
            <div className={styles.navPill} style={glass}>
              {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
                const isActive = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-label={label}
                    title={label}
                    style={{
                      padding: "12px",
                      borderRadius: "22px",
                      /* inline-flex: antes de carregar o CSS de .navPill, evita blocos empilhados (flex em <a> vira block) */
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      textDecoration: "none",
                      transition: "background 0.2s, box-shadow 0.2s",
                      backgroundColor: isActive ? "#2563eb" : "transparent",
                      color: isActive ? "#fff" : mutedColor,
                      boxShadow: isActive ? "0 4px 16px rgba(37,99,235,0.4)" : "none",
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={21} strokeWidth={isActive ? 2.5 : 2} />
                  </Link>
                );
              })}
            </div>
          </nav>
        </footer>
        <div className={styles.screenFooterLoading}>
          <DashboardNavLoadingStrip isDark={isDark} mutedColor={mutedColor} />
        </div>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <NavLoadingProvider>
      <DashboardSessionProvider>
        <DashboardLayoutInner>{children}</DashboardLayoutInner>
      </DashboardSessionProvider>
    </NavLoadingProvider>
  );
}
