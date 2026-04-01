import type { Metadata } from "next";
import { Inter, Noto_Serif } from "next/font/google";
import "./globals.css";

const interSans = Inter({
  variable: "--font-inter-sans",
  subsets: ["latin"],
});

const notoSerif = Noto_Serif({
  variable: "--font-noto-serif",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MB Affiliate",
  description: "Gerencie seus links de afiliado.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${interSans.variable} ${notoSerif.variable} antialiased h-full`}>
      <body className="min-h-full flex flex-col relative overflow-x-hidden text-white font-sans bg-brand-bg">
        {/* Lojavarejo background effects */}
        <div className="fixed inset-0 bg-[linear-gradient(180deg,rgba(18,12,10,0.56),rgba(18,12,10,0.46))] z-[-2]" />
        <div className="fixed inset-0 bg-[radial-gradient(circle_at_top,rgba(255,242,222,0.18),transparent_42%)] z-[-1]" />
        {children}
      </body>
    </html>
  );
}
