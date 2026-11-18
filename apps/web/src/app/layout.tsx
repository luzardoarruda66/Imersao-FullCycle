import type { Metadata } from "next";
import { Lato } from "next/font/google";
import { Toaster } from "@/app/components/ui/toaster";
import "./globals.css";

const lato = Lato({
  variable: "--font-lato",
  subsets: ["latin"],
  weight: ["400", "700", "900"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Full Cycle Chat",
  description: "Chat do workspace Full Cycle",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // Sem `data-theme`: o tema segue o do sistema operacional (design system, "Tema claro e escuro").
    <html lang="pt-BR" className={`${lato.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
