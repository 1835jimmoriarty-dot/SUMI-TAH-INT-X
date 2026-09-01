import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SUMI-TAH — Automated Threat Hunting & Adversary Intelligence Platform",
  description: "Enterprise SOC & Threat Hunting Platform with Multi-SIEM Workbench, MITRE ATT&CK, IOC Engine, and SOAR Automation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-charcoal-950 text-gray-100 min-h-screen antialiased selection:bg-jade-500/30 selection:text-jade-200">
        {children}
      </body>
    </html>
  );
}