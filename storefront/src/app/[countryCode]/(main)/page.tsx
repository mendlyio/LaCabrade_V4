import { Metadata } from "next"
import { getRegion } from "@lib/data/regions"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

export const metadata: Metadata = {
  title: "La Cabrade - Sellerie Équestre | LC•EQUESTRIAN",
  description:
    "Vivez l'équitation comme vous l'aimez, sans compromis. Des prix justes, du matériel fiable, et toute l'émotion d'une sellerie pensée pour les passionnés.",
}

export default async function Home({
  params: { countryCode },
}: {
  params: { countryCode: string }
}) {
  const region = await getRegion(countryCode)
  
  if (!region) {
    console.error("❌ Aucune région trouvée pour:", countryCode)
    return null
  }

  return (
    <div className="w-full">
      <section className="relative bg-gradient-to-br from-amber-50 via-white to-orange-50 py-20">
        <div className="content-container">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              <span className="bg-gradient-to-r from-amber-700 via-amber-600 to-orange-600 bg-clip-text text-transparent">
                La Cabrade
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-700 mb-4 font-light">
              Votre sellerie équestre à Fléron
            </p>
            <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
              Vivez l équitation comme vous l aimez, sans compromis.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <LocalizedClientLink
                href="/store"
                className="px-8 py-4 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-lg hover:from-amber-700 hover:to-orange-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                Découvrir la boutique
              </LocalizedClientLink>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="content-container">
          <div className="text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Site en cours de finalisation
            </h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto mb-8">
              Nous travaillons activement sur le nouveau design. Merci de votre patience.
            </p>
            <LocalizedClientLink
              href="/store"
              className="inline-flex items-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg transition-all duration-300"
            >
              Voir tous nos produits
            </LocalizedClientLink>
          </div>
        </div>
      </section>
    </div>
  )
}
