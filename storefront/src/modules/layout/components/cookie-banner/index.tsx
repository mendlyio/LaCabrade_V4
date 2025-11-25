"use client"

import { useState, useEffect } from "react"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

export default function CookieBanner() {
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    // Check if cookie_consent cookie exists
    const consent = getCookie("cookie_consent")
    if (!consent) {
      setShowBanner(true)
    }
  }, [])

  const acceptCookies = () => {
    setCookie("cookie_consent", "true", 365)
    setShowBanner(false)
    // Here you would trigger Google Analytics or other scripts
  }

  const declineCookies = () => {
    setCookie("cookie_consent", "false", 365)
    setShowBanner(false)
  }

  if (!showBanner) return null

  return (
    <div className="fixed bottom-0 left-0 w-full bg-black/95 text-white border-t border-gray-800 z-[9999] p-4 md:p-6 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] animate-slide-up">
      <div className="content-container mx-auto flex flex-col md:flex-row items-center justify-between gap-6 max-w-7xl">
        <div className="flex-1 text-center md:text-left">
          <h3 className="text-lg font-bold mb-2 text-white">
            🍪 Nous respectons votre vie privée
          </h3>
          <p className="text-sm text-gray-300 leading-relaxed">
            Nous utilisons des cookies pour améliorer votre expérience, analyser le trafic et personnaliser le contenu. 
            En cliquant sur "Tout accepter", vous consentez à notre utilisation des cookies. 
            Vous pouvez refuser ou gérer vos préférences à tout moment.
            <br className="hidden md:block" />
            <LocalizedClientLink href="/privacy-policy" className="text-amber-500 hover:text-amber-400 underline mt-1 inline-block">
              Lire notre politique de confidentialité
            </LocalizedClientLink>
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto min-w-fit">
          <button
            onClick={declineCookies}
            className="px-6 py-3 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white transition-all text-sm font-medium w-full sm:w-auto"
          >
            Continuer sans accepter
          </button>
          <button
            onClick={acceptCookies}
            className="px-6 py-3 rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 text-white font-bold shadow-lg hover:from-amber-700 hover:to-orange-700 transform hover:scale-105 transition-all text-sm w-full sm:w-auto"
          >
            Tout accepter
          </button>
        </div>
      </div>
    </div>
  )
}

// Helper functions
function setCookie(name: string, value: string, days: number) {
  let expires = ""
  if (days) {
    const date = new Date()
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000))
    expires = "; expires=" + date.toUTCString()
  }
  document.cookie = name + "=" + (value || "") + expires + "; path=/"
}

function getCookie(name: string) {
  const nameEQ = name + "="
  const ca = document.cookie.split(';')
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i]
    while (c.charAt(0) === ' ') c = c.substring(1, c.length)
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length)
  }
  return null
}

