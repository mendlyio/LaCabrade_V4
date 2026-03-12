import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Notre Magasin - La Cabrade",
  description: "Visitez notre magasin La Cabrade à Fléron, près de Liège. Horaires, plan d'accès et informations pratiques.",
}

export default function MagasinsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 py-12">
      <div className="content-container">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-2xl shadow-xl p-8 mb-12">
          <div className="max-w-3xl">
            <div className="inline-block bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full mb-4">
              <span className="text-sm font-semibold flex items-center gap-2">
                🏪 Notre Magasin
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Venez découvrir notre sellerie
            </h1>
            <p className="text-white/90 text-lg">
              Un magasin convivial au cœur de Fléron, près de Liège, avec des conseils d'experts.
            </p>
          </div>
        </div>

        {/* Magasin principal */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden mb-12">
          <div className="grid grid-cols-1 lg:grid-cols-2">
            {/* Infos */}
            <div className="p-8">
              <div className="inline-block bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-sm font-semibold mb-4">
                Magasin principal
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">La Cabrade - Fléron</h2>
              
              <div className="space-y-6">
                {/* Adresse */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <span className="text-xl">📍</span> Adresse
                  </h3>
                  <p className="text-gray-600 pl-7">
                    Rue de la Clef, 96<br />
                    B-4620 Fléron<br />
                    Belgique
                  </p>
                </div>

                {/* Horaires */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <span className="text-xl">🕐</span> Horaires d'ouverture
                  </h3>
                  <div className="text-gray-600 pl-7 space-y-1">
                    <p className="flex justify-between max-w-xs">
                      <span><strong>Lundi</strong></span>
                      <span className="text-red-600">Fermé</span>
                    </p>
                    <p className="flex justify-between max-w-xs">
                      <span><strong>Mardi</strong></span>
                      <span className="text-green-600">10h - 18h</span>
                    </p>
                    <p className="flex justify-between max-w-xs">
                      <span><strong>Mercredi</strong></span>
                      <span className="text-green-600">10h - 18h</span>
                    </p>
                    <p className="flex justify-between max-w-xs">
                      <span><strong>Jeudi</strong></span>
                      <span className="text-green-600">10h - 18h</span>
                    </p>
                    <p className="flex justify-between max-w-xs">
                      <span><strong>Vendredi</strong></span>
                      <span className="text-green-600">10h - 18h</span>
                    </p>
                    <p className="flex justify-between max-w-xs">
                      <span><strong>Samedi</strong></span>
                      <span className="text-green-600">10h - 17h</span>
                    </p>
                    <p className="flex justify-between max-w-xs">
                      <span><strong>Dimanche</strong></span>
                      <span className="text-red-600">Fermé</span>
                    </p>
                  </div>
                </div>

                {/* Contact */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <span className="text-xl">📞</span> Contact
                  </h3>
                  <div className="space-y-2 pl-7">
                    <a 
                      href="tel:+3243586099"
                      className="flex items-center gap-2 text-amber-600 hover:text-amber-700 font-semibold"
                    >
                      Téléphone : +32 (0)4/358.60.99
                    </a>
                    <a 
                      href="mailto:contact@sellerie-lacabrade.be"
                      className="flex items-center gap-2 text-amber-600 hover:text-amber-700 font-semibold"
                    >
                      Email : contact@sellerie-lacabrade.be
                    </a>
                  </div>
                </div>

                {/* Parking */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <span>🅿️</span> Parking
                  </h4>
                  <p className="text-sm text-gray-600">
                    Parking gratuit disponible devant le magasin et dans la rue adjacente.
                  </p>
                </div>
              </div>
            </div>

            {/* Map placeholder */}
            <div className="bg-pink-50 p-8 flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl mb-4">🗺️</div>
                <p className="text-gray-700 font-semibold mb-4">Plan d'accès</p>
                <a 
                  href="https://www.google.com/maps/search/?api=1&query=Rue+de+la+Clef+96+Fléron+Belgium"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                >
                  Ouvrir dans Google Maps →
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Avantages du magasin */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Pourquoi venir en magasin ?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">👋</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Conseils personnalisés</h3>
              <p className="text-gray-600 text-sm">
                Notre équipe d'experts vous conseille et vous aide à choisir le matériel adapté à vos besoins.
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">👕</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Essayage sur place</h3>
              <p className="text-gray-600 text-sm">
                Essayez les vêtements et testez le matériel avant d'acheter pour être sûr de votre choix.
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">📦</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Disponibilité immédiate</h3>
              <p className="text-gray-600 text-sm">
                Repartez avec vos achats immédiatement, sans attendre la livraison.
              </p>
            </div>
          </div>
        </div>

        {/* Services */}
        <div className="bg-pink-50 rounded-xl border border-amber-200 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Nos Services en Magasin</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <span className="text-green-600 text-xl">✓</span>
              <span className="text-gray-700">Conseil et essayage</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-green-600 text-xl">✓</span>
              <span className="text-gray-700">Paiement CB, cash, Bancontact</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-green-600 text-xl">✓</span>
              <span className="text-gray-700">Click & Collect</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-green-600 text-xl">✓</span>
              <span className="text-gray-700">Retrait gratuit en magasin</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-green-600 text-xl">✓</span>
              <span className="text-gray-700">Échanges et retours faciles</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-green-600 text-xl">✓</span>
              <span className="text-gray-700">Conseils techniques</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

