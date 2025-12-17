"use client"

import { useLanguage } from "@lib/context/language-context"

const LanguageSelector = () => {
  const { language, setLanguage } = useLanguage()

  return (
    <div className="relative flex items-center gap-2 text-xs font-medium">
      <button
        onClick={() => setLanguage("fr")}
        className={`px-2 py-1 rounded transition-colors ${
          language === "fr"
            ? "bg-amber-600 text-white"
            : "text-gray-600 hover:text-amber-600 hover:bg-amber-50"
        }`}
      >
        FR
      </button>
      <span className="text-gray-300">|</span>
      <button
        onClick={() => setLanguage("nl")}
        className={`px-2 py-1 rounded transition-colors ${
          language === "nl"
            ? "bg-amber-600 text-white"
            : "text-gray-600 hover:text-amber-600 hover:bg-amber-50"
        }`}
      >
        NL
      </button>
    </div>
  )
}

export default LanguageSelector

