import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./editor-polish.css";
import "./typography-layout.css";
import "./watermark.css";
import "./a4-workspace.css";
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
    <html lang="ru">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Golos+Text:wght@400;500;600;700&family=Inter:wght@300;400;500;600;700;800&family=Lora:wght@400;500;600;700&family=Manrope:wght@400;500;600;700&family=Merriweather:wght@300;400;700&family=Montserrat:wght@300;400;500;600;700;800&family=Noto+Sans:wght@400;500;600;700&family=Noto+Serif:wght@400;500;600;700&family=PT+Sans:wght@400;700&family=PT+Serif:wght@400;700&family=Roboto:wght@300;400;500;600;700&family=Rubik:wght@400;500;600;700&display=swap"
        />
      </head>
      <body>
        {children}
        <Toaster theme="light" richColors closeButton />
      </body>
    </html>
  );
}
