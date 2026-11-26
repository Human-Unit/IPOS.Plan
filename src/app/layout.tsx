import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./surfaces.css";
import "./dashboard-hero.css";
import "./workspace.css";
import "./document.css";
import "./cobalt-surfaces.css";
import "./editor-reference-header.css";
import "./editor-reference-outline.css";
import "./editor-reference-document.css";
import "./editor-reference-inspector.css";
import "./people.css";
import "./print.css";
import { AppProviders } from "@/components/theme/app-providers";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "IPOS · Контент-планы",
  description: "Локальный конструктор контент-планов медиасектора",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  interactiveWidget: "resizes-content",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        {/* eslint-disable-next-line @next/next/no-page-custom-font -- Registered document fonts are shared by every App Router route. */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Golos+Text:wght@400;500;600;700&family=Inter:wght@300;400;500;600;700;800&family=Lora:wght@400;500;600;700&family=Manrope:wght@400;500;600;700&family=Merriweather:wght@300;400;700&family=Montserrat:wght@300;400;500;600;700;800&family=Noto+Sans:wght@400;500;600;700&family=Noto+Serif:wght@400;500;600;700&family=PT+Sans:wght@400;700&family=PT+Serif:wght@400;700&family=Roboto:wght@300;400;500;600;700&family=Rubik:wght@400;500;600;700&display=swap"
        />
      </head>
      <body>
        <AppProviders>
          {children}
          <Toaster richColors closeButton />
        </AppProviders>
      </body>
    </html>
  );
}
