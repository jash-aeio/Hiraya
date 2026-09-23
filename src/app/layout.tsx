import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { ToastProvider } from "@/design";
import { fontSans } from "@/design/font";
import { DemoBar } from "@/features/demo/components/DemoBar";
import { AppNav } from "@/features/navigation/components/AppNav";

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
          <ToastProvider>
            {/* The DEMO DATA marker lives here, above every screen, because a
                marker each screen has to remember is a marker one screen will
                forget — and that screen is the one in the deck (D23). It
                renders nothing at all when there is no demo session. */}
            <DemoBar />
            {children}
            {/* The app's only `nav` landmark, mounted once here for the same
                reason DemoBar is: navigation each screen has to remember is
                navigation one screen will forget. It renders nothing when
                there is no session, and hides itself on /demo and /design. */}
            <AppNav />
          </ToastProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
