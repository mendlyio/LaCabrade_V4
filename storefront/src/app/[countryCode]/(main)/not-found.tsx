import { Metadata } from "next"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

export const metadata: Metadata = {
  title: "Page introuvable | La Cabrade",
  description: "La page demandée n'existe pas.",
  robots: { index: false, follow: true },
}

export default function NotFound() {
  return (
    <div className="min-h-[70vh] bg-gradient-to-b from-gray-50 to-white flex items-center justify-center px-4">
      <div className="max-w-lg w-full text-center">
        <div className="mb-8">
          <span className="text-8xl sm:text-9xl font-bold text-amber-600/20">404</span>
        </div>

        <div className="relative -mt-12 mb-8">
          <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-amber-100">
            <svg className="w-10 h-10 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">
            Oups, cette page n&apos;existe pas
          </h1>
          <p className="text-gray-500 leading-relaxed mb-8">
            La page que vous cherchez a peut-être été déplacée, supprimée, ou n&apos;a jamais existé.
            Pas de panique, votre prochaine trouvaille équestre vous attend !
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <LocalizedClientLink
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg transition-colors shadow-md hover:shadow-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Retour à l&apos;accueil
          </LocalizedClientLink>
          <LocalizedClientLink
            href="/store"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white hover:bg-gray-50 text-gray-700 font-medium rounded-lg transition-colors border border-gray-200 hover:border-gray-300"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            Voir la boutique
          </LocalizedClientLink>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-100">
          <p className="text-sm text-gray-400">
            Besoin d&apos;aide ?{" "}
            <LocalizedClientLink href="/contact" className="text-amber-600 hover:text-amber-700 font-medium transition-colors">
              Contactez-nous
            </LocalizedClientLink>
          </p>
        </div>
      </div>
    </div>
  )
}
