import type { Metadata, Viewport } from "next";
import "./globals.css";
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
      <body>
        {children}
        <Toaster theme="light" richColors closeButton />
      </body>
    </html>
  );
}
