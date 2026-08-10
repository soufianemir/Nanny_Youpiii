import "./globals.css";
import "./v4-components.css";
import "./activity-flow.css";
import "@neondatabase/auth-ui/css";
import type { Metadata, Viewport } from "next";
import { NeonAuthProvider } from "@/components/neon-auth-provider";

export const metadata: Metadata = {
  title: { default: "Nanny Youpiii", template: "%s · Nanny Youpiii" },
  description: "Organisez simplement le quotidien de vos enfants avec toutes les personnes qui s’en occupent.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Nanny Youpiii" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#f7f6f2" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="fr"><body><NeonAuthProvider>{children}</NeonAuthProvider></body></html>;
}
