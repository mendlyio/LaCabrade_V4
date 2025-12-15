import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Qui sommes-nous - La Cabrade",
  description: "Découvrez l'histoire de La Cabrade, votre sellerie équestre à Fléron près de Liège. Passion, expertise et service depuis des années.",
}

export default function QuiSommesNousPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 py-12">
      <div className="content-container">
        {/* Hero Section */}
        <div className="bg-amber-600 text-white rounded-2xl shadow-xl p-8 mb-12">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              La Cabrade
            </h1>
            <p className="text-2xl text-white/90 mb-2">LC•EQUESTRIAN</p>
            <p className="text-white/90 text-lg">
              Votre sellerie équestre de confiance à Fléron, près de Liège
            </p>
          </div>
        </div>

        {/* Notre histoire */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-8 mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">Notre Histoire</h2>
          <div className="prose max-w-none text-gray-600 leading-relaxed">
            <p className="text-lg mb-4">
              <strong className="text-amber-600">La Cabrade</strong> est née de la passion d'une cavalière pour le monde équestre. Située au cœur de Fléron, près de Liège, notre sellerie s'est donnée pour mission de proposer du <strong>matériel fiable à des prix justes</strong> pour tous les passionnés d'équitation.
            </p>
            <p className="text-lg mb-4">
              Que vous soyez cavalier débutant ou confirmé, amateur de dressage, de CSO ou simplement de balades, nous avons à cœur de vous accompagner dans votre pratique équestre avec des produits de qualité et des conseils d'experts.
            </p>
            <p className="text-lg">
              Notre devise : <em className="text-amber-600 font-semibold">"Créée par une cavalière pour des cavaliers"</em>
            </p>
          </div>
        </div>

        {/* Nos valeurs */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Nos Valeurs</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-amber-600 rounded-full flex items-center justify-center mb-4 mx-auto">
                <span className="text-3xl">🏇</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3 text-center">Passion</h3>
              <p className="text-gray-600 text-center">
                L'équitation est notre passion. Nous vivons et respirons le monde équestre au quotidien.
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center mb-4 mx-auto">
                <span className="text-3xl">✓</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3 text-center">Qualité</h3>
              <p className="text-gray-600 text-center">
                Nous sélectionnons rigoureusement nos produits pour vous garantir matériel fiable et durable.
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-gradient-to-br from-green-100 to-green-200 rounded-full flex items-center justify-center mb-4 mx-auto">
                <span className="text-3xl">💬</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3 text-center">Conseil</h3>
              <p className="text-gray-600 text-center">
                Notre équipe d'experts est là pour vous conseiller et vous aider à trouver le matériel adapté.
              </p>
            </div>
          </div>
        </div>

        {/* Notre engagement */}
        <div className="bg-pink-50 rounded-xl border border-amber-200 p-8 mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Notre Engagement</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-start gap-3">
              <span className="text-amber-600 text-xl flex-shrink-0">✓</span>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Prix justes</h3>
                <p className="text-gray-600 text-sm">
                  Des tarifs transparents et compétitifs pour rendre l'équitation accessible à tous.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-amber-600 text-xl flex-shrink-0">✓</span>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Service personnalisé</h3>
                <p className="text-gray-600 text-sm">
                  Un accueil chaleureux et des conseils adaptés à vos besoins spécifiques.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-amber-600 text-xl flex-shrink-0">✓</span>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Large choix</h3>
                <p className="text-gray-600 text-sm">
                  Des centaines de références en stock pour toutes les disciplines équestres.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-amber-600 text-xl flex-shrink-0">✓</span>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Proximité</h3>
                <p className="text-gray-600 text-sm">
                  Un magasin physique où vous pouvez voir, toucher et essayer nos produits.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Localisation */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Venez nous rencontrer</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span>📍</span> Adresse
              </h3>
              <p className="text-gray-600 mb-6">
                <strong>La Cabrade - LC•EQUESTRIAN</strong><br />
                Rue de la Clef, 96<br />
                B-4620 Fléron<br />
                Belgique
              </p>
              
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span>🕐</span> Horaires
              </h3>
              <div className="text-gray-600 space-y-1">
                <p><strong>Lundi :</strong> Fermé</p>
                <p><strong>Mardi - Vendredi :</strong> 10h - 18h</p>
                <p><strong>Samedi :</strong> 10h - 17h</p>
                <p><strong>Dimanche :</strong> Fermé</p>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span>📞</span> Contact
              </h3>
              <div className="space-y-3">
                <a 
                  href="tel:+3243586099"
                  className="flex items-center gap-3 text-amber-600 hover:text-amber-700 font-semibold"
                >
                  <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                    📞
                  </div>
                  +32 (0)4/358.60.99
                </a>
                <a 
                  href="mailto:contact@lacabrade.com"
                  className="flex items-center gap-3 text-amber-600 hover:text-amber-700 font-semibold"
                >
                  <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                    ✉️
                  </div>
                  contact@lacabrade.com
                </a>
              </div>

              <div className="mt-6 bg-pink-50 rounded-lg p-4 border border-amber-200">
                <p className="text-sm text-gray-700">
                  <strong>💡 Astuce :</strong> Appelez-nous avant de venir pour vous assurer de la disponibilité d'un produit spécifique.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

