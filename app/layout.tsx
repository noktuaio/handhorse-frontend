import type { ReactNode } from "react";
import type { Viewport } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import { ThemeProvider } from "@/shared/ui/theme-context";
import { THEME_STORAGE_KEY } from "@/shared/ui/theme-constants";
import "./globals.css";

type RootLayoutProps = {
  children: ReactNode;
};

/** Garante escala correcta em telemóvel e no responsive mode do browser (export estático). */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

const inter = Inter({ subsets: ["latin"], display: "swap" });

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="pt-BR" style={{ overflowX: "hidden" }}>
      <body
        className={inter.className}
        style={{
          margin: 0,
          overflowX: "hidden",
          width: "100%",
          maxWidth: "100%",
          minHeight: "100dvh",
          WebkitTextSizeAdjust: "100%",
        }}
      >
        <Script
          id="handhorse-theme-boot"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `try{var k=${JSON.stringify(THEME_STORAGE_KEY)};var t=localStorage.getItem(k);if(t==="dark"){document.body.style.backgroundColor="#020617";document.body.style.backgroundImage="radial-gradient(circle at top right, rgba(15,23,42,0.85), #020617)";document.body.style.backgroundRepeat="no-repeat";document.body.style.backgroundAttachment="fixed";document.body.style.backgroundSize="cover";}else if(t==="light"){document.body.style.backgroundColor="#f8fafc";document.body.style.backgroundImage="linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)";document.body.style.backgroundRepeat="no-repeat";document.body.style.backgroundAttachment="fixed";document.body.style.backgroundSize="cover";}document.documentElement.setAttribute("data-handhorse-theme",t==="dark"?"dark":t==="light"?"light":"light");}catch(e){}`,
          }}
        />
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
