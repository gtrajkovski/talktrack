"use client";

import { NextIntlClientProvider } from "next-intl";
import { useSettingsStore } from "@/stores/settingsStore";
import { type ReactNode, useEffect, useState } from "react";
import type { Locale } from "@/i18n/config";

// Static imports for all locale messages
import en from "../../../messages/en.json";
import es from "../../../messages/es.json";
import de from "../../../messages/de.json";

const messages: Record<Locale, typeof en> = { en, es, de };

interface IntlProviderProps {
  children: ReactNode;
}

export function IntlProvider({ children }: IntlProviderProps) {
  const { uiLanguage, _hasHydrated } = useSettingsStore();
  const [locale, setLocale] = useState<Locale>("en");

  // Sync locale with settings after hydration
  useEffect(() => {
    if (_hasHydrated && uiLanguage) {
      setLocale(uiLanguage);
    }
  }, [_hasHydrated, uiLanguage]);

  return (
    <NextIntlClientProvider locale={locale} messages={messages[locale]}>
      {children}
    </NextIntlClientProvider>
  );
}
