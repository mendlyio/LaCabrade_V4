"use client"

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react"
import { getTranslation, type Language } from "@lib/translations"

type LanguageContextType = {
  language: Language
  setLanguage: (lang: Language) => void
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("fr")

  useEffect(() => {
    const savedLang = localStorage.getItem("language") as Language
    if (savedLang && (savedLang === "fr" || savedLang === "nl")) {
      setLanguageState(savedLang)
    }
  }, [])

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang)
    localStorage.setItem("language", lang)
  }, [])

  const value = useMemo(() => ({ language, setLanguage }), [language, setLanguage])

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider")
  }
  return context
}

export function useTranslate() {
  const { language } = useLanguage()
  return useCallback((key: string) => getTranslation(language, key), [language])
}

