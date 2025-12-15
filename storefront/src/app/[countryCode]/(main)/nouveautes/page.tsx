import { Metadata } from "next"
import PaginatedProductsModern from "@modules/store/templates/store-template-modern/paginated-products-modern"

export const metadata: Metadata = {
  title: "Nouveautés | La Cabrade",
  description: "Découvrez nos derniers produits équestres - Nouveautés et dernières arrivées",
}

type Props = {
  params: { countryCode: string }
  searchParams: Record<string, string | string[] | undefined>
}

export default async function NouveautesPage({ params, searchParams }: Props) {
  const { countryCode } = params

  // Forcer le tri par date de création décroissante pour afficher les nouveautés
  const searchParamsWithOrder = {
    ...searchParams,
    order: "-created_at"
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Hero Section */}
      <div className="bg-amber-600 text-white">
        <div className="content-container py-16">
          <div className="max-w-3xl">
            <div className="inline-block bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full mb-4">
              <span className="text-sm font-semibold">✨ Dernières Arrivées</span>
            </div>
            <h1 className="text-5xl font-bold mb-4">
              Nouveautés
            </h1>
            <p className="text-xl text-white/90 mb-6">
              Découvrez nos derniers produits équestres. Restez à la pointe avec notre sélection 
              des équipements les plus récents pour vous et votre cheval.
            </p>
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg">
                <span>📦</span>
                <span>Nouveaux produits ajoutés régulièrement</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg">
                <span>⚡</span>
                <span>Dernières tendances équestres</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-200">
        <div className="content-container py-4">
          <nav className="flex items-center gap-2 text-sm text-gray-600">
            <a href="/" className="hover:text-amber-600 transition-colors">Accueil</a>
            <span>/</span>
            <span className="text-gray-900 font-medium">Nouveautés</span>
          </nav>
        </div>
      </div>

      {/* Products Section */}
      <div className="content-container py-12">
        <PaginatedProductsModern
          searchParams={searchParamsWithOrder}
          countryCode={countryCode}
        />
      </div>

      {/* Trust Badges */}
      <div className="bg-white border-t border-gray-200 py-12 mt-12">
        <div className="content-container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">🚚</span>
              </div>
              <h3 className="font-semibold text-sm mb-1">Livraison Rapide</h3>
              <p className="text-xs text-gray-600">Expédition sous 24-48h</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">🔒</span>
              </div>
              <h3 className="font-semibold text-sm mb-1">Paiement Sécurisé</h3>
              <p className="text-xs text-gray-600">Transactions protégées</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">↩️</span>
              </div>
              <h3 className="font-semibold text-sm mb-1">Retours Faciles</h3>
              <p className="text-xs text-gray-600">14 jours pour changer d'avis</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">💬</span>
              </div>
              <h3 className="font-semibold text-sm mb-1">Support Client</h3>
              <p className="text-xs text-gray-600">À votre écoute 7j/7</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

