"use client"

import NavLink from "@modules/layout/components/nav-link"
import { useTranslate } from "@lib/context/language-context"

const NavLinks = () => {
  const t = useTranslate()

  return (
    <>
      <NavLink
        href="/nouveautes"
        className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:text-white hover:bg-amber-600 transition-all duration-200"
        activeClassName="bg-amber-600 text-white shadow-sm"
      >
        {t("nav.nouveautes")}
      </NavLink>

      <NavLink
        href="/bon-cadeau"
        className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:text-white hover:bg-amber-600 transition-all duration-200"
        activeClassName="bg-amber-600 text-white shadow-sm"
      >
        {t("nav.bon_cadeau")}
      </NavLink>

      <NavLink
        href="/a-propos"
        className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:text-white hover:bg-amber-600 transition-all duration-200"
        activeClassName="bg-amber-600 text-white shadow-sm"
      >
        {t("nav.a_propos")}
      </NavLink>
    </>
  )
}

export default NavLinks
