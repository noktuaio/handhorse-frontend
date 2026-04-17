import type { ReactNode } from "react";
import type { Viewport } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/shared/ui/theme-context";

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
    <html lang="pt-BR">
      <body className={inter.className} style={{ margin: 0 }}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
