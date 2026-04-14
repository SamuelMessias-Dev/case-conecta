import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Conecta Obras - SDR Inteligente",
  description: "Dashboard inteligente de prospecção",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} dark antialiased h-full`}
      style={{ colorScheme: "dark" }}
    >
      <body className="min-h-full flex flex-col selection:bg-blue-500/30 selection:text-white">
        {children}
      </body>
    </html>
  );
}
