import { Heading } from "@medusajs/ui"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import React from "react"

const Help = () => {
  return (
    <div>
      <Heading className="text-lg font-bold text-gray-900 mb-3">Besoin d&apos;aide ?</Heading>
      <div className="space-y-2">
        <LocalizedClientLink
          href="/contact"
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-amber-600 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          Nous contacter
        </LocalizedClientLink>
        <LocalizedClientLink
          href="/politique-de-retour"
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-amber-600 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
          Retours et échanges
        </LocalizedClientLink>
      </div>
    </div>
  )
}

export default Help
