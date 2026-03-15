"use client"

import { SHOW_COOKIE_BANNER_EVENT } from "@modules/layout/components/cookie-banner"

function clearConsent() {
  document.cookie = "cookie_consent=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax"
  try { localStorage.removeItem("cookie_consent") } catch (e) {}
}

export default function ManageCookiesLink({
  className,
  children = "Gérer mes cookies",
}: {
  className?: string
  children?: React.ReactNode
}) {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    clearConsent()
    window.dispatchEvent(new CustomEvent(SHOW_COOKIE_BANNER_EVENT))
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`inline bg-transparent border-none cursor-pointer p-0 ${className || ""}`}
    >
      {children}
    </button>
  )
}
