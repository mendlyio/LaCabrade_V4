"use client"

import { useLanguage } from "@lib/context/language-context"

const LanguageSelector = () => {
  const { language, setLanguage } = useLanguage()

  return (
    <div className="relative flex items-center gap-1 text-xs font-medium">
      <button
        onClick={() => setLanguage("fr")}
        className={`px-2 py-1 rounded transition-colors ${
          language === "fr"
            ? "bg-white text-amber-700 font-bold"
            : "text-white/70 hover:text-white hover:bg-white/10"
        }`}
      >
        FR
      </button>
      <span className="text-white/40">|</span>
      <button
        onClick={() => setLanguage("nl")}
        className={`px-2 py-1 rounded transition-colors ${
          language === "nl"
            ? "bg-white text-amber-700 font-bold"
            : "text-white/70 hover:text-white hover:bg-white/10"
        }`}
      >
        NL
      </button>
    </div>
  )
}

export default LanguageSelector

