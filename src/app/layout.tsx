import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AdZenda",
  description: "Panel de administración de Meta Ads",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
