
"use client";

import * as React from "react";
import { useI18n } from "@/context/i18n-provider";
import {
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Languages } from "lucide-react";

export function LanguageToggle() {
  const { setLocale, locale } = useI18n();

  return (
    <>
      <DropdownMenuItem
        onClick={() => setLocale("es")}
        disabled={locale === "es"}
      >
        <Languages className="mr-2 h-4 w-4" />
        Español
      </DropdownMenuItem>
      <DropdownMenuItem
        onClick={() => setLocale("en")}
        disabled={locale === "en"}
      >
        <Languages className="mr-2 h-4 w-4" />
        English
      </DropdownMenuItem>
    </>
  );
}
