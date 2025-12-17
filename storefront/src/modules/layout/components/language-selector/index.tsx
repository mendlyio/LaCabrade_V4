"use client"

import { useState } from "react"

const LanguageSelector = () => {
  const [showNlMessage, setShowNlMessage] = useState(false)

  return (
    <div className="relative flex items-center gap-2 text-xs font-medium">
      <div className="px-2 py-1 rounded bg-amber-600 text-white">
        FR
      </div>
      <span className="text-gray-300">|</span>
      <button
        onClick={() => setShowNlMessage(true)}
        onMouseLeave={() => setShowNlMessage(false)}
        className="relative px-2 py-1 rounded text-gray-600 hover:text-amber-600 hover:bg-amber-50 transition-colors"
      >
        NL
        {showNlMessage && (
          <div className="absolute top-full right-0 mt-2 w-48 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl z-50">
            <p className="font-medium mb-1">Bientôt disponible</p>
            <p className="text-gray-300">La version néerlandaise arrive prochainement</p>
          </div>
        )}
      </button>
    </div>
  )
}

export default LanguageSelector

