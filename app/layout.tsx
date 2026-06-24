import type { Metadata, Viewport } from "next";
import { Inter, Fraunces } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/components/AppContext";
import BottomNav from "@/components/BottomNav";
import Onboarding from "@/components/Onboarding";

const inter = Inter({ subsets: ["latin"], variable: "--font-ui", display: "swap" });
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600"],
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
  themeColor: "#fafaf7",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" suppressHydrationWarning>
      <head>
        {/* Theme früh setzen, um Flash zu vermeiden. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{document.documentElement.setAttribute('data-theme',localStorage.getItem('sp_theme')||'light')}catch(e){document.documentElement.setAttribute('data-theme','light')}`,
          }}
        />
      </head>
      <body className={`${inter.variable} ${fraunces.variable}`}>
        <AppProvider>
          <main className="mx-auto min-h-screen max-w-screen-sm px-4 pt-3">{children}</main>
          <BottomNav />
          <Onboarding />
        </AppProvider>
      </body>
    </html>
  );
}
