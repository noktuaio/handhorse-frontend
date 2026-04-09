import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/shared/ui/theme-context";

type RootLayoutProps = {
  children: ReactNode;
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
