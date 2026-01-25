import { Metadata } from "next"
import { listBrands } from "@lib/data/brands"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

export const metadata: Metadata = {
  title: "Nos Marques",
  description: "Découvrez toutes les marques disponibles dans notre sellerie",
}

export const dynamic = "force-dynamic"

export default async function MarquesPage() {
  const brands = await listBrands()

  return (
    <div className="content-container py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Nos Marques</h1>
        <p className="text-gray-600">Découvrez notre sélection de marques équestres de qualité</p>
      </div>

      <div className="bg-amber-600 rounded-xl p-8 mb-8">
        <h2 className="text-2xl font-bold mb-4">Des marques renommées</h2>
        <p className="text-gray-700 mb-6">
          Dans notre sellerie à Fléron, près de Liège, nous collaborons avec les meilleurs fournisseurs
          d&apos;équipements d&apos;équitation pour offrir qualité et innovation à chaque cavalier et monture.
        </p>
      </div>

      {brands.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-12">
          {brands.map((brand) => (
            <LocalizedClientLink
              key={brand.slug}
              href={`/marques/${brand.slug}`}
              className="bg-white border border-gray-200 rounded-lg p-6 text-center hover:shadow-lg hover:border-amber-300 transition-all duration-200 group"
            >
              <h3 className="font-semibold text-gray-900 group-hover:text-amber-600 transition-colors">
                {brand.name}
              </h3>
            </LocalizedClientLink>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <p className="text-gray-600 mb-4">Aucune marque disponible pour le moment.</p>
        </div>
      )}

      <div className="text-center py-8 bg-gray-50 rounded-xl">
        <h3 className="text-xl font-semibold mb-4">Et bien d&apos;autres...</h3>
        <p className="text-gray-600 mb-8">
          Visitez notre magasin à Fléron pour découvrir toutes nos marques disponibles.
        </p>
        <LocalizedClientLink
          href="/store"
          className="inline-block px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg transition-colors"
        >
          Découvrir nos produits →
        </LocalizedClientLink>
      </div>
    </div>
  )
}

