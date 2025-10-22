import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Livraison - La Cabrade",
  description: "Informations sur nos modes de livraison, délais et tarifs. Livraison gratuite dès 100€ en Belgique.",
}

export default function LivraisonPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 py-12">
      <div className="content-container">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-2xl shadow-xl p-8 mb-12">
          <div className="max-w-3xl">
            <div className="inline-block bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full mb-4">
              <span className="text-sm font-semibold flex items-center gap-2">
                🚚 Livraison
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Informations de livraison
            </h1>
            <p className="text-white/90 text-lg">
              Livraison rapide et gratuite dès 100€ en Belgique. Découvrez tous nos modes de livraison.
            </p>
          </div>
        </div>

        {/* Livraison gratuite */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-8 mb-12">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center text-white text-2xl">
              ✓
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Livraison GRATUITE</h2>
              <p className="text-green-700 font-semibold">À partir de 100€ d'achat en Belgique</p>
            </div>
          </div>
        </div>

        {/* Options de livraison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {/* Belgique */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-4xl">🇧🇪</span>
              <h3 className="text-xl font-bold text-gray-900">Belgique</h3>
            </div>
            <div className="space-y-4">
              <div className="border-l-4 border-amber-500 pl-4">
                <h4 className="font-semibold text-gray-900 mb-1">Standard (3-5 jours)</h4>
                <p className="text-gray-600 text-sm">GRATUIT dès 100€, sinon 7,50€</p>
              </div>
              <div className="border-l-4 border-orange-500 pl-4">
                <h4 className="font-semibold text-gray-900 mb-1">Express (24-48h)</h4>
                <p className="text-gray-600 text-sm">12,50€</p>
              </div>
              <div className="border-l-4 border-blue-500 pl-4">
                <h4 className="font-semibold text-gray-900 mb-1">Point relais</h4>
                <p className="text-gray-600 text-sm">GRATUIT dès 75€, sinon 5,00€</p>
              </div>
            </div>
          </div>

          {/* Europe */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-4xl">🇪🇺</span>
              <h3 className="text-xl font-bold text-gray-900">Europe</h3>
            </div>
            <div className="space-y-4">
              <div className="border-l-4 border-amber-500 pl-4">
                <h4 className="font-semibold text-gray-900 mb-1">France (5-7 jours)</h4>
                <p className="text-gray-600 text-sm">GRATUIT dès 150€, sinon 12,50€</p>
              </div>
              <div className="border-l-4 border-orange-500 pl-4">
                <h4 className="font-semibold text-gray-900 mb-1">Zone 1 (7-10 jours)</h4>
                <p className="text-gray-600 text-sm">15,00€ (Pays-Bas, Luxembourg, Allemagne)</p>
              </div>
              <div className="border-l-4 border-blue-500 pl-4">
                <h4 className="font-semibold text-gray-900 mb-1">Zone 2 (10-14 jours)</h4>
                <p className="text-gray-600 text-sm">25,00€ (Reste de l'Europe)</p>
              </div>
            </div>
          </div>
        </div>

        {/* Process de livraison */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-8 mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">
            Comment ça marche ?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
                1️⃣
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Commande</h3>
              <p className="text-sm text-gray-600">Validez votre commande avant 12h</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
                2️⃣
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Préparation</h3>
              <p className="text-sm text-gray-600">Nous préparons votre colis avec soin</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
                3️⃣
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Expédition</h3>
              <p className="text-sm text-gray-600">Envoi le jour même ou le lendemain</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
                4️⃣
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Réception</h3>
              <p className="text-sm text-gray-600">Suivez votre colis en temps réel</p>
            </div>
          </div>
        </div>

        {/* Informations importantes */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span>ℹ️</span> Informations importantes
          </h3>
          <ul className="space-y-3 text-gray-600">
            <li className="flex items-start gap-2">
              <span className="text-amber-600 flex-shrink-0">•</span>
              <span>Les commandes passées avant 12h sont expédiées le jour même (jours ouvrés)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-600 flex-shrink-0">•</span>
              <span>Vous recevrez un email de confirmation avec le numéro de suivi dès l'expédition</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-600 flex-shrink-0">•</span>
              <span>Les délais sont donnés à titre indicatif et peuvent varier selon la destination</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-600 flex-shrink-0">•</span>
              <span>Les articles volumineux peuvent nécessiter un supplément de livraison</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-600 flex-shrink-0">•</span>
              <span>En cas de problème avec votre livraison, contactez-nous au +32 (0)4/358.60.99</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}

