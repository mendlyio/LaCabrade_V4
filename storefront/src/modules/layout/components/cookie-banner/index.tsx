"use client"

import { useState, useEffect } from "react"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { useTranslate } from "@lib/context/language-context"

export const SHOW_COOKIE_BANNER_EVENT = "show-cookie-banner"

export default function CookieBanner() {
  const t = useTranslate()
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    const consent = getConsentValue()
    if (!consent) {
      setShowBanner(true)
    } else if (consent === "true") {
      updateConsent(true)
    }
  }, [])

  useEffect(() => {
    const handleShowBanner = () => {
      setShowBanner(true)
    }
    window.addEventListener(SHOW_COOKIE_BANNER_EVENT, handleShowBanner)
    return () => window.removeEventListener(SHOW_COOKIE_BANNER_EVENT, handleShowBanner)
  }, [])

  const acceptCookies = () => {
    saveConsent("true")
    updateConsent(true)
    setShowBanner(false)
  }

  const declineCookies = () => {
    saveConsent("false")
    updateConsent(false)
    setShowBanner(false)
  }

  if (!showBanner) return null

  return (
    <div className="fixed bottom-0 left-0 w-full bg-black/95 text-white border-t border-gray-800 z-[9999] p-4 md:p-6 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] animate-slide-up">
      <div className="content-container mx-auto flex flex-col md:flex-row items-center justify-between gap-6 max-w-7xl">
        <div className="flex-1 text-center md:text-left">
          <h3 className="text-lg font-bold mb-2 text-white">
            {t("cookie.title" as any)}
          </h3>
          <p className="text-sm text-gray-300 leading-relaxed">
            {t("cookie.description" as any)}
            <br className="hidden md:block" />
            <LocalizedClientLink href="/protection-donnees" className="text-amber-500 hover:text-amber-400 underline mt-1 inline-block">
              {t("cookie.privacy_link" as any)}
            </LocalizedClientLink>
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto min-w-fit">
          <button
            onClick={declineCookies}
            className="px-6 py-3 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white transition-all text-sm font-medium w-full sm:w-auto"
          >
            {t("cookie.decline" as any)}
          </button>
          <button
            onClick={acceptCookies}
            className="px-6 py-3 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-lg transform hover:scale-105 transition-all text-sm w-full sm:w-auto"
          >
            {t("cookie.accept" as any)}
          </button>
        </div>
      </div>
    </div>
  )
}

// Persistance : cookie (lisible côté serveur) + localStorage (restauration immédiate en beforeInteractive)
function saveConsent(value: string) {
  const date = new Date()
  date.setTime(date.getTime() + 365 * 24 * 60 * 60 * 1000)
  document.cookie = `cookie_consent=${value}; expires=${date.toUTCString()}; path=/; SameSite=Lax`
  try { localStorage.setItem("cookie_consent", value) } catch (e) {}
}

function getConsentValue(): string | null {
  try {
    const ls = localStorage.getItem("cookie_consent")
    if (ls) return ls
  } catch (e) {}
  const nameEQ = "cookie_consent="
  for (const part of document.cookie.split(";")) {
    const c = part.trim()
    if (c.startsWith(nameEQ)) return c.substring(nameEQ.length)
  }
  return null
}

// Mise à jour Google Consent Mode v2 (tous les signaux) + Meta Pixel
function updateConsent(granted: boolean) {
  if (typeof window === "undefined") return
  const status = granted ? "granted" : "denied"

  if ((window as any).gtag) {
    ;(window as any).gtag("consent", "update", {
      ad_storage: status,
      analytics_storage: status,
      ad_user_data: status,
      ad_personalization: status,
      functionality_storage: "granted",
      security_storage: "granted",
    })
  }

  if ((window as any).fbq) {
    ;(window as any).fbq("consent", granted ? "grant" : "revoke")
  }
}

