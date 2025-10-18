"use client"

import { usePathname } from "next/navigation"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

interface NavLinkProps {
  href: string
  children: React.ReactNode
  className?: string
  activeClassName?: string
}

export default function NavLink({ href, children, className = "", activeClassName = "" }: NavLinkProps) {
  const pathname = usePathname()
  
  // Extraire le segment de chemin après le code pays (ex: /fr/store -> /store)
  const pathSegments = pathname.split('/').filter(Boolean)
  const currentPath = pathSegments.length > 1 ? `/${pathSegments.slice(1).join('/')}` : '/'
  
  // Extraire le chemin cible sans le code pays
  const targetSegments = href.split('/').filter(Boolean)
  const targetPath = targetSegments.length > 0 ? `/${targetSegments.slice(1).join('/')}` : '/'
  
  // Pour /store, /nouveautes, /promotions, /marques : match exact du premier segment
  const currentFirstSegment = pathSegments[1] || ''
  const targetFirstSegment = targetSegments[1] || ''
  
  const isActive = currentFirstSegment === targetFirstSegment && targetFirstSegment !== ''
  
  return (
    <LocalizedClientLink
      href={href}
      className={`${className} ${isActive ? activeClassName : ''}`}
    >
      {children}
    </LocalizedClientLink>
  )
}

