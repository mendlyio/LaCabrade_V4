import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Outlet - Promotions",
  description: "Profitez de nos promotions sur une sélection de produits équestres",
}

export default async function PromotionsPage() {
  return (
    <div className="content-container py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 text-red-600">Outlet</h1>
        <p className="text-gray-600">Profitez de nos promotions sur une sélection de produits équestres</p>
      </div>

      <div className="bg-red-50 rounded-xl p-8 mb-8">
        <h2 className="text-2xl font-bold mb-4">Articles à prix réduits</h2>
        <p className="text-gray-700 mb-4">
          Retrouvez nos meilleures affaires sur une sélection de produits équestres de qualité.
        </p>
        <ul className="list-disc list-inside text-gray-600 space-y-2">
          <li>Jusqu&apos;à -50% sur une sélection d&apos;articles</li>
          <li>Vêtements de marque à petit prix</li>
          <li>Équipement pour le cheval et le cavalier</li>
          <li>Stock limité - Premiers arrivés, premiers servis</li>
        </ul>
      </div>

      <div className="text-center py-8">
        <p className="text-gray-600 mb-8">
          La liste complète des promotions sera bientôt disponible en ligne.
        </p>
        <a
          href="/store"
          className="inline-block px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
        >
          Voir tous nos produits →
        </a>
      </div>
    </div>
  )
}






