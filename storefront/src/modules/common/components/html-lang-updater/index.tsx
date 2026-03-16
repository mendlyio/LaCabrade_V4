"use client"

import { useEffect } from "react"
import { useLanguage } from "@lib/context/language-context"

const LANG_MAP: Record<string, string> = {
  fr: "fr-BE",
  nl: "nl-BE",
}

export default function HtmlLangUpdater() {
  const { language } = useLanguage()

  useEffect(() => {
    document.documentElement.lang = LANG_MAP[language] || "fr-BE"
  }, [language])

  return null
}
