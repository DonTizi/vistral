import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: "VISTRAL - Video World-State Intelligence",
  description: "Build Temporal Knowledge Graphs from enterprise videos. Powered by Mistral AI.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`min-h-screen antialiased ${inter.className}`}>
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <div className="flex-1 min-w-0 overflow-hidden">
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
