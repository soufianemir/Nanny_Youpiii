import "./globals.css";
import "./v3-simplified.css";
import "@neondatabase/auth-ui/css";
import type { Metadata } from "next";
import { NeonAuthProvider } from "@/components/neon-auth-provider";

export const metadata: Metadata = { title: "Nanny Youpiii", description: "Organiser et partager simplement le quotidien des enfants.", manifest: "/manifest.webmanifest", icons: { icon: "/icon.svg" } };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="fr"><body><NeonAuthProvider>{children}</NeonAuthProvider></body></html>;
}
