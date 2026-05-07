import "./globals.css";
import "@/styles/style.css";
import "@/styles/auth.css";
import "@/styles/editor.css";
import "@/styles/admin.css";
import type { Metadata } from "next";
import { Fira_Code, Orbitron, Share_Tech_Mono, VT323 } from "next/font/google";
import type { ReactNode } from "react";

const shareTechMono = Share_Tech_Mono({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-mono",
});

const orbitron = Orbitron({
  subsets: ["latin"],
  weight: ["400", "700", "900"],
  variable: "--font-display",
});

const vt323 = VT323({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-retro",
});

const firaCode = Fira_Code({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-code",
});

export const metadata: Metadata = {
  title: "HACKCODE",
  description:
    "Sistema de treinamento HACKCODE migrado para Next.js e Tailwind CSS.",
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="pt-BR">
      <head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/codemirror.min.css"
        />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/theme/monokai.min.css"
        />
      </head>
      <body
        className={`${shareTechMono.variable} ${orbitron.variable} ${vt323.variable} ${firaCode.variable}`}
      >
        {children}
      </body>
    </html>
  );
}
