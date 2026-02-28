import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VISTRAL - Video World-State Intelligence",
  description: "Build Temporal Knowledge Graphs from enterprise videos. Powered by Mistral AI.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
