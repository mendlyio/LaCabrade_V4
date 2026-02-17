"use client"

import NavLink from "@modules/layout/components/nav-link"
import { useTranslate } from "@lib/context/language-context"

const linkClass = "px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:text-white hover:bg-amber-600 transition-all duration-200"
const activeClass = "bg-amber-600 text-white shadow-sm"

type NavLinksProps = {
  variant?: "nouveautes" | "bon_cadeau" | "a_propos"
}

const NavLinks = ({ variant }: NavLinksProps) => {
  const t = useTranslate()

  if (variant === "nouveautes") {
    return (
      <NavLink href="/nouveautes" className={linkClass} activeClassName={activeClass}>
        {t("nav.nouveautes")}
      </NavLink>
    )
  }
  if (variant === "bon_cadeau") {
    return (
      <NavLink href="/bon-cadeau" className={linkClass} activeClassName={activeClass}>
        {t("nav.bon_cadeau")}
      </NavLink>
    )
  }
  if (variant === "a_propos") {
    return (
      <NavLink href="/a-propos" className={linkClass} activeClassName={activeClass}>
        {t("nav.a_propos")}
      </NavLink>
    )
  }

  return null
}

export default NavLinks
