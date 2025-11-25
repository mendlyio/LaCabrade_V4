"use client"

import { useParams } from "next/navigation"
import { usePathname } from "next/navigation"
import Link from "next/link"

const LanguageSelector = () => {
  const { countryCode } = useParams()
  const pathname = usePathname()

  // Fonction pour changer la langue dans l'URL
  const getLanguageUrl = (lang: 'fr' | 'nl') => {
    // Si on est sur /be, on reste sur /be pour FR, on va sur /nl pour NL
    // Pour l'instant on simplifie: FR = be, NL = nl
    const newCountryCode = lang === 'fr' ? 'be' : 'nl'
    return pathname.replace(`/${countryCode}`, `/${newCountryCode}`)
  }

  // Détecter la langue actuelle basée sur le countryCode
  const currentLang = countryCode === 'nl' ? 'nl' : 'fr'

  return (
    <div className="flex items-center gap-2 text-xs font-medium">
      <Link
        href={getLanguageUrl('fr')}
        className={`px-2 py-1 rounded transition-colors ${
          currentLang === 'fr'
            ? 'bg-amber-600 text-white'
            : 'text-gray-600 hover:text-amber-600 hover:bg-amber-50'
        }`}
      >
        FR
      </Link>
      <span className="text-gray-300">|</span>
      <Link
        href={getLanguageUrl('nl')}
        className={`px-2 py-1 rounded transition-colors ${
          currentLang === 'nl'
            ? 'bg-amber-600 text-white'
            : 'text-gray-600 hover:text-amber-600 hover:bg-amber-50'
        }`}
      >
        NL
      </Link>
    </div>
  )
}

export default LanguageSelector

