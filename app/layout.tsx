import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Hanken_Grotesk } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/components/AppContext";
import BottomNav from "@/components/BottomNav";
import ContextTopBar from "@/components/ContextTopBar";
import Onboarding from "@/components/Onboarding";
import AuthGate from "@/components/AuthGate";

const hanken = Hanken_Grotesk({ subsets: ["latin"], variable: "--font-ui", display: "swap" });
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Stufenportal",
  description: "Selbstorganisation der Stufe — Events, News, Abstimmungen, Kasse.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Stufe" },
  other: { "mobile-web-app-capable": "yes" },
};

export const viewport: Viewport = {
  themeColor: "#f4f2ec",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className={`${hanken.variable} ${bricolage.variable}`} suppressHydrationWarning>
      <head>
        {/* Theme früh setzen, um Flash zu vermeiden. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{document.documentElement.setAttribute('data-theme',localStorage.getItem('sp_theme')==='dark'?'dark':'light')}catch(e){document.documentElement.setAttribute('data-theme','light')}`,
          }}
        />
      </head>
      <body>
        <AppProvider>
          <div className="sp-stage">
            <div className="sp-device">
              <div className="sp-grain" />
              <ContextTopBar />
              <main className="sp-content">
                <AuthGate>{children}</AuthGate>
              </main>
              <BottomNav />
              <Onboarding />
            </div>
          </div>
        </AppProvider>
      </body>
    </html>
  );
}
