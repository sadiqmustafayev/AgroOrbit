import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AgroOrbit – Qabaqcıl Kənd Təsərrüfatı İntellekti və Rəqəmsal Əkiz Platforması",
  description:
    "NASA Peyk Monitorinqi (HLS, POWER, SMAP, GPM IMERG), Аğıllı GIS Xəritə, İzahlı Aqronomik Risk Sistemi, AgroAI Süni İntellekt Aqronom, Analiz və Dron Xidmətləri Ekosistemi",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="az">
      <body className="antialiased selection:bg-emerald-500 selection:text-slate-950">
        {children}
      </body>
    </html>
  );
}
