import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: "VISTRAL - Video World-State Intelligence",
  description: "Build Temporal Knowledge Graphs from enterprise videos. Powered by Mistral AI.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`min-h-screen antialiased ${inter.className}`}>
        {children}
      </body>
    </html>
  );
}
