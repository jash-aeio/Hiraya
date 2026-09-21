import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { ToastProvider } from "@/design";
import { fontSans } from "@/design/font";

import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("app");
  return {
    title: t("name"),
    description: t("tagline"),
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // The canvas token, so the browser chrome matches the app rather than flashing
  // white on a phone that draws behind the status bar.
  themeColor: "#f4f5f8",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} className={fontSans.variable}>
      {/* Colour, type and background come from the token layer (src/design/tokens.css).
          Dark mode is deliberately not in the MVP — DESIGN_SYSTEM.md §2. */}
      <body className="min-h-dvh">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ToastProvider>{children}</ToastProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
