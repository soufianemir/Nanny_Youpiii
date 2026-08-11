import "./globals.css";
import "./v4-components.css";
import "./v5.css";
import "./v5-history.css";
import "./v51.css";
import "./v53.css";
import "./v54.css";
import "./v57.css";
import "./v571.css";
import "@neondatabase/auth-ui/css";
import type { Metadata, Viewport } from "next";
import { NeonAuthProvider } from "@/components/neon-auth-provider";

export const metadata: Metadata = {title:{default:"Nanny Youpiii",template:"%s · Nanny Youpiii"},description:"Le cerveau partagé de la garde d’enfants : planning, consignes, activités, courses et informations utiles pour tous les adultes autorisés.",manifest:"/manifest.webmanifest",icons:{icon:"/icon.svg",apple:"/icon.svg"},appleWebApp:{capable:true,statusBarStyle:"default",title:"Nanny Youpiii"}};
export const viewport: Viewport={width:"device-width",initialScale:1,viewportFit:"cover",themeColor:"#f7f6f2"};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="fr" suppressHydrationWarning><body><NeonAuthProvider>{children}</NeonAuthProvider></body></html>}
