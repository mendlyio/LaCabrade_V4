"use client"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { User } from "@medusajs/icons"
import { useTranslate } from "@lib/context/language-context"

export default function NavAccountLink() {
  const t = useTranslate()
  return (
    <LocalizedClientLink
      href="/account"
      className="flex p-1.5 sm:p-2 rounded-lg hover:bg-gray-100 transition-colors group"
      data-testid="nav-account-link"
      aria-label={t("nav.account_aria" as any)}
    >
      <User className="w-5 h-5 text-gray-600 group-hover:text-amber-600 transition-colors" />
    </LocalizedClientLink>
  )
}
