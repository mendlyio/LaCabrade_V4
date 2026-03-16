"use client"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { MagnifyingGlass } from "@medusajs/icons"
import { useTranslate } from "@lib/context/language-context"

export default function NavSearchLink() {
  const t = useTranslate()
  return (
    <LocalizedClientLink
      className="xl:hidden p-1.5 sm:p-2 rounded-lg hover:bg-gray-100 transition-colors"
      href="/search"
      scroll={false}
      data-testid="nav-search-link"
      aria-label={t("nav.search_aria" as any)}
    >
      <MagnifyingGlass className="w-5 h-5 text-gray-600" />
    </LocalizedClientLink>
  )
}
